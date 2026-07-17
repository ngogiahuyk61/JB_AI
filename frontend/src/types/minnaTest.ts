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
