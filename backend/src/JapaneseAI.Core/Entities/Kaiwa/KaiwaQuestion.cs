namespace JapaneseAI.Core.Entities.Kaiwa;

public class KaiwaQuestion
{
    public int Id { get; set; }
    public int LessonId { get; set; }
    public KaiwaLesson Lesson { get; set; } = null!;
    public string JapaneseText { get; set; } = "";    // Câu hỏi tiếng Nhật
    public int OrderIndex { get; set; }

    public ICollection<KaiwaExpectedAnswer> ExpectedAnswers { get; set; } = new List<KaiwaExpectedAnswer>();
    public ICollection<KaiwaAnswerHistory> History { get; set; } = new List<KaiwaAnswerHistory>();
}
