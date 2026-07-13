using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace JapaneseAI.Infrastructure.Services.Kaiwa;

public class EvaluationService
{
    private readonly ILogger<EvaluationService> _logger;
    private readonly HttpClient _httpClient;
    private readonly string? _apiKey;
    private const string ModelName = "llama-3.3-70b-versatile";
    private static string? _n5GrammarRules;

    public EvaluationService(ILogger<EvaluationService> logger, HttpClient httpClient, IConfiguration configuration)
    {
        _logger = logger;
        _httpClient = httpClient;
        _apiKey = configuration["GROQ_API_KEY"] ?? Environment.GetEnvironmentVariable("GROQ_API_KEY");
    }

    public record EvaluationResult(
        int GrammarScore,
        int VocabularyScore,
        int NaturalnessScore,
        int OverallScore,
        string Feedback,
        string GrammarExplanation,
        string CorrectSentence,
        bool PassThreshold
    );

    public async Task<EvaluationResult> EvaluateAsync(
        string questionText,
        string expectedAnswer,
        string userAnswer)
    {
        var prompt = BuildPrompt(questionText, expectedAnswer, userAnswer);

        try
        {
            if (string.IsNullOrEmpty(_apiKey))
            {
                throw new InvalidOperationException("GROQ_API_KEY is not configured.");
            }

            var requestBody = new
            {
                model = ModelName,
                messages = new[]
                {
                    new { role = "user", content = prompt }
                },
                temperature = 0.0,
                response_format = new { type = "json_object" }
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
                _logger.LogError("[EvaluationService] Groq error: {code} - {msg}", response.StatusCode, errorMsg);
                return FallbackResult(userAnswer, expectedAnswer);
            }

            var responseJson = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(responseJson);
            var rawResponse = doc.RootElement
                .GetProperty("choices")[0]
                .GetProperty("message")
                .GetProperty("content")
                .GetString() ?? "";

            _logger.LogDebug("[EvaluationService] Raw response: {response}", rawResponse);

            return ParseExtractionResponse(rawResponse, expectedAnswer, userAnswer);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[EvaluationService] Error calling Ollama");
            return FallbackResult(userAnswer, expectedAnswer);
        }
    }

    private static string GetN5GrammarRules()
    {
        if (_n5GrammarRules != null) return _n5GrammarRules;
        try
        {
            var path = @"f:\JB_AI\backend\src\JapaneseAI.Infrastructure\Services\Kaiwa\N5GrammarRules.txt";
            if (File.Exists(path))
            {
                _n5GrammarRules = File.ReadAllText(path);
            }
            else
            {
                _n5GrammarRules = "(Chưa tìm thấy N5GrammarRules.txt)";
            }
        }
        catch
        {
            _n5GrammarRules = "(Lỗi đọc N5GrammarRules.txt)";
        }
        return _n5GrammarRules;
    }

    private static string BuildPrompt(string questionText, string expectedAnswer, string userAnswer)
    {
        var rules = GetN5GrammarRules();

        return $$"""
あなたは日本語の文法アナリストです。以下のN5の文法（第1課〜第25課）のみを基準にしてください。

【N5文法リスト】
{{rules}}

質問: {{questionText}}
模範回答: {{expectedAnswer}}
学習者の回答: {{userAnswer}}

指示：
1. 思考プロセスを出力しないこと（<think>タグ等を使わない）。
2. 直接JSONのみを出力すること。
3. 質問、模範回答、学習者の回答から、それぞれ使用されているN5文法を上のリストから正確に抽出してください。
4. リストにない文法名を自分で作らないこと。

{
  "question_grammar_patterns": ["リストから抽出した質問の文法"],
  "expected_grammar_patterns": ["リストから抽出した模範回答の文法"],
  "user_grammar_patterns": ["リストから抽出した学習者の回答の文法"]
}
""";
    }

