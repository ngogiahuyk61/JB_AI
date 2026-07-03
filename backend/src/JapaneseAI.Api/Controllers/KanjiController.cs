using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using JapaneseAI.Core.Entities;
using JapaneseAI.Infrastructure.Data;

namespace JapaneseAI.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class KanjiController : ControllerBase
    {
        private readonly AppDbContext _context;

        public KanjiController(AppDbContext context)
        {
            _context = context;
        }

        // GET: api/kanji/{character}
        [HttpGet("{character}")]
        public async Task<ActionResult<KanjiDictionary>> GetByCharacter(string character)
        {
            if (string.IsNullOrEmpty(character)) return BadRequest();
            var ch = character.Length == 1 ? character : character[0].ToString();

            var kanji = await _context.KanjiDictionaries
                .FirstOrDefaultAsync(k => k.Character == ch);

            return kanji == null ? NotFound() : Ok(kanji);
        }

        // GET: api/kanji/analyze?word=電車
        [HttpGet("analyze")]
        public async Task<ActionResult> Analyze([FromQuery] string word)
        {
            if (string.IsNullOrWhiteSpace(word)) return BadRequest("word is required");

            var chars = word
                .Where(c => c >= 0x4E00 && c <= 0x9FAF)
                .Select(c => c.ToString())
                .Distinct()
                .ToList();

            if (chars.Count == 0)
                return Ok(new { word, components = Array.Empty<KanjiDictionary>() });

            var kanjiList = await _context.KanjiDictionaries
                .Where(k => chars.Contains(k.Character))
                .ToListAsync();

            var ordered = chars
                .Where(c => kanjiList.Any(k => k.Character == c))
                .Select(c => kanjiList.First(k => k.Character == c))
                .ToList();

            return Ok(new { word, components = ordered });
        }

        // GET: api/kanji/stats
        [HttpGet("stats")]
        public async Task<ActionResult> GetStats()
        {
            var total = await _context.KanjiDictionaries.CountAsync();
            var byLevel = await _context.KanjiDictionaries
                .Where(k => k.JlptLevel != null)
                .GroupBy(k => k.JlptLevel)
                .Select(g => new { Level = g.Key, Count = g.Count() })
                .ToListAsync();

            return Ok(new { total, byLevel });
        }
    }
}
