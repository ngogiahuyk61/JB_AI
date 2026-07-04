using Microsoft.AspNetCore.Mvc;
using JapaneseAI.Infrastructure.Services;

namespace JapaneseAI.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ChatController : ControllerBase
{
    private readonly OllamaService _ollamaService;
    private readonly ILogger<ChatController> _logger;

    public ChatController(OllamaService ollamaService, ILogger<ChatController> logger)
    {
        _ollamaService = ollamaService;
        _logger = logger;
    }

    /// <summary>Kiểm tra Ollama status.</summary>
    [HttpGet("health")]
    public async Task<IActionResult> GetHealth()
    {
        var available = await _ollamaService.IsAvailableAsync();
        return Ok(new { status = available ? "online" : "offline", model = "qwen3:4b" });
    }

    /// <summary>Chat thường (không stream).</summary>
    [HttpPost]
    public async Task<IActionResult> Chat([FromBody] ChatRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Message))
            return BadRequest("Message cannot be empty.");

        try
        {
            var reply = await _ollamaService.ChatAsync(request.Message, request.History);
            return Ok(new ChatResponse { Reply = reply });
        }
        catch (OllamaException ex)
        {
            return StatusCode(503, new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Chat request failed.");
            return StatusCode(500, new { error = "An internal server error occurred." });
        }
    }

    /// <summary>Chat Streaming qua Server-Sent Events (SSE).</summary>
    [HttpPost("stream")]
    public async Task ChatStream([FromBody] ChatRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Message))
        {
            Response.StatusCode = 400;
            return;
        }

        Response.Headers.ContentType = "text/event-stream";
        Response.Headers.CacheControl = "no-cache";
        Response.Headers.Connection = "keep-alive";

        try
        {
            await foreach (var chunk in _ollamaService.StreamChatAsync(request.Message, request.History, HttpContext.RequestAborted))
            {
                // SSE format: data: <chunk>\n\n
                // Encode chunk to avoid raw line breaks issues
                var dataLine = $"data: {Uri.EscapeDataString(chunk)}\n\n";
                await Response.WriteAsync(dataLine);
                await Response.Body.FlushAsync();
            }
        }
        catch (OperationCanceledException)
        {
            _logger.LogInformation("Chat stream was cancelled by client.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during chat streaming.");
            var errorLine = $"data: [ERROR]: {Uri.EscapeDataString("Lỗi kết nối AI server local.")}\n\n";
            await Response.WriteAsync(errorLine);
            await Response.Body.FlushAsync();
        }
    }
}

public class ChatRequest
{
    public string Message { get; set; } = "";
    public List<ChatTurn>? History { get; set; }
}

public class ChatResponse
{
    public string Reply { get; set; } = "";
}
