namespace JapaneseAI.Core.Entities.Kaiwa;

public class KaiwaAnswerHistory
{
    public int Id { get; set; }
    public int QuestionId { get; set; }
    public KaiwaQuestion Question { get; set; } = null!;
    public string UserAnswer { get; set; } = "";       // Câu user nói (STT text)
    public int GrammarScore { get; set; }
    public int VocabularyScore { get; set; }
    public int NaturalnessScore { get; set; }
    public int OverallScore { get; set; }
    public string Feedback { get; set; } = "";
    public string GrammarExplanation { get; set; } = "";
    public string CorrectSentence { get; set; } = "";
    public int RetryCount { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
