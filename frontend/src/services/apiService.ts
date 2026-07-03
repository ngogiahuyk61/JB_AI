// ============================================================
// API Service – Connects React Frontend with C# Backend Web API
// Includes automatic fallback to embedded local data if backend is offline.
// ============================================================

import { ALL_VOCAB, searchVocab, getVocabByLevel, type VocabEntry } from '../constants/jlptData';
import { API_BASE, HEALTH_URL } from '../config/api';

function mapVocabEntry(v: Record<string, unknown>): VocabEntry {
  const kanjiDetails = Array.isArray(v.kanjiDetails)
    ? v.kanjiDetails.map((kd: Record<string, unknown>) => ({
        id: kd.id as number,
        character: kd.character as string,
        onyomi: kd.onyomi as string | undefined,
        kunyomi: kd.kunyomi as string | undefined,
        meaning: kd.meaning as string | undefined,
        hanViet: kd.hanViet as string | undefined,
        strokeCount: kd.strokeCount as number | undefined,
        radical: kd.radical as string | undefined,
        jlptLevel: kd.jlptLevel as string | undefined,
      }))
    : undefined;

  return {
    id: String(v.id),
    kanji: v.kanji as string,
    kana: v.kana as string,
    hanViet: (v.hanViet as string) ?? '',
    vietnamese: v.vietnamese as string,
    level: v.jlptLevel as VocabEntry['level'],
    pos: (v.partOfSpeech as string) ?? '名詞',
    lesson: v.sortOrder as number | undefined,
    exampleSentence: v.exampleSentence as string | undefined,
    exampleTranslation: v.exampleTranslation as string | undefined,
    exampleRomaji: v.exampleRomaji as string | undefined,
    kanjiDetails,
  };
}

export interface VocabularyFilter {
  level?: string;
  pos?: string;
  limit?: number;
  offset?: number;
}

// Keep track of backend online status
let isBackendOnline = false;

// Check if backend is alive
export async function checkBackendHealth(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1500);

    const res = await fetch(HEALTH_URL, {
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    
    isBackendOnline = res.ok;
    return isBackendOnline;
  } catch {
    isBackendOnline = false;
    return false;
  }
}

// Initial health check
checkBackendHealth();

export const apiService = {
  isOnline: () => isBackendOnline,
  checkHealth: checkBackendHealth,

  // Get vocabulary items
  getVocabulary: async (filters: VocabularyFilter): Promise<VocabEntry[]> => {
    // If we haven't done a health check, do one
    await checkBackendHealth();

    if (!isBackendOnline) {
      console.log('🔌 Backend offline, using local embedded JLPT database.');
      // Local fallback
      const level = filters.level as 'N5' | 'N4' | 'N3' | 'all' || 'all';
      let items = getVocabByLevel(level);
      if (filters.pos) {
        items = items.filter(v => v.pos === filters.pos);
      }
      const offset = filters.offset ?? 0;
      const limit = filters.limit ?? 100;
      return items.slice(offset, offset + limit);
    }

    try {
      const params = new URLSearchParams();
      if (filters.level && filters.level !== 'all') params.append('level', filters.level);
      if (filters.pos) params.append('pos', filters.pos);
      if (filters.limit) params.append('limit', String(filters.limit));
      if (filters.offset) params.append('offset', String(filters.offset));

      const res = await fetch(`${API_BASE}/vocabulary?${params.toString()}`);
      if (!res.ok) throw new Error('API Error');
      
      const data = await res.json();
      return data.map((v: Record<string, unknown>) => mapVocabEntry(v));
    } catch (err) {
      console.error('Error fetching from backend API:', err);
      // Fallback
      const level = filters.level as 'N5' | 'N4' | 'N3' | 'all' || 'all';
      return getVocabByLevel(level).slice(filters.offset ?? 0, (filters.offset ?? 0) + (filters.limit ?? 100));
    }
  },

  // Search vocabulary
  searchVocabulary: async (query: string, limit = 100): Promise<VocabEntry[]> => {
    if (!query.trim()) return [];

    await checkBackendHealth();

    if (!isBackendOnline) {
      return searchVocab(query).slice(0, limit);
    }

    try {
      const res = await fetch(`${API_BASE}/vocabulary/search?q=${encodeURIComponent(query)}&limit=${limit}`);
      if (!res.ok) throw new Error('API Error');
      
      const data = await res.json();
      return data.map((v: Record<string, unknown>) => mapVocabEntry(v));
    } catch (err) {
      console.error('Error searching from backend API:', err);
      return searchVocab(query).slice(0, limit);
    }
  },

  // Get single vocabulary by ID (includes KanjiDetails)
  getVocabularyById: async (id: string): Promise<VocabEntry | null> => {
    if (!isBackendOnline) return null;

    try {
      const res = await fetch(`${API_BASE}/vocabulary/${id}`);
      if (!res.ok) return null;
      const v = await res.json();
      return mapVocabEntry(v);
    } catch (err) {
      console.error('Error fetching vocabulary by id:', err);
      return null;
    }
  },

  // Get level stats
  getStats: async (): Promise<Record<string, number>> => {
    await checkBackendHealth();

    if (!isBackendOnline) {
      return {
        N5: ALL_VOCAB.filter(v => v.level === 'N5').length,
        N4: ALL_VOCAB.filter(v => v.level === 'N4').length,
        N3: ALL_VOCAB.filter(v => v.level === 'N3').length,
        N2: ALL_VOCAB.filter(v => v.level === 'N2').length,
        N1: ALL_VOCAB.filter(v => v.level === 'N1').length,
      };
    }

    try {
      const res = await fetch(`${API_BASE}/vocabulary/stats`);
      if (!res.ok) throw new Error('API Error');
      const data = await res.json();
      
      const stats: Record<string, number> = {};
      data.forEach((item: any) => {
        stats[item.level] = item.count;
      });
      return stats;
    } catch (err) {
      console.error('Error fetching stats from API:', err);
      return {
        N5: ALL_VOCAB.filter(v => v.level === 'N5').length,
        N4: ALL_VOCAB.filter(v => v.level === 'N4').length,
        N3: ALL_VOCAB.filter(v => v.level === 'N3').length,
        N2: ALL_VOCAB.filter(v => v.level === 'N2').length,
        N1: ALL_VOCAB.filter(v => v.level === 'N1').length,
      };
    }
  },

  analyzeKanji: async (word: string) => {
    await checkBackendHealth();
    if (!isBackendOnline) return null;

    try {
      const res = await fetch(`${API_BASE}/kanji/analyze?word=${encodeURIComponent(word)}`);
      if (!res.ok) return null;
      const data = await res.json();
      return data.components as Array<{
        character: string;
        onyomi?: string;
        kunyomi?: string;
        meaning?: string;
        hanViet?: string;
        strokeCount?: number;
        radical?: string;
      }>;
    } catch {
      return null;
    }
  }
};
