using System;

namespace JapaneseAI.Core.Entities
{
    public class Flashcard
    {
        public int Id { get; set; }
        public int DeckId { get; set; }
        public Deck? Deck { get; set; }
        public int? VocabularyId { get; set; }
        public Vocabulary? Vocabulary { get; set; }
        public string Kanji { get; set; } = string.Empty;
        public string Kana { get; set; } = string.Empty;
        public string? HanViet { get; set; }
        public string Vietnamese { get; set; } = string.Empty;
        public string Status { get; set; } = "new"; // new, learning, known
        public int StudyCount { get; set; } = 0;
        public DateTime? LastStudiedAt { get; set; }
    }
}
