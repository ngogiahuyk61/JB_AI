using System.Net.Http;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Runtime.CompilerServices;
using Microsoft.Extensions.Logging;

namespace JapaneseAI.Infrastructure.Services;

/// <summary>
/// Service giao tiếp với Ollama API (local) để chạy model Qwen3.
/// Hỗ trợ cả chat thường và streaming (Server-Sent Events).
/// </summary>
public class OllamaService
{
    private readonly HttpClient _http;
    private readonly ILogger<OllamaService> _logger;
    private readonly string _model;
    private readonly string _baseUrl;

    private const string SYSTEM_PROMPT = """
        Bạn là Sensei AI — giáo viên tiếng Nhật thân thiện và chuyên nghiệp.
        Nhiệm vụ: Hỗ trợ học viên Việt Nam luyện tập hội thoại tiếng Nhật (会話 Kaiwa).

        Quy tắc trả lời:
        1. Ưu tiên trả lời bằng tiếng Nhật (hiragana/kanji phù hợp trình độ JLPT N5-N3).
        2. Luôn kèm phiên âm romaji trong ngoặc đơn nếu dùng kanji khó.
        3. Dịch nghĩa tiếng Việt ngắn gọn ở cuối mỗi câu Nhật.
        4. Sửa lỗi ngữ pháp/phát âm của học viên một cách nhẹ nhàng.
        5. Câu trả lời ngắn gọn (3-6 câu), thân thiện, dùng emoji phù hợp.
        6. Khi học viên hỏi từ vựng, giải thích cách dùng thực tế.

        Format ví dụ:
        こんにちは！(Konnichiwa!) 😊
        → Xin chào! Hôm nay bạn muốn luyện tập gì?
        """;

    public OllamaService(HttpClient http, ILogger<OllamaService> logger, string baseUrl, string model)
    {
        _http = http;
        _logger = logger;
        _baseUrl = baseUrl.TrimEnd('/');
        _model = model;
    }

    /// <summary>Kiểm tra Ollama có đang chạy không.</summary>
    public async Task<bool> IsAvailableAsync()
    {
        try
        {
            var response = await _http.GetAsync($"{_baseUrl}/api/tags");
            return response.IsSuccessStatusCode;
        }
        catch
        {
            return false;
        }
    }

    /// <summary>Chat thường — trả về full response sau khi hoàn tất.</summary>
    public async Task<string> ChatAsync(string userMessage, IEnumerable<ChatTurn>? history = null)
    {
        var messages = BuildMessages(userMessage, history);
        var payload = new OllamaRequest { Model = _model, Messages = messages, Stream = false };

        try
        {
            var response = await _http.PostAsJsonAsync($"{_baseUrl}/api/chat", payload);
            response.EnsureSuccessStatusCode();

            var result = await response.Content.ReadFromJsonAsync<OllamaChatResponse>();
            return result?.Message?.Content ?? "Xin lỗi, không nhận được phản hồi từ AI.";
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi khi gọi Ollama chat API");
            throw new OllamaException("Không thể kết nối với Ollama. Vui lòng kiểm tra Ollama đang chạy.", ex);
        }
    }

    /// <summary>Streaming chat — gọi callback onChunk mỗi khi nhận được một đoạn text.</summary>
    public async IAsyncEnumerable<string> StreamChatAsync(
        string userMessage,
        IEnumerable<ChatTurn>? history = null,
        [EnumeratorCancellation] CancellationToken cancellationToken = default)
    {
        var messages = BuildMessages(userMessage, history);
        var payload = new OllamaRequest { Model = _model, Messages = messages, Stream = true };

        HttpResponseMessage response;
        try
        {
            response = await _http.PostAsJsonAsync($"{_baseUrl}/api/chat", payload, cancellationToken);
            response.EnsureSuccessStatusCode();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi khi bắt đầu Ollama stream");
            throw new OllamaException("Không thể kết nối với Ollama.", ex);
        }

        await using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
        using var reader = new StreamReader(stream, Encoding.UTF8);

        while (!reader.EndOfStream && !cancellationToken.IsCancellationRequested)
        {
            var line = await reader.ReadLineAsync(cancellationToken);
            if (string.IsNullOrEmpty(line)) continue;

            OllamaChatStreamChunk? chunk;
            try
            {
                chunk = JsonSerializer.Deserialize<OllamaChatStreamChunk>(line);
            }
            catch (JsonException)
            {
                continue;
            }

            if (chunk?.Message?.Content is { Length: > 0 } content)
                yield return content;

            if (chunk?.Done == true)
                break;
        }
    }

    // ── Private Helpers ─────────────────────────────────────────────────

    private List<OllamaMessage> BuildMessages(string userMessage, IEnumerable<ChatTurn>? history)
    {
        var messages = new List<OllamaMessage>
        {
            new() { Role = "system", Content = SYSTEM_PROMPT }
        };

        if (history != null)
        {
            foreach (var turn in history)
            {
                messages.Add(new OllamaMessage { Role = turn.Role, Content = turn.Content });
            }
        }

        messages.Add(new OllamaMessage { Role = "user", Content = userMessage });
        return messages;
    }
}

// ── DTO Models ─────────────────────────────────────────────────────────

public class ChatTurn
{
    [JsonPropertyName("role")]
    public string Role { get; set; } = "user"; // "user" | "assistant"
    [JsonPropertyName("content")]
    public string Content { get; set; } = "";
}

public class OllamaRequest
{
    [JsonPropertyName("model")]
    public string Model { get; set; } = "qwen3:4b";
    [JsonPropertyName("messages")]
    public List<OllamaMessage> Messages { get; set; } = [];
    [JsonPropertyName("stream")]
    public bool Stream { get; set; } = true;
    [JsonPropertyName("options")]
    public OllamaOptions Options { get; set; } = new();
}

public class OllamaOptions
{
    [JsonPropertyName("temperature")]
    public float Temperature { get; set; } = 0.7f;
    [JsonPropertyName("num_ctx")]
    public int NumCtx { get; set; } = 1024;
}

public class OllamaMessage
{
    [JsonPropertyName("role")]
    public string Role { get; set; } = "user";
    [JsonPropertyName("content")]
    public string Content { get; set; } = "";
}

public class OllamaChatResponse
{
    [JsonPropertyName("message")]
    public OllamaMessage? Message { get; set; }
    [JsonPropertyName("done")]
    public bool Done { get; set; }
}

public class OllamaChatStreamChunk
{
    [JsonPropertyName("message")]
    public OllamaMessage? Message { get; set; }
    [JsonPropertyName("done")]
    public bool Done { get; set; }
}

public class OllamaException : Exception
{
    public OllamaException(string message, Exception? inner = null) : base(message, inner) { }
}
