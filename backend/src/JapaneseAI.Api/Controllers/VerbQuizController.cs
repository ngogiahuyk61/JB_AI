using JapaneseAI.Core.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace JapaneseAI.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class VerbQuizController : ControllerBase
{
    private readonly IVerbQuizService _verbQuizService;

    public VerbQuizController(IVerbQuizService verbQuizService)
    {
        _verbQuizService = verbQuizService;
    }

    public class GenerateRequest
    {
        public string JlptLevel { get; set; } = "N5";
        public string[] VerbGroups { get; set; } = Array.Empty<string>();
        public string[] Forms { get; set; } = Array.Empty<string>();
        public int Count { get; set; } = 10;
        public string Mode { get; set; } = "mixed";
    }

    [HttpPost("generate")]
    public async Task<IActionResult> Generate([FromBody] GenerateRequest req)
    {
        try
        {
            var questions = await _verbQuizService.GenerateQuizAsync(req.JlptLevel, req.VerbGroups, req.Forms, req.Count, req.Mode);
            return Ok(questions);
        }
        catch (Exception ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }
}
