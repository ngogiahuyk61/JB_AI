using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using JapaneseAI.Core.Entities;
using JapaneseAI.Infrastructure.Data;
using System.Text.RegularExpressions;

namespace JapaneseAI.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class VocabularyController : ControllerBase
    {
        private readonly AppDbContext _context;
        private static readonly Regex TuLayPattern = new(@"([\u3041-\u3093]{2,4})\1", RegexOptions.Compiled);

        public VocabularyController(AppDbContext context)
        {
            _context = context;
        }

        // GET: api/vocabulary
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Vocabulary>>> GetVocabulary(
            [FromQuery] string? level,
            [FromQuery] string? pos,
            [FromQuery] string? tags,
            [FromQuery] string? category,
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

            if (!string.IsNullOrEmpty(tags))
            {
                query = query.Where(v => v.Tags != null && v.Tags.Contains(tags));
            }

            List<Vocabulary> items;
            int total;

            if (!string.IsNullOrEmpty(category) && IsN3SpecialCategory(category))
            {
                var baseQuery = query.Where(v => v.Tags != null && v.Tags.Contains("special") && v.JlptLevel == "N3");
                var allN3Special = await baseQuery.OrderBy(v => v.SortOrder).ToListAsync();
                var filtered = FilterN3SpecialByCategory(allN3Special, category);
                total = filtered.Count;
                items = filtered.Skip(offset).Take(Math.Min(limit, 1000)).ToList();
            }
            else
            {
                if (!string.IsNullOrEmpty(category))
                {
                    query = ApplyCategoryFilter(query, category);
                }

                total = await query.CountAsync();
                items = await query.OrderBy(v => v.SortOrder)
                                   .Skip(offset)
                                   .Take(Math.Min(limit, 1000))
                                   .ToListAsync();
            }

            Response.Headers.Append("X-Total-Count", total.ToString());
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

            var n2Bs = await _context.Vocabulary
                .CountAsync(v => v.Tags != null && v.Tags.Contains("n2_bs"));

            var tuLay = await _context.Vocabulary
                .CountAsync(v => v.Tags != null && v.Tags.Contains("tu_lay"));

            var luongTu = await _context.Vocabulary
                .CountAsync(v => v.Tags != null && v.Tags.Contains("luong_tu"));

            return Ok(new
            {
                levels = stats,
                special = new
                {
                    n2_bs = n2Bs,
                    tu_lay = tuLay,
                    luong_tu = luongTu,
                    total = n2Bs + tuLay + luongTu
                }
            });
        }

        private static IQueryable<Vocabulary> ApplyCategoryFilter(IQueryable<Vocabulary> query, string category)
        {
            var key = category.Trim().ToLowerInvariant().Replace("-", "_").Replace(" ", "_");

            return key switch
            {
                "n2_bs" => query.Where(v => v.Tags != null && v.Tags.Contains("n2_bs")),
                "tu_lay" or "từ_láy" => query.Where(v => v.Tags != null && v.Tags.Contains("tu_lay")),
                "luong_tu" or "lượng_từ" => query.Where(v => v.Tags != null && v.Tags.Contains("luong_tu")),
                _ => query
            };
        }

        private static bool IsN3SpecialCategory(string category)
        {
            // Now handled directly by ApplyCategoryFilter — no longer needed for N3-only filtering
            return false;
        }

        private static List<Vocabulary> FilterN3SpecialByCategory(List<Vocabulary> items, string category)
        {
            // Kept for backward compat but no longer called
            var key = category.Trim().ToLowerInvariant().Replace("-", "_").Replace(" ", "_");
            return key switch
            {
                "tu_lay" or "từ_láy" => items.Where(v => v.Tags != null && v.Tags.Contains("tu_lay")).ToList(),
                "luong_tu" or "lượng_từ" => items.Where(v => v.Tags != null && v.Tags.Contains("luong_tu")).ToList(),
                _ => items
            };
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
