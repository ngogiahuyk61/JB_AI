using System;

namespace JapaneseAI.Core.Entities
{
    public class KanjiDictionary
    {
        public int Id { get; set; }
        
        /// <summary>
        /// Ký tự Hán (VD: "学")
        /// </summary>
        public string Character { get; set; } = string.Empty;

        /// <summary>
        /// Âm On (VD: "ガク")
        /// </summary>
        public string? Onyomi { get; set; }

        /// <summary>
        /// Âm Kun (VD: "まな.ぶ")
        /// </summary>
        public string? Kunyomi { get; set; }

        /// <summary>
        /// Nghĩa tiếng Việt (VD: "Học, học sinh")
        /// </summary>
        public string? Meaning { get; set; }

        /// <summary>
        /// Nghĩa Hán Việt (VD: "Học")
        /// </summary>
        public string? HanViet { get; set; }

        /// <summary>
        /// Số nét viết
        /// </summary>
        public int? StrokeCount { get; set; }

        /// <summary>
        /// Bộ thủ
        /// </summary>
        public string? Radical { get; set; }

        /// <summary>
        /// JLPT Level (VD: "N5")
        /// </summary>
        public string? JlptLevel { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
