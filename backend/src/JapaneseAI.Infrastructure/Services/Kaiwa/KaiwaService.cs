using JapaneseAI.Core.Entities.Kaiwa;
using JapaneseAI.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace JapaneseAI.Infrastructure.Services.Kaiwa;

public class KaiwaService
{
    private readonly AppDbContext _db;
    private readonly ILogger<KaiwaService> _logger;
    private static readonly Random _rng = new();

    public KaiwaService(AppDbContext db, ILogger<KaiwaService> logger)
    {
        _db = db;
        _logger = logger;
    }

    // ── DTOs ──────────────────────────────────────────────────────────────────

    public record LessonDto(int Id, string Title, string TitleVi, int QuestionCount, int OrderIndex);

    public record QuestionDto(int Id, int LessonId, string LessonTitle, string JapaneseText, int OrderIndex, int TotalInLesson);

    public record QuestionWithAnswerDto(
        int Id,
        int LessonId,
        string LessonTitle,
        string JapaneseText,
        int OrderIndex,
        int TotalInLesson,
        string ExpectedAnswer
    );

    // ── Methods ───────────────────────────────────────────────────────────────

    public async Task<List<LessonDto>> GetLessonsAsync()
    {
        return await _db.KaiwaLessons
            .Where(l => l.IsActive)
            .OrderBy(l => l.OrderIndex)
            .Select(l => new LessonDto(
                l.Id,
                l.Title,
                l.TitleVi,
                l.Questions.Count,
                l.OrderIndex
            ))
            .ToListAsync();
    }

    /// <summary>
    /// Lấy câu hỏi tiếp theo theo mode:
    /// - "random": random toàn bộ, không lặp các id đã làm
    /// - "lesson": theo lessonId, câu tiếp theo afterQuestionId (null = câu đầu)
    /// - "intro": chỉ bài 自己紹介
    /// - "summary": chỉ bài 会話まとめ
    /// </summary>
    public async Task<QuestionDto?> GetNextQuestionAsync(
        string mode,
        int? lessonId = null,
        int? afterQuestionId = null,
        List<int>? excludeIds = null)
    {
        IQueryable<KaiwaQuestion> query = _db.KaiwaQuestions
            .Include(q => q.Lesson)
            .Where(q => q.Lesson.IsActive);

        switch (mode.ToLower())
        {
            case "intro":
                query = query.Where(q => q.Lesson.Title.Contains("自己紹介"));
                break;

            case "summary":
                query = query.Where(q => q.Lesson.Title.Contains("まとめ"));
                break;

            case "lesson":
                if (lessonId.HasValue)
                    query = query.Where(q => q.LessonId == lessonId.Value);
                break;

            case "random":
            default:
                break;
        }

        // Loại trừ các câu đã làm trong session
        if (excludeIds?.Count > 0)
            query = query.Where(q => !excludeIds.Contains(q.Id));

        // Nếu có afterQuestionId → lấy câu tiếp theo trong bài
        if (afterQuestionId.HasValue && mode != "random")
        {
            var current = await _db.KaiwaQuestions.FindAsync(afterQuestionId.Value);
            if (current != null)
            {
                query = query.Where(q =>
                    q.LessonId == current.LessonId &&
                    q.OrderIndex > current.OrderIndex);
            }
        }

        List<KaiwaQuestion> candidates;

        if (mode == "random")
        {
            // Random: lấy tất cả id rồi pick ngẫu nhiên
            var ids = await query.Select(q => q.Id).ToListAsync();
            if (!ids.Any()) return null;
            var pickedId = ids[_rng.Next(ids.Count)];
            var picked = await _db.KaiwaQuestions
                .Include(q => q.Lesson)
                .FirstAsync(q => q.Id == pickedId);
            candidates = [picked];
        }
        else
        {
            // Ordered mode: lấy câu kế tiếp theo OrderIndex
            candidates = await query
                .OrderBy(q => q.Lesson.OrderIndex)
                .ThenBy(q => q.OrderIndex)
                .Take(1)
                .ToListAsync();
        }

        if (!candidates.Any()) return null;

        var q2 = candidates[0];
        var totalInLesson = await _db.KaiwaQuestions
            .CountAsync(x => x.LessonId == q2.LessonId);

        return new QuestionDto(
            q2.Id,
            q2.LessonId,
            q2.Lesson.Title,
            q2.JapaneseText,
            q2.OrderIndex,
            totalInLesson
        );
    }

    public async Task<QuestionWithAnswerDto?> GetQuestionWithAnswerAsync(int questionId)
    {
        var q = await _db.KaiwaQuestions
            .Include(q => q.Lesson)
            .Include(q => q.ExpectedAnswers)
            .FirstOrDefaultAsync(q => q.Id == questionId);

        if (q == null) return null;

        var preferred = q.ExpectedAnswers
            .FirstOrDefault(a => a.IsPreferred)
            ?? q.ExpectedAnswers.FirstOrDefault();

        var totalInLesson = await _db.KaiwaQuestions
            .CountAsync(x => x.LessonId == q.LessonId);

        return new QuestionWithAnswerDto(
            q.Id,
            q.LessonId,
            q.Lesson.Title,
            q.JapaneseText,
            q.OrderIndex,
            totalInLesson,
            preferred?.AnswerText ?? ""
        );
    }

    public async Task<KaiwaAnswerHistory> SaveHistoryAsync(KaiwaAnswerHistory history)
    {
        _db.KaiwaAnswerHistories.Add(history);
        await _db.SaveChangesAsync();
        return history;
    }
}
