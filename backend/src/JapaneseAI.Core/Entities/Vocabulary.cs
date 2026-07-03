using System;
using System.ComponentModel.DataAnnotations.Schema;

namespace JapaneseAI.Core.Entities
{
    public class Vocabulary
    {
        public int Id { get; set; }
        public string Kanji { get; set; } = string.Empty;
        public string Kana { get; set; } = string.Empty;
        public string? HanViet { get; set; }
        public string Vietnamese { get; set; } = string.Empty;
        public string JlptLevel { get; set; } = "N5"; // N5, N4, N3, N2, N1
        public string? PartOfSpeech { get; set; }    // N, V, A, Na, Adv, Int, Num
        public string? Tags { get; set; }            // N2 BS, Từ láy, Lượng từ
        public int? SortOrder { get; set; }
        
        // Cập nhật: Trường phục vụ hiển thị câu ví dụ
        public string? ExampleSentence { get; set; }
        public string? ExampleTranslation { get; set; }
        public string? ExampleRomaji { get; set; }

        [NotMapped]
        public System.Collections.Generic.List<KanjiDictionary>? KanjiDetails { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }

}
