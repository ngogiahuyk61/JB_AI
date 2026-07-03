using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using JapaneseAI.Core.Entities;
using JapaneseAI.Infrastructure.Data;

namespace JapaneseAI.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class VocabularyController : ControllerBase
    {
        private readonly AppDbContext _context;

        public VocabularyController(AppDbContext context)
        {
            _context = context;
        }

        // GET: api/vocabulary
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Vocabulary>>> GetVocabulary(
            [FromQuery] string? level,
            [FromQuery] string? pos,
            [FromQuery] int limit = 100,
            [FromQuery] int offset = 0)
        {
            var query = _context.Vocabulary.AsQueryable();

            if (!string.IsNullOrEmpty(level))
            {
                query = query.Where(v => v.JlptLevel == level);
            }

            if (!string.IsNullOrEmpty(pos))
            {
                query = query.Where(v => v.PartOfSpeech == pos);
            }

            var total = await query.CountAsync();
            var items = await query.OrderBy(v => v.SortOrder)
                                   .Skip(offset)
                                   .Take(Math.Min(limit, 1000))
                                   .ToListAsync();

            Response.Headers.Append("X-Total-Count", total.ToString());
            // NOTE: KanjiDetails NOT populated here for performance (too many items).
            // Click on individual word to get detail via /api/vocabulary/{id}
            return Ok(items);
        }

        // GET: api/vocabulary/search
        [HttpGet("search")]
        public async Task<ActionResult<IEnumerable<Vocabulary>>> Search(
            [FromQuery] string q,
            [FromQuery] int limit = 100)
        {
            if (string.IsNullOrWhiteSpace(q))
            {
                return BadRequest("Search query cannot be empty");
            }

            var searchTerm = q.Trim().ToLower();

            var items = await _context.Vocabulary
                .Where(v => v.Kanji.Contains(searchTerm) || 
                            v.Kana.Contains(searchTerm) || 
                            (v.HanViet != null && v.HanViet.Contains(searchTerm)) || 
                            v.Vietnamese.Contains(searchTerm))
                .Take(limit)
                .ToListAsync();

            await PopulateKanjiDetailsAsync(items);
            return Ok(items);
        }

        // GET: api/vocabulary/{id}
        [HttpGet("{id}")]
        public async Task<ActionResult<Vocabulary>> GetById(int id)
        {
            var item = await _context.Vocabulary.FindAsync(id);
            if (item == null)
            {
                return NotFound();
            }
            await PopulateKanjiDetailsAsync(new List<Vocabulary> { item });
            return Ok(item);
        }

        // GET: api/vocabulary/stats
        [HttpGet("stats")]
        public async Task<ActionResult> GetStats()
        {
            var stats = await _context.Vocabulary
                .GroupBy(v => v.JlptLevel)
                .Select(g => new { Level = g.Key, Count = g.Count() })
                .ToListAsync();

            return Ok(stats);
        }

        private async Task PopulateKanjiDetailsAsync(List<Vocabulary> items)
        {
            if (items == null || items.Count == 0) return;

            var kanjiChars = items
                .SelectMany(v => v.Kanji.ToCharArray())
                .Where(c => c >= 0x4e00 && c <= 0x9faf)
                .Select(c => c.ToString())
                .Distinct()
                .ToList();

            if (kanjiChars.Count == 0) return;

            var kanjiDict = await _context.KanjiDictionaries
                .Where(k => kanjiChars.Contains(k.Character))
                .ToDictionaryAsync(k => k.Character, k => k);

            foreach (var item in items)
            {
                item.KanjiDetails = item.Kanji.ToCharArray()
                    .Where(c => c >= 0x4e00 && c <= 0x9faf)
                    .Select(c => c.ToString())
                    .Where(c => kanjiDict.ContainsKey(c))
                    .Select(c => kanjiDict[c])
                    .ToList();
            }
        }
    }
}
