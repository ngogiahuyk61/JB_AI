namespace JapaneseAI.Core.Entities.Kaiwa;

public class KaiwaExpectedAnswer
{
    public int Id { get; set; }
    public int QuestionId { get; set; }
    public KaiwaQuestion Question { get; set; } = null!;
    public string AnswerText { get; set; } = "";      // Câu trả lời mẫu từ file TXT
    public bool IsPreferred { get; set; } = true;
}
