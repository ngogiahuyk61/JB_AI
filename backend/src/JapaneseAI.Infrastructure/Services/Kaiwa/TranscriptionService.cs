using System.Net.Http.Headers;
using System.Text.Json;
using Microsoft.Extensions.Configuration;

namespace JapaneseAI.Infrastructure.Services.Kaiwa
{
    public class TranscriptionService
    {
        private readonly HttpClient _httpClient;
        private readonly string? _apiKey;

        public TranscriptionService(HttpClient httpClient, IConfiguration configuration)
        {
            _httpClient = httpClient;
            _apiKey = configuration["GROQ_API_KEY"] ?? Environment.GetEnvironmentVariable("GROQ_API_KEY");
        }

        public async Task<string> TranscribeAudioAsync(Stream audioStream, string fileName, string contentType, string? clientApiKey = null)
        {
            var keyToUse = clientApiKey ?? _apiKey;
            if (string.IsNullOrEmpty(keyToUse))
            {
                throw new InvalidOperationException("GROQ_API_KEY is not configured.");
            }

            using var request = new HttpRequestMessage(HttpMethod.Post, "https://api.groq.com/openai/v1/audio/transcriptions");
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", keyToUse);

            using var content = new MultipartFormDataContent();
            
            // Add file
            var streamContent = new StreamContent(audioStream);
            streamContent.Headers.ContentType = new MediaTypeHeaderValue(contentType ?? "audio/webm");
            content.Add(streamContent, "file", fileName ?? "audio.webm");

            // Add model
            content.Add(new StringContent("whisper-large-v3"), "model");
            // Add language to hint it's Japanese
            content.Add(new StringContent("ja"), "language");
            // Add response format
            content.Add(new StringContent("json"), "response_format");

            request.Content = content;

            var response = await _httpClient.SendAsync(request);
            
            if (!response.IsSuccessStatusCode)
            {
                var errorMsg = await response.Content.ReadAsStringAsync();
                throw new HttpRequestException($"Groq API error: {response.StatusCode} - {errorMsg}");
            }

            var responseString = await response.Content.ReadAsStringAsync();
            var result = JsonSerializer.Deserialize<JsonElement>(responseString);
            
            if (result.TryGetProperty("text", out var textElement))
            {
                return textElement.GetString() ?? "";
            }

            return "";
        }
    }
}
