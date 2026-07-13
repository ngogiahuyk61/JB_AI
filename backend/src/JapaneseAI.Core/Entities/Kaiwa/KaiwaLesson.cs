namespace JapaneseAI.Core.Entities.Kaiwa;

public class KaiwaLesson
{
    public int Id { get; set; }
    public string Title { get; set; } = "";           // "第1課"
    public string TitleVi { get; set; } = "";         // "Bài 1"
    public string JlptLevel { get; set; } = "N5";
    public int OrderIndex { get; set; }
    public bool IsActive { get; set; } = true;

    public ICollection<KaiwaQuestion> Questions { get; set; } = new List<KaiwaQuestion>();
}