    private EvaluationResult ParseExtractionResponse(string rawResponse, string expectedAnswer, string userAnswer)
    {
        // Strip <think>...</think> tags if Qwen3 ignores the prompt
        var cleaned = Regex.Replace(rawResponse, @"<think>.*?</think>", "", RegexOptions.Singleline).Trim();

        // Extract JSON block
        var jsonMatch = Regex.Match(cleaned, @"\{[\s\S]*\}", RegexOptions.Singleline);
        if (!jsonMatch.Success)
        {
            _logger.LogWarning("[EvaluationService] Could not find JSON in response: {raw}", rawResponse[..Math.Min(200, rawResponse.Length)]);
            return FallbackResult(userAnswer, expectedAnswer);
        }

        try
        {
            using var doc = JsonDocument.Parse(jsonMatch.Value);
            var root = doc.RootElement;

            var questionPatterns = GetStringArray(root, "question_grammar_patterns");
            var expectedPatterns = GetStringArray(root, "expected_grammar_patterns");
            var userPatterns = GetStringArray(root, "user_grammar_patterns");

            var questionStr = string.Join(", ", questionPatterns);
            var expectedStr = string.Join(", ", expectedPatterns);
            var userStr = string.Join(", ", userPatterns);

            bool isCorrect = false;
            // Compare arrays (simple subset check or exact match)
            if (expectedPatterns.Count == 0 && userPatterns.Count == 0)
            {
                isCorrect = true; // No specific grammar detected in both
            }
            else
            {
                // Check if user used all required patterns
                isCorrect = expectedPatterns.All(ep => userPatterns.Contains(ep));
            }

            int grammarScore = isCorrect ? 100 : 50;

            string feedback = isCorrect 
                ? "✅ Đúng cấu trúc bài học\n" +
                  $"📌 Ngữ pháp câu hỏi:\n- {(string.IsNullOrEmpty(questionStr) ? "Không có cấu trúc đặc biệt" : string.Join("\n- ", questionPatterns))}\n" +
                  $"✅ Ngữ pháp bạn dùng:\n- {(string.IsNullOrEmpty(userStr) ? "Không có cấu trúc đặc biệt" : string.Join("\n- ", userPatterns))}"
                : $"❌ Chưa đúng cấu trúc yêu cầu\n" +
                  $"📌 Ngữ pháp câu hỏi:\n- {(string.IsNullOrEmpty(questionStr) ? "Không có cấu trúc đặc biệt" : string.Join("\n- ", questionPatterns))}\n" +
                  $"🎯 Bài học yêu cầu:\n- {(string.IsNullOrEmpty(expectedStr) ? "Không có cấu trúc đặc biệt" : string.Join("\n- ", expectedPatterns))}\n" +
                  $"⚠️ Bạn đang dùng:\n- {(string.IsNullOrEmpty(userStr) ? "Không có cấu trúc đặc biệt" : string.Join("\n- ", userPatterns))}";

            return new EvaluationResult(
                GrammarScore: grammarScore,
                VocabularyScore: grammarScore,       // Mocked
                NaturalnessScore: grammarScore,      // Mocked
                OverallScore: grammarScore,          // Mocked
                Feedback: isCorrect ? "Rất tốt!" : "Cấu trúc chưa chính xác.",
                GrammarExplanation: feedback,
                CorrectSentence: expectedAnswer,
                PassThreshold: isCorrect
            );
        }
        catch (JsonException ex)
        {
            _logger.LogWarning(ex, "[EvaluationService] JSON parse error");
            return FallbackResult(userAnswer, expectedAnswer);
        }
    }

    private static EvaluationResult FallbackResult(string userAnswer, string expected)
    {
        var hasAnswer = !string.IsNullOrWhiteSpace(userAnswer);
        var score = hasAnswer ? 60 : 0;
        return new EvaluationResult(
            GrammarScore: score,
            VocabularyScore: score,
            NaturalnessScore: score,
            OverallScore: score,
            Feedback: hasAnswer ? "Câu trả lời đã được ghi nhận. Không thể phân tích chi tiết." : "Chưa có câu trả lời.",
            GrammarExplanation: "",
            CorrectSentence: expected,
            PassThreshold: score >= 80
        );
    }

    private static int GetInt(JsonElement root, string key, int fallback)
    {
        if (root.TryGetProperty(key, out var el))
        {
            if (el.ValueKind == JsonValueKind.Number && el.TryGetInt32(out var v))
                return Math.Clamp(v, 0, 100);
        }
        return fallback;
    }

    private static bool GetBool(JsonElement root, string key, bool fallback)
    {
        if (root.TryGetProperty(key, out var el))
        {
            if (el.ValueKind == JsonValueKind.True) return true;
            if (el.ValueKind == JsonValueKind.False) return false;
        }
        return fallback;
    }

    private static string GetString(JsonElement root, string key, string fallback)
    {
        if (root.TryGetProperty(key, out var el) && el.ValueKind == JsonValueKind.String)
            return el.GetString() ?? fallback;
        return fallback;
    }

    private static List<string> GetStringArray(JsonElement root, string key)
    {
        var list = new List<string>();
        if (root.TryGetProperty(key, out var el) && el.ValueKind == JsonValueKind.Array)
        {
            foreach (var item in el.EnumerateArray())
            {
                if (item.ValueKind == JsonValueKind.String)
                {
                    var val = item.GetString();
                    if (!string.IsNullOrWhiteSpace(val))
                    {
                        list.Add(val.Trim());
                    }
                }
            }
        }
        return list;
    }
}
