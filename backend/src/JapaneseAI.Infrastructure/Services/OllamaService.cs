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
    public string ModelName => _model;

    private const string SYSTEM_PROMPT = """
        You are Sensei AI, a fast Japanese conversation coach.
        Keep every reply short, natural, and useful for speaking practice.
        Default response format:
        1. Japanese line only
        2. Romaji only
        3. Short Vietnamese coaching only
        Rules:
        - Maximum 3 short lines
        - No markdown, no bullets, no long explanation
        - If user gives a short greeting, greet back and ask exactly one short question
        - Prefer JLPT N5-N3 natural daily Japanese
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
    public async Task<string> ChatAsync(
        string userMessage,
        IEnumerable<ChatTurn>? history = null,
        string? systemPrompt = null,
        ChatSessionContext? sessionContext = null)
    {
        var messages = BuildMessages(userMessage, history, systemPrompt, sessionContext);
        var payload = new OllamaRequest { Model = _model, Messages = messages, Stream = false };

        try
        {
            var response = await _http.PostAsJsonAsync($"{_baseUrl}/api/chat", payload);
            response.EnsureSuccessStatusCode();

            var result = await response.Content.ReadFromJsonAsync<OllamaChatResponse>();
            return SanitizeReply(result?.Message?.Content ?? "Xin lỗi, không nhận được phản hồi từ AI.");
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
        string? systemPrompt = null,
        ChatSessionContext? sessionContext = null,
        [EnumeratorCancellation] CancellationToken cancellationToken = default)
    {
        var messages = BuildMessages(userMessage, history, systemPrompt, sessionContext);
        var payload = new OllamaRequest { Model = _model, Messages = messages, Stream = true };

        HttpResponseMessage response;
        try
        {
            var json = JsonSerializer.Serialize(payload);
            var content = new StringContent(json, Encoding.UTF8, "application/json");
            var request = new HttpRequestMessage(HttpMethod.Post, $"{_baseUrl}/api/chat")
            {
                Content = content
            };

            // Tránh buffer toàn bộ response body bằng cách chỉ đọc headers trước
            response = await _http.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, cancellationToken);
            response.EnsureSuccessStatusCode();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi khi bắt đầu Ollama stream");
            throw new OllamaException("Không thể kết nối với Ollama.", ex);
        }

        await using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
        using var reader = new StreamReader(stream, Encoding.UTF8);

        string? line;
        while (!cancellationToken.IsCancellationRequested && (line = await reader.ReadLineAsync(cancellationToken)) != null)
        {
            _logger.LogInformation("Ollama line: {Line}", line);
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
            {
                yield return content;
            }

            if (chunk?.Done == true)
                break;
        }
    }

    // ── Private Helpers ─────────────────────────────────────────────────

    private List<OllamaMessage> BuildMessages(
        string userMessage,
        IEnumerable<ChatTurn>? history,
        string? systemPrompt = null,
        ChatSessionContext? sessionContext = null)
    {
        var messages = new List<OllamaMessage>
        {
            new() { Role = "system", Content = BuildSystemPrompt(systemPrompt, sessionContext) }
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

    private static string BuildSystemPrompt(string? systemPrompt, ChatSessionContext? sessionContext)
    {
        var prompt = string.IsNullOrWhiteSpace(systemPrompt) ? SYSTEM_PROMPT : systemPrompt.Trim();

        if (sessionContext is null)
            return prompt;

        var extraRules = new List<string>();

        if (!string.IsNullOrWhiteSpace(sessionContext.Mode))
            extraRules.Add($"Session mode: {sessionContext.Mode}");

        if (!string.IsNullOrWhiteSpace(sessionContext.Level))
            extraRules.Add($"JLPT level: {sessionContext.Level}");

        if (!string.IsNullOrWhiteSpace(sessionContext.CurrentQuestion))
            extraRules.Add($"Current lesson question: {sessionContext.CurrentQuestion}");

        if (!string.IsNullOrWhiteSpace(sessionContext.LastAssessment))
            extraRules.Add($"Last assessment: {sessionContext.LastAssessment}");

        if (!string.IsNullOrWhiteSpace(sessionContext.SessionState))
            extraRules.Add($"Session state: {sessionContext.SessionState}");

        if (!string.IsNullOrWhiteSpace(sessionContext.TurnIntent))
            extraRules.Add($"Turn intent: {sessionContext.TurnIntent}");

        if (string.Equals(sessionContext.Mode, "guided_kaiwa", StringComparison.OrdinalIgnoreCase))
        {
            extraRules.Add("Guided kaiwa rules:");
            extraRules.Add("- NEVER output thinking, analysis, or phrases like \"let's break this down\"");
            extraRules.Add("- Ask or continue only one short question at a time");

            if (string.Equals(sessionContext.TurnIntent, "greeting", StringComparison.OrdinalIgnoreCase))
            {
                extraRules.Add("- User is only greeting: greet back naturally (match time of day) and ask ONE short question");
                extraRules.Add("- Do NOT assess grammar. Do NOT analyze the user's sentence. STATUS must be correct");
            }
            else if (string.Equals(sessionContext.TurnIntent, "lesson_answer", StringComparison.OrdinalIgnoreCase))
            {
                extraRules.Add("- User is answering the lesson question: assess correct/almost_correct/incorrect");
                extraRules.Add("- If incorrect, JA must be the corrected sentence the learner can repeat");
            }

            extraRules.Add("- If the user's answer is acceptable, line 1 should be the next short Japanese question");
            extraRules.Add("- Line 2 must be romaji for line 1");
            extraRules.Add("- Line 3 must be one short Vietnamese note");
            extraRules.Add("- Stay at the selected JLPT level vocabulary and grammar");
            extraRules.Add("- Do not explain grammar in detail unless the user explicitly asks");
        }

        return extraRules.Count == 0
            ? prompt
            : $"{prompt}\n{string.Join('\n', extraRules)}";
    }

    private static string SanitizeReply(string text)
    {
        if (string.IsNullOrWhiteSpace(text))
            return text;

        var trimmed = text.Trim();
        var cotPatterns = new[]
        {
            "okay, let's", "let's break this down", "first, i need", "the user said",
            "conversation flow", "i need to check", "hmm, the user"
        };

        if (cotPatterns.Any(p => trimmed.Contains(p, StringComparison.OrdinalIgnoreCase)))
        {
            var tagged = trimmed
                .Split('\n')
                .Select(l => l.Trim())
                .Where(l => l.StartsWith("STATUS:", StringComparison.OrdinalIgnoreCase)
                         || l.StartsWith("JA:", StringComparison.OrdinalIgnoreCase)
                         || l.StartsWith("RO:", StringComparison.OrdinalIgnoreCase)
                         || l.StartsWith("VI:", StringComparison.OrdinalIgnoreCase)
                         || l.StartsWith("SHADOW:", StringComparison.OrdinalIgnoreCase))
                .ToList();

            if (tagged.Count >= 2)
                return string.Join('\n', tagged);
        }

        return trimmed;
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
    [JsonPropertyName("think")]
    public bool Think { get; set; } = false;
    [JsonPropertyName("options")]
    public OllamaOptions Options { get; set; } = new();
}

public class OllamaOptions
{
    [JsonPropertyName("temperature")]
    public float Temperature { get; set; } = 0.25f;
    [JsonPropertyName("num_ctx")]
    public int NumCtx { get; set; } = 768;
    [JsonPropertyName("num_predict")]
    public int NumPredict { get; set; } = 120;
}

public class OllamaMessage
{
    [JsonPropertyName("role")]
    public string Role { get; set; } = "user";
    [JsonPropertyName("content")]
    public string Content { get; set; } = "";
    [JsonPropertyName("thinking")]
    public string? Thinking { get; set; }
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

public class ChatSessionContext
{
    [JsonPropertyName("mode")]
    public string? Mode { get; set; }

    [JsonPropertyName("level")]
    public string? Level { get; set; }

    [JsonPropertyName("currentQuestion")]
    public string? CurrentQuestion { get; set; }

    [JsonPropertyName("lastAssessment")]
    public string? LastAssessment { get; set; }

    [JsonPropertyName("sessionState")]
    public string? SessionState { get; set; }

    [JsonPropertyName("turnIntent")]
    public string? TurnIntent { get; set; }
}
