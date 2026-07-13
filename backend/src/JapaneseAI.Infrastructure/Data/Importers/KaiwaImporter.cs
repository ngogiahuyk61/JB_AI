using System.Text.Json;
using JapaneseAI.Core.Entities.Kaiwa;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace JapaneseAI.Infrastructure.Data.Importers;

public class KaiwaImporter
{
    private readonly AppDbContext _db;
    private readonly ILogger<KaiwaImporter> _logger;

    public KaiwaImporter(AppDbContext db, ILogger<KaiwaImporter> logger)
    {
        _db = db;
        _logger = logger;
    }

    public async Task ImportAsync(string jsonFilePath)
    {
        if (!File.Exists(jsonFilePath))
        {
            _logger.LogWarning("[KaiwaImporter] JSON file not found: {path}", jsonFilePath);
            return;
        }

        var alreadyImported = await _db.KaiwaLessons.AnyAsync();
        if (alreadyImported)
        {
            _logger.LogInformation("[KaiwaImporter] Kaiwa data already imported, skipping.");
            return;
        }

        _logger.LogInformation("[KaiwaImporter] Importing from {path}...", jsonFilePath);

        var json = await File.ReadAllTextAsync(jsonFilePath, System.Text.Encoding.UTF8);
        var lessons = JsonSerializer.Deserialize<List<KaiwaLessonJson>>(json,
            new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

        if (lessons == null || lessons.Count == 0)
        {
            _logger.LogWarning("[KaiwaImporter] No lessons found in JSON.");
            return;
        }

        int lessonOrder = 1;
        int totalQ = 0;

        foreach (var lessonJson in lessons)
        {
            var lesson = new KaiwaLesson
            {
                Title = lessonJson.LessonTitle ?? "",
                TitleVi = lessonJson.LessonTitleVi ?? "",
                JlptLevel = "N5",
                OrderIndex = lessonOrder++,
                IsActive = true
            };

            _db.KaiwaLessons.Add(lesson);
            await _db.SaveChangesAsync(); // get lesson.Id

            foreach (var qJson in lessonJson.Questions ?? [])
            {
                var question = new KaiwaQuestion
                {
                    LessonId = lesson.Id,
                    JapaneseText = qJson.Question ?? "",
                    OrderIndex = qJson.OrderIndex
                };

                _db.KaiwaQuestions.Add(question);
                await _db.SaveChangesAsync(); // get question.Id

                if (!string.IsNullOrWhiteSpace(qJson.Answer))
                {
                    var answer = new KaiwaExpectedAnswer
                    {
                        QuestionId = question.Id,
                        AnswerText = qJson.Answer,
                        IsPreferred = true
                    };
                    _db.KaiwaExpectedAnswers.Add(answer);
                }

                totalQ++;
            }

            await _db.SaveChangesAsync();
            _logger.LogInformation("[KaiwaImporter] Imported: {title} ({count} questions)", lesson.Title, lessonJson.Questions?.Count ?? 0);
        }

        _logger.LogInformation("[KaiwaImporter] Done! {lessons} lessons, {questions} questions.", lessons.Count, totalQ);
    }

    // ── DTOs for JSON deserialization ─────────────────────────────────────────
    private class KaiwaLessonJson
    {
        public string? LessonTitle { get; set; }
        public string? LessonTitleVi { get; set; }
        public List<KaiwaQuestionJson>? Questions { get; set; }
    }

    private class KaiwaQuestionJson
    {
        public int No { get; set; }
        public int OrderIndex { get; set; }
        public string? Question { get; set; }
        public string? Answer { get; set; }
    }
}
