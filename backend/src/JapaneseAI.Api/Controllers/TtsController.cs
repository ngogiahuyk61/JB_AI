using Microsoft.AspNetCore.Mvc;

namespace JapaneseAI.Api.Controllers;

/// <summary>
/// TTS Proxy Controller – Proxy Google Translate TTS qua server để bypass browser bot-detection.
/// Google chặn TTS từ browser (reCAPTCHA) nhưng không chặn server-to-server requests.
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class TtsController : ControllerBase
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<TtsController> _logger;

    public TtsController(IHttpClientFactory httpClientFactory, ILogger<TtsController> logger)
    {
        _httpClientFactory = httpClientFactory;
        _logger = logger;
    }

    /// <summary>
    /// Đọc text tiếng Việt qua Google Translate TTS proxy.
    /// GET /api/tts?text=Xin chào&lang=vi
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> Get([FromQuery] string text, [FromQuery] string lang = "vi")
    {
        if (string.IsNullOrWhiteSpace(text))
            return BadRequest("text is required");

        text = text.Length > 200 ? text[..200] : text;
        lang = lang.Replace("\"", "").Replace("'", "");

        // Thử nhiều client parameter khác nhau – Google thường cho phép 1 trong số này
        var urlCandidates = new[]
        {
            $"https://translate.google.com/translate_tts?ie=UTF-8&client=gtx&q={Uri.EscapeDataString(text)}&tl={lang}&ttsspeed=0.9",
            $"https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&q={Uri.EscapeDataString(text)}&tl={lang}&ttsspeed=0.9",
            $"https://translate.googleapis.com/translate_tts?ie=UTF-8&client=gtx&q={Uri.EscapeDataString(text)}&tl={lang}",
        };

        var client = _httpClientFactory.CreateClient("GoogleTTS");

        foreach (var url in urlCandidates)
        {
            try
            {
                var response = await client.GetAsync(url);
                if (response.IsSuccessStatusCode)
                {
                    var audioBytes = await response.Content.ReadAsByteArrayAsync();
                    if (audioBytes.Length > 1000) // Kiểm tra thực sự là file audio
                    {
                        _logger.LogInformation("TTS success via {Url} for: {Text}", url[..50], text[..Math.Min(20, text.Length)]);
                        return File(audioBytes, "audio/mpeg");
                    }
                }
                _logger.LogWarning("TTS attempt failed {Status} via {Url}", response.StatusCode, url[..50]);
            }
            catch (Exception ex)
            {
                _logger.LogWarning("TTS attempt exception via {Url}: {Msg}", url[..50], ex.Message);
            }
        }

        return StatusCode(503, "All TTS sources unavailable");
    }
}
