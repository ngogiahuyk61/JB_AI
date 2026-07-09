using System.Text.Json;
using JapaneseAI.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace JapaneseAI.Infrastructure.Data.Importers
{
    /// <summary>
    /// Seeds Vocabulary from data/vocabulary/all_vocabulary.json (PostgreSQL/cloud deploy).
    /// </summary>
    public static class VocabularyJsonImporter
    {
        private const int BatchSize = 500;

        public static async Task<int> ImportAsync(AppDbContext context, string filePath, ILogger logger, CancellationToken ct = default)
        {
            if (!File.Exists(filePath))
            {
                logger.LogWarning("Vocabulary JSON not found: {Path}", filePath);
                return 0;
            }

            var hasExisting = await context.Vocabulary.AnyAsync(ct);
            if (hasExisting)
            {
                logger.LogInformation("Vocabulary table already has data — performing merge/upsert from JSON.");
            }

            logger.LogInformation("Importing vocabulary from {Path}...", filePath);
            var json = await File.ReadAllTextAsync(filePath, ct);
            var rows = JsonSerializer.Deserialize<List<VocabJsonRow>>(json, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            }) ?? new List<VocabJsonRow>();

            var imported = 0;

            for (var i = 0; i < rows.Count; i += BatchSize)
            {
                var batchRows = rows.Skip(i).Take(BatchSize).ToList();

                // Build lookup keys for existing rows
                var kanjiKeys = batchRows.Where(r => !string.IsNullOrWhiteSpace(r.Kanji)).Select(r => r.Kanji!.Trim()).Distinct().ToList();
                var kanaKeys = batchRows.Where(r => string.IsNullOrWhiteSpace(r.Kanji) && !string.IsNullOrWhiteSpace(r.Kana)).Select(r => r.Kana!.Trim()).Distinct().ToList();

                var existing = await context.Vocabulary
                    .Where(v => (v.Kanji != null && kanjiKeys.Contains(v.Kanji)) || (v.Kana != null && kanaKeys.Contains(v.Kana)))
                    .ToListAsync(ct);

                var existingByKanji = existing
                    .Where(e => !string.IsNullOrEmpty(e.Kanji))
                    .GroupBy(e => e.Kanji!, StringComparer.Ordinal)
                    .ToDictionary(g => g.Key, g => g.First(), StringComparer.Ordinal);

                var existingByKana = existing
                    .Where(e => !string.IsNullOrEmpty(e.Kana))
                    .GroupBy(e => e.Kana!, StringComparer.Ordinal)
                    .ToDictionary(g => g.Key, g => g.First(), StringComparer.Ordinal);

                var toAdd = new List<Vocabulary>();
                var updatedCount = 0;

                foreach (var r in batchRows)
                {
                    var kanji = r.Kanji?.Trim() ?? "";
                    var kana = r.Kana?.Trim() ?? "";

                    Vocabulary? found = null;
                    if (!string.IsNullOrEmpty(kanji) && existingByKanji.TryGetValue(kanji, out var byK)) found = byK;
                    else if (!string.IsNullOrEmpty(kana) && existingByKana.TryGetValue(kana, out var byKa)) found = byKa;

                    if (found != null)
                    {
                        // Merge/Update fields from JSON into existing row
                        if (!string.IsNullOrWhiteSpace(r.Tags))
                        {
                            // Merge CSV tags: keep existing tags and add any new ones
                            var existingTags = (found.Tags ?? string.Empty).Split(',', StringSplitOptions.RemoveEmptyEntries).Select(t => t.Trim().ToLowerInvariant()).Where(t => t.Length>0).ToList();
                            var incomingTags = r.Tags.Split(',', StringSplitOptions.RemoveEmptyEntries).Select(t => t.Trim().ToLowerInvariant()).Where(t => t.Length>0).ToList();
                            var merged = existingTags.Union(incomingTags).Distinct().ToList();
                            found.Tags = string.Join(',', merged);
                        }

                        if (!string.IsNullOrWhiteSpace(r.HanViet)) found.HanViet = r.HanViet;
                        if (!string.IsNullOrWhiteSpace(r.Vietnamese)) found.Vietnamese = r.Vietnamese;
                        if (!string.IsNullOrWhiteSpace(r.JlptLevel)) found.JlptLevel = r.JlptLevel;
                        if (!string.IsNullOrWhiteSpace(r.PartOfSpeech)) found.PartOfSpeech = r.PartOfSpeech.Length > 50 ? r.PartOfSpeech[..50] : r.PartOfSpeech;
                        if (r.SortOrder.HasValue) found.SortOrder = r.SortOrder.Value;

                        // Update example fields if incoming has content (overwrite if different)
                        if (!string.IsNullOrWhiteSpace(r.ExampleSentence)) found.ExampleSentence = r.ExampleSentence;
                        if (!string.IsNullOrWhiteSpace(r.ExampleTranslation)) found.ExampleTranslation = r.ExampleTranslation;
                        if (!string.IsNullOrWhiteSpace(r.ExampleRomaji)) found.ExampleRomaji = r.ExampleRomaji;

                        updatedCount++;
                    }
                    else
                    {
                        // New row
                        toAdd.Add(new Vocabulary
                        {
                            Kanji = kanji,
                            Kana = kana,
                            HanViet = r.HanViet,
                            Vietnamese = r.Vietnamese ?? string.Empty,
                            JlptLevel = r.JlptLevel ?? "N5",
                            PartOfSpeech = r.PartOfSpeech != null && r.PartOfSpeech.Length > 50 ? r.PartOfSpeech[..50] : r.PartOfSpeech,
                            Tags = r.Tags,
                            SortOrder = r.SortOrder ?? 0,
                            ExampleSentence = r.ExampleSentence,
                            ExampleTranslation = r.ExampleTranslation,
                            ExampleRomaji = r.ExampleRomaji,
                        });
                    }
                }

                if (toAdd.Count > 0)
                {
                    context.Vocabulary.AddRange(toAdd);
                }

                await context.SaveChangesAsync(ct);

                imported += toAdd.Count + updatedCount;
                logger.LogInformation("  + Added: {Added}, Updated: {Updated} ({Total}/{All})", toAdd.Count, updatedCount, imported, rows.Count);
            }

            return imported;
        }

        private class VocabJsonRow
        {
            public string? Kanji { get; set; }
            public string? Kana { get; set; }
            public string? HanViet { get; set; }
            public string? Vietnamese { get; set; }
            public string? JlptLevel { get; set; }
            public string? PartOfSpeech { get; set; }
            public string? Tags { get; set; }
            public int? SortOrder { get; set; }
            public string? ExampleSentence { get; set; }
            public string? ExampleTranslation { get; set; }
            public string? ExampleRomaji { get; set; }
        }
    }
}
