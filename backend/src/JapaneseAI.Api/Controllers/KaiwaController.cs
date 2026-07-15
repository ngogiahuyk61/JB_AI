using JapaneseAI.Core.Entities.Kaiwa;
using JapaneseAI.Infrastructure.Services.Kaiwa;
using Microsoft.AspNetCore.Mvc;

namespace JapaneseAI.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class KaiwaController : ControllerBase
{
    private readonly KaiwaService _kaiwaService;
    private readonly EvaluationService _evaluationService;
    private readonly TranscriptionService _transcriptionService;
    private readonly TranslationService _translationService;
    private readonly ILogger<KaiwaController> _logger;

    public KaiwaController(
        KaiwaService kaiwaService,
        EvaluationService evaluationService,
        TranscriptionService transcriptionService,
        TranslationService translationService,
        ILogger<KaiwaController> logger)
    {
        _kaiwaService = kaiwaService;
        _evaluationService = evaluationService;
        _transcriptionService = transcriptionService;
        _translationService = translationService;
        _logger = logger;
    }

    // ── DTOs ──────────────────────────────────────────────────────────────────

    public record EvaluateRequest(
        int QuestionId,
        string UserAnswer
    );

    public record EvaluateResponse(
        int QuestionId,
        string QuestionText,
        string UserAnswer,
        string ExpectedAnswer,
        int GrammarScore,
        int VocabularyScore,
        int NaturalnessScore,
        int OverallScore,
        string Feedback,
        string GrammarExplanation,
        string CorrectSentence,
        bool PassThreshold
    );

    // ── Endpoints ─────────────────────────────────────────────────────────────

    /// <summary>GET /api/kaiwa/lessons — danh sách bài học</summary>
    [HttpGet("lessons")]
    public async Task<IActionResult> GetLessons()
    {
        var lessons = await _kaiwaService.GetLessonsAsync();
        return Ok(lessons);
    }

    /// <summary>GET /api/kaiwa/question/next?mode=lesson&lessonId=1&afterId=5&excludeIds=1,2,3</summary>
    [HttpGet("question/next")]
    public async Task<IActionResult> GetNextQuestion(
        [FromQuery] string mode = "random",
        [FromQuery] int? lessonId = null,
        [FromQuery] int? afterId = null,
        [FromQuery] string? excludeIds = null)
    {
        var exclude = excludeIds?
            .Split(',', StringSplitOptions.RemoveEmptyEntries)
            .Select(s => int.TryParse(s, out var n) ? n : 0)
            .Where(n => n > 0)
            .ToList();

        var question = await _kaiwaService.GetNextQuestionAsync(mode, lessonId, afterId, exclude);
        if (question == null)
            return NotFound(new { message = "No more questions available." });

        return Ok(question);
    }

    /// <summary>GET /api/kaiwa/question/{id} — chi tiết câu hỏi (không kèm answer)</summary>
    [HttpGet("question/{id:int}")]
    public async Task<IActionResult> GetQuestion(int id)
    {
        var q = await _kaiwaService.GetNextQuestionAsync("random", excludeIds: []);
        // Fetch directly by id
        var question = await _kaiwaService.GetQuestionWithAnswerAsync(id);
        if (question == null) return NotFound();

        // Return without answer
        return Ok(new
        {
            question.Id,
            question.LessonId,
            question.LessonTitle,
            question.JapaneseText,
            question.OrderIndex,
            question.TotalInLesson
        });
    }

    /// <summary>GET /api/kaiwa/question/{id}/answer — lấy câu trả lời mẫu</summary>
    [HttpGet("question/{id:int}/answer")]
    public async Task<IActionResult> GetExpectedAnswer(int id)
    {
        var question = await _kaiwaService.GetQuestionWithAnswerAsync(id);
        if (question == null) return NotFound();

        return Ok(new { expectedAnswer = question.ExpectedAnswer });
    }

