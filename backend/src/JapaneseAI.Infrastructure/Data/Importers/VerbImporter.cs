using System.Text.Json;
using JapaneseAI.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace JapaneseAI.Infrastructure.Data.Importers;

public class VerbImporter
{
    private readonly AppDbContext _context;
    private readonly ILogger<VerbImporter> _logger;

    public VerbImporter(AppDbContext context, ILogger<VerbImporter> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task ImportFromJsonAsync(string jsonFilePath)
    {
        if (!File.Exists(jsonFilePath))
        {
            _logger.LogWarning("Verb JSON file not found at {Path}", jsonFilePath);
            return;
        }

        try
        {
            var jsonString = await File.ReadAllTextAsync(jsonFilePath);
            var verbs = JsonSerializer.Deserialize<List<Verb>>(jsonString, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });

            if (verbs == null || !verbs.Any())
            {
                _logger.LogWarning("No verbs parsed from JSON");
                return;
            }

            var existingCount = await _context.Verbs.CountAsync();
            if (existingCount > 0)
            {
                _logger.LogInformation("Verbs table already contains data. Clearing and re-importing...");
                _context.Verbs.RemoveRange(_context.Verbs);
                await _context.SaveChangesAsync();
            }

            // Reset sequence if needed for PostgreSQL
            try
            {
                await _context.Database.ExecuteSqlRawAsync("ALTER SEQUENCE \"Verbs_Id_seq\" RESTART WITH 1");
            }
            catch { /* Ignore if sequence doesn't exist or not supported */ }

            await _context.Verbs.AddRangeAsync(verbs);
            var saved = await _context.SaveChangesAsync();

            _logger.LogInformation("Imported {Count} verbs successfully.", saved);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error importing verbs from JSON");
        }
    }
}
