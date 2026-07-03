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

            if (await context.Vocabulary.AnyAsync(ct))
            {
                logger.LogInformation("Vocabulary table already has data, skipping JSON import.");
                return 0;
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
                var batch = rows.Skip(i).Take(BatchSize).Select(r => new Vocabulary
                {
                    Kanji = r.Kanji ?? "",
                    Kana = r.Kana ?? "",
                    HanViet = r.HanViet,
                    Vietnamese = r.Vietnamese ?? "",
                    JlptLevel = r.JlptLevel ?? "N5",
                    PartOfSpeech = r.PartOfSpeech,
                    SortOrder = r.SortOrder,
                }).ToList();

                context.Vocabulary.AddRange(batch);
                await context.SaveChangesAsync(ct);
                imported += batch.Count;
                logger.LogInformation("  + {Count} vocabulary rows ({Total}/{All})", batch.Count, imported, rows.Count);
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
            public int? SortOrder { get; set; }
        }
    }
}
