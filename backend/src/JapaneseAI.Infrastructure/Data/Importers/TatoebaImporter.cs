using JapaneseAI.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace JapaneseAI.Infrastructure.Data.Importers
{
    /// <summary>
    /// Imports example sentences from a curated TSV file.
    /// Format: vocab_key \t japanese_sentence \t translation \t romaji (optional)
    /// vocab_key matches Vocabulary.Kanji or Vocabulary.Kana (exact match).
    /// </summary>
    public static class TatoebaImporter
    {
        public static async Task<int> ImportAsync(AppDbContext context, string filePath, ILogger logger, CancellationToken ct = default)
        {
            if (!File.Exists(filePath))
            {
                logger.LogWarning("Tatoeba examples file not found: {Path}", filePath);
                return 0;
            }

            logger.LogInformation("Importing example sentences from {Path}...", filePath);
            var lines = await File.ReadAllLinesAsync(filePath, ct);
            var updated = 0;

            foreach (var rawLine in lines)
            {
                ct.ThrowIfCancellationRequested();
                var line = rawLine.Trim();
                if (string.IsNullOrEmpty(line) || line.StartsWith('#')) continue;

                var parts = line.Split('\t');
                if (parts.Length < 3) continue;

                var vocabKey = parts[0].Trim();
                var sentence = parts[1].Trim();
                var translation = parts[2].Trim();
                var romaji = parts.Length > 3 ? parts[3].Trim() : null;

                if (string.IsNullOrEmpty(vocabKey) || string.IsNullOrEmpty(sentence)) continue;

                var vocab = await context.Vocabulary
                    .FirstOrDefaultAsync(v => v.Kanji == vocabKey || v.Kana == vocabKey, ct);

                if (vocab == null) continue;

                // Only fill if not already set (don't overwrite manual entries)
                if (!string.IsNullOrEmpty(vocab.ExampleSentence)) continue;

                vocab.ExampleSentence = sentence;
                vocab.ExampleTranslation = translation;
                vocab.ExampleRomaji = romaji;
                updated++;
            }

            if (updated > 0)
                await context.SaveChangesAsync(ct);

            logger.LogInformation("Tatoeba import complete: {Count} vocabulary entries updated.", updated);
            return updated;
        }
    }
}