    /// <summary>POST /api/kaiwa/evaluate — submit câu trả lời → nhận điểm</summary>
    [HttpPost("evaluate")]
    public async Task<IActionResult> Evaluate([FromBody] EvaluateRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.UserAnswer))
            return BadRequest(new { message = "userAnswer is required." });

        var questionWithAnswer = await _kaiwaService.GetQuestionWithAnswerAsync(request.QuestionId);
        if (questionWithAnswer == null)
            return NotFound(new { message = $"Question {request.QuestionId} not found." });

        var clientApiKey = Request.Headers["X-Groq-Api-Key"].FirstOrDefault();

        // Gọi Qwen3 đánh giá
        var evalResult = await _evaluationService.EvaluateAsync(
            questionWithAnswer.JapaneseText,
            questionWithAnswer.ExpectedAnswer,
            request.UserAnswer,
            clientApiKey
        );

        // Lưu lịch sử
        await _kaiwaService.SaveHistoryAsync(new KaiwaAnswerHistory
        {
            QuestionId = request.QuestionId,
            UserAnswer = request.UserAnswer,
            GrammarScore = evalResult.GrammarScore,
            VocabularyScore = evalResult.VocabularyScore,
            NaturalnessScore = evalResult.NaturalnessScore,
            OverallScore = evalResult.OverallScore,
            Feedback = evalResult.Feedback,
            GrammarExplanation = evalResult.GrammarExplanation,
            CorrectSentence = evalResult.CorrectSentence,
        });

        return Ok(new EvaluateResponse(
            QuestionId: request.QuestionId,
            QuestionText: questionWithAnswer.JapaneseText,
            UserAnswer: request.UserAnswer,
            ExpectedAnswer: questionWithAnswer.ExpectedAnswer,
            GrammarScore: evalResult.GrammarScore,
            VocabularyScore: evalResult.VocabularyScore,
            NaturalnessScore: evalResult.NaturalnessScore,
            OverallScore: evalResult.OverallScore,
            Feedback: evalResult.Feedback,
            GrammarExplanation: evalResult.GrammarExplanation,
            CorrectSentence: evalResult.CorrectSentence,
            PassThreshold: evalResult.PassThreshold
        ));
    }

    /// <summary>GET /api/kaiwa/history — lịch sử trả lời (10 gần nhất)</summary>
    [HttpGet("history")]
    public async Task<IActionResult> GetHistory([FromQuery] int limit = 10)
    {
        // Simple history - last N records
        var history = await _kaiwaService.GetLessonsAsync(); // placeholder
        return Ok(new { message = "History endpoint - coming soon", limit });
    }

    /// <summary>POST /api/kaiwa/transcribe — xử lý audio bằng Whisper API</summary>
    [HttpPost("transcribe")]
    public async Task<IActionResult> TranscribeAudio(IFormFile audio)
    {
        if (audio == null || audio.Length == 0)
        {
            return BadRequest(new { message = "Audio file is required." });
        }

        try
        {
            var clientApiKey = Request.Headers["X-Groq-Api-Key"].FirstOrDefault();
            using var stream = audio.OpenReadStream();
            var transcript = await _transcriptionService.TranscribeAudioAsync(stream, audio.FileName, audio.ContentType, clientApiKey);
            return Ok(new { transcript });
        }
        catch (InvalidOperationException ex)
        {
            return StatusCode(500, new { message = ex.Message });
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "Whisper API connection error");
            return StatusCode(502, new { message = $"Lỗi kết nối đến Whisper API: {ex.Message}" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing audio");
            return StatusCode(500, new { message = "Lỗi xử lý file âm thanh." });
        }
    }

    public record TranslateRequest(string Text);

    /// <summary>POST /api/kaiwa/translate — dịch tiếng Nhật sang tiếng Việt</summary>
    [HttpPost("translate")]
    public async Task<IActionResult> Translate([FromBody] TranslateRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Text))
        {
            return BadRequest(new { message = "Text is required." });
        }

        try
        {
            var translation = await _translationService.TranslateJapaneseToVietnameseAsync(request.Text);
            return Ok(new { translation });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Translation error");
            return StatusCode(500, new { message = "Lỗi dịch thuật." });
        }
    }
}
