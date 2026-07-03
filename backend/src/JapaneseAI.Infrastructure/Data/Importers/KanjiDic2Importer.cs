using System.Xml;
using JapaneseAI.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace JapaneseAI.Infrastructure.Data.Importers
{
    /// <summary>
    /// Imports KANJIDIC2 XML (http://www.edrdg.org/kanjidic/kanjidic2) into KanjiDictionaries table.
    /// Uses streaming XmlReader for large files (~30MB+).
    /// </summary>
    public static class KanjiDic2Importer
    {
        private const int BatchSize = 500;

        public static async Task<int> ImportAsync(AppDbContext context, string filePath, ILogger logger, CancellationToken ct = default)
        {
            if (!File.Exists(filePath))
            {
                logger.LogWarning("KANJIDIC2 file not found: {Path}", filePath);
                return 0;
            }

            logger.LogInformation("Importing KANJIDIC2 from {Path}...", filePath);
            var imported = 0;
            var batch = new List<KanjiDictionary>(BatchSize);

            using var stream = File.OpenRead(filePath);
            using var reader = XmlReader.Create(stream, new XmlReaderSettings { Async = true, IgnoreComments = true });

            while (await reader.ReadAsync())
            {
                ct.ThrowIfCancellationRequested();
                if (reader.NodeType != XmlNodeType.Element || reader.Name != "character")
                    continue;

                var entry = await ParseCharacterAsync(reader);
                if (entry == null) continue;

                batch.Add(entry);
                if (batch.Count >= BatchSize)
                {
                    imported += await SaveBatchAsync(context, batch, logger, ct);
                    batch.Clear();
                }
            }

            if (batch.Count > 0)
                imported += await SaveBatchAsync(context, batch, logger, ct);

            logger.LogInformation("KANJIDIC2 import complete: {Count} kanji processed.", imported);
            return imported;
        }

        private static async Task<int> SaveBatchAsync(AppDbContext context, List<KanjiDictionary> batch, ILogger logger, CancellationToken ct)
        {
            var chars = batch.Select(b => b.Character).ToList();
            var existing = (await context.KanjiDictionaries
                .Where(k => chars.Contains(k.Character))
                .Select(k => k.Character)
                .ToListAsync(ct)).ToHashSet();

            var toAdd = batch.Where(b => !existing.Contains(b.Character)).ToList();
            if (toAdd.Count == 0) return 0;

            context.KanjiDictionaries.AddRange(toAdd);
            await context.SaveChangesAsync(ct);
            logger.LogInformation("  + {Count} new kanji saved", toAdd.Count);
            return toAdd.Count;
        }

        private static async Task<KanjiDictionary?> ParseCharacterAsync(XmlReader reader)
        {
            if (reader.IsEmptyElement) return null;

            string? literal = null;
            int? strokeCount = null;
            string? jlptLevel = null;
            var onReadings = new List<string>();
            var kunReadings = new List<string>();
            var meanings = new List<string>();
            string? radical = null;

            var depth = reader.Depth;
            while (await reader.ReadAsync() && reader.Depth > depth)
            {
                if (reader.NodeType != XmlNodeType.Element) continue;

                switch (reader.Name)
                {
                    case "literal":
                        literal = await reader.ReadElementContentAsStringAsync();
                        break;

                    case "stroke_count":
                        if (int.TryParse(await reader.ReadElementContentAsStringAsync(), out var sc))
                            strokeCount = sc;
                        break;

                    case "jlpt":
                        jlptLevel = MapJlpt(await reader.ReadElementContentAsStringAsync());
                        break;

                    case "reading":
                        var rType = reader.GetAttribute("r_type");
                        var reading = await reader.ReadElementContentAsStringAsync();
                        if (rType == "ja_on") onReadings.Add(reading);
                        else if (rType == "ja_kun") kunReadings.Add(NormalizeKun(reading));
                        break;

                    case "meaning":
                        var lang = reader.GetAttribute("m_lang") ?? "en";
                        var meaning = await reader.ReadElementContentAsStringAsync();
                        if (lang is "en" or "vi")
                            meanings.Add(meaning);
                        break;

                    case "rad_name":
                        if (reader.GetAttribute("rad_type") == "classical")
                            radical = await reader.ReadElementContentAsStringAsync();
                        break;
                }
            }

            if (string.IsNullOrEmpty(literal) || literal.Length != 1) return null;
            if (!IsCjkKanji(literal[0])) return null;

            return new KanjiDictionary
            {
                Character = literal,
                Onyomi = onReadings.Count > 0 ? string.Join("・", onReadings.Distinct()) : null,
                Kunyomi = kunReadings.Count > 0 ? string.Join("・", kunReadings.Distinct()) : null,
                Meaning = meanings.Count > 0 ? string.Join(", ", meanings.Take(5)) : null,
                StrokeCount = strokeCount,
                Radical = radical,
                JlptLevel = jlptLevel,
            };
        }

        private static string NormalizeKun(string kun) => kun.Replace(".", "・");

        private static string? MapJlpt(string? num) => num switch
        {
            "1" => "N1",
            "2" => "N2",
            "3" => "N3",
            "4" => "N4",
            "5" => "N5",
            _ => null
        };

        private static bool IsCjkKanji(char c) => c >= 0x4E00 && c <= 0x9FAF;
    }
}
