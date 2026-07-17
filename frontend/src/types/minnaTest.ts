export interface TableQuestion {
  id: string;
  word: string; // The base word provided (e.g. jisho form, or kanji)
  reading: string; // Furigana or reading hint
  answer: string; // The correct conjugated form
  explanation: string; // Why it conjugates this way
}

export interface FillBlankQuestion {
  id: string;
  sentence: string; // Sentence with "[_]" for the blank
  hintWord: string; // Word to be conjugated or used (e.g. "食べる", "で")
  answer: string; // The text that should go in the blank
  explanation: string;
}

export interface MultipleChoiceQuestion {
  id: string;
  questionText: string;
  choices: string[];
  correctAnswer: string;
  explanation: string;
}

export interface StarQuestion {
  id: string;
  questionText: string; // e.g. "わたしは ＿＿ ＿＿ ＊ ＿＿ 。"
  choices: string[];
  correctAnswer: string;
  explanation: string;
}

export interface ReadingQuestion {
  id: string;
  passage: string; // 2 paragraphs text
  translation: string;
  questions: {
    questionText: string;
    answer: string; // The expected user answer
    explanation: string;
  }[];
}

export interface MinnaTestResult {
  lesson: number;
  grammarFocus: string;
  part1: {
    title: string;
    questions: TableQuestion[];
  };
  part2: {
    title: string;
    questions: FillBlankQuestion[];
  };
  part3: {
    title: string;
    questions: MultipleChoiceQuestion[];
  };
  part4: {
    title: string;
    starQuestions: StarQuestion[];
    reading: ReadingQuestion;
  };
}

// ----------------------------------------
// VOCAB TEST
// ----------------------------------------
export interface MinnaVocabWord {
  id: string;
  vi: string; // Vietnamese meaning
  ja: string; // Correct Hiragana/Katakana
  kanji: string; // Kanji (if any), could be empty
  explanation: string;
}

export interface MinnaVocabTestResult {
  lesson: number;
  title: string;
  words: MinnaVocabWord[];
}

// ----------------------------------------
// KANJI TEST
// ----------------------------------------
export interface MinnaKanjiTestResult {
  lesson: number;
  title: string;
  part1: {
    title: string; // e.g. Chọn Kanji đúng cho từ Hiragana
    questions: MultipleChoiceQuestion[]; // 4 questions
  };
  part2: {
    title: string; // e.g. Chọn Hiragana đúng cho chữ Kanji
    questions: MultipleChoiceQuestion[]; // 4 questions
  };
  part3: {
    title: string; // e.g. Nhập Hiragana cho chữ Kanji trong câu
    questions: {
      id: string;
      sentence: string; // Câu tiếng Nhật chứa chữ Kanji cần đọc, ví dụ: 私は[学校]へ行きます。
      kanjiWord: string; // Chữ Kanji cần hỏi, ví dụ: 学校
      vietnamese: string; // Nghĩa tiếng Việt của câu hoặc từ đó
      answer: string; // Hiragana đáp án, ví dụ: がっこう
      explanation: string;
    }[];
  };
}

// ----------------------------------------
// READING TEST
// ----------------------------------------
export interface MinnaReadingTestResult {
  lesson: number;
  title: string;
  passage: string;
  translation: string;
  questions: MultipleChoiceQuestion[];
}

// ----------------------------------------
// LISTENING TEST
// ----------------------------------------
export interface MinnaListeningTestResult {
  lesson: number;
  title: string;
  script: string; // The script that the AI will read out loud (hidden from user initially)
  translation: string;
  questions: MultipleChoiceQuestion[];
}
