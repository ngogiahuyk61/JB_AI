import minnaData from '../data/minnaN5Grammar.json';

export interface MinnaVocabEntry {
  id: number;
  kanji: string;
  kana: string;
  hanViet: string;
  meaning: string;
  pos: string;
  exampleJa: string;
  exampleVi: string;
  grammarPoint: string;
  lessonNumber: number;
  patternKey: string;
}

export const minnaDataService = {
  /**
   * Trả về toàn bộ danh sách từ vựng Minna N5.
   */
  getAll: (): MinnaVocabEntry[] => {
    return minnaData as MinnaVocabEntry[];
  },

  /**
   * Lấy ngẫu nhiên một từ vựng Minna N5 có kèm ví dụ.
   */
  getRandomEntryWithExample: (): MinnaVocabEntry => {
    const valid = minnaData.filter(e => e.exampleJa && e.exampleJa.trim());
    if (valid.length === 0) {
      // Fallback
      return minnaData[0] as MinnaVocabEntry;
    }
    const idx = Math.floor(Math.random() * valid.length);
    return valid[idx] as MinnaVocabEntry;
  },

  /**
   * Lấy danh sách ví dụ theo điểm ngữ pháp.
   */
  getExamplesByGrammarPoint: (grammarPoint: string, maxCount = 3): MinnaVocabEntry[] => {
    const matches = minnaData.filter(
      e => e.grammarPoint && e.grammarPoint.toLowerCase() === grammarPoint.toLowerCase()
    );
    return (matches.length > 0 ? matches : minnaData.filter(e => e.exampleJa)).slice(0, maxCount) as MinnaVocabEntry[];
  },

  /**
   * Tìm kiếm điểm ngữ pháp dựa trên câu trả lời của người dùng.
   * Quét các Hán tự hoặc Hiragana đặc trưng của từ vựng N5 để match với ngữ pháp tương ứng.
   */
  findRelatedGrammarPoint: (userText: string): MinnaVocabEntry | null => {
    if (!userText) return null;
    const cleanedText = userText.trim();
    
    // Tìm các từ vựng xuất hiện trong câu sai của user
    const matches = minnaData.filter(e => {
      if (!e.grammarPoint) return false;
      const hasKanji = e.kanji && e.kanji.length > 0 && cleanedText.includes(e.kanji);
      const hasKana = e.kana && e.kana.length > 1 && cleanedText.includes(e.kana); // Tránh match từ 1 ký tự kana
      return hasKanji || hasKana;
    });

    if (matches.length > 0) {
      // Chọn ngẫu nhiên một từ vựng trùng khớp để lấy điểm ngữ pháp
      return matches[Math.floor(Math.random() * matches.length)] as MinnaVocabEntry;
    }
    
    return null;
  }
};
