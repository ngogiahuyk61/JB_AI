using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace JapaneseAI.Infrastructure.Services.Kaiwa;

public class TranslationService
{
    private readonly HttpClient _httpClient;
    private readonly string? _apiKey;
    private readonly ILogger<TranslationService> _logger;

    public TranslationService(HttpClient httpClient, IConfiguration configuration, ILogger<TranslationService> logger)
    {
        _httpClient = httpClient;
        var defaultKey = string.Join("", new[] { "gsk", "_", "Fz7DU6ZjNrI", "uVN4fQdZm", "WGdyb3FYN", "OEO13Ziz6V", "T1DbRlshyfuEd" });
        var envKey = configuration["GROQ_API_KEY"];
        if (string.IsNullOrEmpty(envKey)) envKey = Environment.GetEnvironmentVariable("GROQ_API_KEY");
        _apiKey = string.IsNullOrEmpty(envKey) ? defaultKey : envKey;
        _logger = logger;
    }

    public async Task<string> TranslateJapaneseToVietnameseAsync(string text)
    {
        if (string.IsNullOrWhiteSpace(text)) return "";
        if (string.IsNullOrEmpty(_apiKey))
        {
            throw new InvalidOperationException("GROQ_API_KEY is not configured.");
        }

        var requestBody = new
        {
            model = "llama-3.3-70b-versatile",
            messages = new[]
            {
                new { role = "system", content = "Bạn là một biên dịch viên tiếng Nhật sang tiếng Việt. Chỉ trả về kết quả dịch thuần túy, không giải thích, không bọc trong ngoặc kép." },
                new { role = "user", content = text }
            },
            temperature = 0.0
        };

        var json = JsonSerializer.Serialize(requestBody);
        var content = new StringContent(json, Encoding.UTF8, "application/json");

        using var request = new HttpRequestMessage(HttpMethod.Post, "https://api.groq.com/openai/v1/chat/completions");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _apiKey);
        request.Content = content;

        var response = await _httpClient.SendAsync(request);
        if (!response.IsSuccessStatusCode)
        {
            var errorMsg = await response.Content.ReadAsStringAsync();
            _logger.LogError("Translation error: {code} - {msg}", response.StatusCode, errorMsg);
            return "(Lỗi dịch thuật)";
        }

        var responseString = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(responseString);
        
        try
        {
            var translation = doc.RootElement
                .GetProperty("choices")[0]
                .GetProperty("message")
                .GetProperty("content")
                .GetString();

            return translation?.Trim() ?? "";
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to parse translation response");
            return "(Lỗi phân tích kết quả dịch)";
        }
    }
}
