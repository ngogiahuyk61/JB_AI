using System;
using System.Collections.Generic;

namespace JapaneseAI.Core.Entities
{
    public class Deck
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public User? User { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Source { get; set; } = "jlpt"; // excel, jlpt
        public string? JlptLevel { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public ICollection<Flashcard> Flashcards { get; set; } = new List<Flashcard>();
    }
}
