// ============================================================
// JLPT Vocabulary Database – Loaded from generated JSON
// Source: data/vocabulary/all_vocabulary.json
// ============================================================

import type { KanjiDetail } from '../types';
// Vite + TypeScript support importing JSON without the import assertion syntax
// which TSC flags; use a dynamic require via `await import()` where necessary.
import allVocabulary from '../data/all_vocabulary.json';

export interface VocabEntry {
  id: string;
  kanji: string;
  kana: string;
  hanViet: string;
  vietnamese: string;
  level: 'N5' | 'N4' | 'N3' | 'N2' | 'N1';
  pos: string;
  tags?: string;
  lesson?: number;
  exampleSentence?: string;
  exampleTranslation?: string;
  exampleRomaji?: string;
  grammarPoint?: string;
  kanjiDetails?: KanjiDetail[];
}

interface RawVocabEntry {
  id?: string;
  kanji: string;
  kana: string;
  hanViet?: string | null;
  vietnamese: string;
  jlptLevel: 'N5' | 'N4' | 'N3' | 'N2' | 'N1';
  partOfSpeech?: string | null;
  tags?: string | null;
  sortOrder?: number | null;
  exampleSentence?: string | null;
  exampleTranslation?: string | null;
  exampleRomaji?: string | null;
  grammarPoint?: string | null;
}

const rawVocabulary = allVocabulary as RawVocabEntry[];

export const ALL_VOCAB: VocabEntry[] = rawVocabulary.map((entry, idx) => ({
  id: entry.id ?? `${entry.jlptLevel.toLowerCase()}_${String(entry.sortOrder ?? idx + 1).padStart(4, '0')}`,
  kanji: entry.kanji,
  kana: entry.kana,
  hanViet: entry.hanViet ?? '',
  vietnamese: entry.vietnamese,
  level: entry.jlptLevel,
  pos: entry.partOfSpeech ?? '',
  tags: entry.tags ?? undefined,
  lesson: entry.sortOrder ?? undefined,
  exampleSentence: entry.exampleSentence ?? undefined,
  exampleTranslation: entry.exampleTranslation ?? undefined,
  exampleRomaji: entry.exampleRomaji ?? undefined,
  grammarPoint: entry.grammarPoint ?? undefined,
}));

export const JLPT_N5: VocabEntry[] = ALL_VOCAB.filter(v => v.level === 'N5');
export const JLPT_N4: VocabEntry[] = ALL_VOCAB.filter(v => v.level === 'N4');
export const JLPT_N3: VocabEntry[] = ALL_VOCAB.filter(v => v.level === 'N3');

export function getVocabByLevel(level: 'N5' | 'N4' | 'N3' | 'N2' | 'N1' | 'all'): VocabEntry[] {
  if (level === 'all') return ALL_VOCAB;
  return ALL_VOCAB.filter(v => v.level === level);
}

export function searchVocab(query: string): VocabEntry[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];
  return ALL_VOCAB.filter(v =>
    v.kanji.includes(q) ||
    v.kana.includes(q) ||
    v.vietnamese.toLowerCase().includes(q) ||
    v.hanViet.toLowerCase().includes(q)
  );
}

export const POS_LABELS: Record<string, string> = {
  '名詞': 'Danh từ',
  '動詞': 'Động từ',
  'い形容詞': 'Tính từ い',
  'な形容詞': 'Tính từ な',
  '副詞': 'Phó từ',
  '感動詞': 'Thán từ',
  '数詞': 'Số từ',
  '代名詞': 'Đại từ',
  '接続詞': 'Liên từ',
};
