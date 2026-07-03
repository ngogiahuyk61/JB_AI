// ============================================================
// JapaneseAI – Type Definitions
// ============================================================

export type JlptLevel = 'N5' | 'N4' | 'N3' | 'N2' | 'N1';
export type CardStatus = 'new' | 'learning' | 'known';
export type MessageRole = 'user' | 'ai';

// ── Vocabulary ──────────────────────────────────────────────
export interface Vocabulary {
  id: string;
  kanji: string;       // 電車
  kana: string;        // でんしゃ
  hanViet: string;     // ĐIỆN XA
  vietnamese: string;  // xe điện / tàu điện
  jlptLevel: JlptLevel;
  partOfSpeech?: string;
  exampleSentence?: string;
  exampleTranslation?: string;
  exampleRomaji?: string;
  kanjiDetails?: KanjiDetail[];
}

export interface KanjiDetail {
  id: number;
  character: string;
  onyomi?: string;
  kunyomi?: string;
  meaning?: string;
  hanViet?: string;
  strokeCount?: number;
  radical?: string;
  jlptLevel?: string;
}

// ── Kanji ───────────────────────────────────────────────────
export interface KanjiInfo {
  character: string;   // 電
  hanViet: string;     // ĐIỆN
  onReading: string;   // デン
  kunReading: string;  // いなずま
  meaning: string;     // điện, sấm sét
  radical: string;     // 雨 (mưa)
  strokeCount: number;
  jlptLevel: JlptLevel;
}

export interface KanjiAnalysisResult {
  word: string;
  fullHanViet: string;
  components: KanjiInfo[];
}

// ── Flashcard / Deck ─────────────────────────────────────────
export interface FlashCard {
  id: string;
  kanji: string;
  kana: string;
  hanViet: string;
  vietnamese: string;
  status?: CardStatus;
}

export interface Deck {
  id: string;
  name: string;         // tên sheet hoặc deck
  cards: FlashCard[];
  source: 'excel' | 'db';  // từ file upload hay từ DB
}

export interface ExcelSheetData {
  [sheetName: string]: FlashCard[];
}

// ── Quiz / Exam ───────────────────────────────────────────────
export interface QuizOption {
  label: string;   // A, B, C, D
  value: string;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;  // index 0-3
  explanationVi?: string;
  type: 'fill-blank' | 'reading' | 'meaning' | 'grammar';
}

export interface ExamResult {
  questionId: string;
  selectedAnswer: number;
  isCorrect: boolean;
  timeSpent: number; // ms
}

// ── AI Chat ──────────────────────────────────────────────────
export interface ChatMessage {
  id: string;
  role: MessageRole;
  text: string;
  timestamp: Date;
  isLoading?: boolean;
}

export interface AIResponse {
  text: string;
  hasJapanese: boolean;
  corrections?: string;
}

// ── Dashboard ─────────────────────────────────────────────────
export interface UserStats {
  wordsLearned: number;
  streak: number;
  jlptLevel: JlptLevel;
  progress: number;       // 0-100
  totalCards: number;
  knownCards: number;
  learningCards: number;
  todayStudied: number;
  weeklyData: number[];   // 7 ngày gần nhất
}

// ── API Response ──────────────────────────────────────────────
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  errors?: string[];
}

// ── Speech ────────────────────────────────────────────────────
export interface SpeechConfig {
  lang: string;          // 'ja-JP' | 'vi-VN'
  rate?: number;         // 0.1 - 10
  pitch?: number;        // 0 - 2
  volume?: number;       // 0 - 1
}

// ── Navigation ────────────────────────────────────────────────
export interface NavItemConfig {
  icon: React.ReactNode;
  label: string;
  path: string;
  badge?: string;        // "Mới" | "Beta" | "Đang phát triển"
  badgeColor?: string;
}
