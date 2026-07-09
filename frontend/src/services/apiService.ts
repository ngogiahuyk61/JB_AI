// ============================================================
// API Service – Connects React Frontend with C# Backend Web API
// Includes automatic fallback to embedded local data if backend is offline.
// ============================================================

import { ALL_VOCAB, searchVocab, getVocabByLevel, type VocabEntry } from '../constants/jlptData';
import { API_BASE, HEALTH_URL } from '../config/api';

function isTuLayKana(kana: string): boolean {
  return /([\u3041-\u3093]{2,4})\1/.test(kana);
}

export function getSpecialCategoryVocab(category: VocabularyFilter['category'], pos?: string): VocabEntry[] {
  if (!category) return [];
  const specialItems = ALL_VOCAB.filter(v => {
    if (!v.tags) return false;
    return v.tags.split(',').map(s => s.trim().toLowerCase()).includes('special');
  });
  let filtered = specialItems;

  if (category === 'n2_bs') {
    filtered = filtered.filter(v => v.level === 'N2');
  } else if (category === 'tu_lay') {
    filtered = filtered.filter(v => v.level === 'N3' && isTuLayKana(v.kana));
  } else if (category === 'luong_tu') {
    filtered = filtered.filter(v => v.level === 'N3' && !isTuLayKana(v.kana));
  } else {
    return [];
  }

  return pos ? filtered.filter(v => v.pos === pos) : filtered;
}

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
    tags: (v.tags as string) ?? undefined,
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
  tags?: string;
  category?: 'n2_bs' | 'tu_lay' | 'luong_tu';
  limit?: number;
  offset?: number;
}

export interface VocabStats {
  N5?: number;
  N4?: number;
  N3?: number;
  N2?: number;
  N1?: number;
  n2_bs?: number;
  tu_lay?: number;
  luong_tu?: number;
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
      if (filters.category) {
        const items = getSpecialCategoryVocab(filters.category, filters.pos);
        const offset = filters.offset ?? 0;
        const limit = filters.limit ?? 100;
        return items.slice(offset, offset + limit);
      }
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
      if (filters.tags) params.append('tags', filters.tags);
      if (filters.category) params.append('category', filters.category);
      if (filters.limit) params.append('limit', String(filters.limit));
      if (filters.offset) params.append('offset', String(filters.offset));

      const res = await fetch(`${API_BASE}/vocabulary?${params.toString()}`);
      if (!res.ok) throw new Error('API Error');
      
      const data = await res.json();
      return data.map((v: Record<string, unknown>) => mapVocabEntry(v));
    } catch (err) {
      console.error('Error fetching from backend API:', err);
      // Fallback
      if (filters.category) {
        const items = getSpecialCategoryVocab(filters.category, filters.pos);
        const offset = filters.offset ?? 0;
        const limit = filters.limit ?? 100;
        return items.slice(offset, offset + limit);
      }
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
  getStats: async (): Promise<VocabStats> => {
    await checkBackendHealth();

    if (!isBackendOnline) {
      const n3Words = ALL_VOCAB.filter(v => v.level === 'N3');
      const n2Bs = ALL_VOCAB.filter(v => v.level === 'N2' && v.tags && v.tags.split(',').map(s => s.trim().toLowerCase()).includes('special')).length;
      const tuLayCount = ALL_VOCAB.filter(v => v.level === 'N3' && v.tags && v.tags.split(',').map(s => s.trim().toLowerCase()).includes('special') && isTuLayKana(v.kana)).length;
      const luongTuCount = ALL_VOCAB.filter(v => v.level === 'N3' && v.tags && v.tags.split(',').map(s => s.trim().toLowerCase()).includes('special') && !isTuLayKana(v.kana)).length;
      return {
        N5: ALL_VOCAB.filter(v => v.level === 'N5').length,
        N4: ALL_VOCAB.filter(v => v.level === 'N4').length,
        N3: n3Words.length,
        N2: ALL_VOCAB.filter(v => v.level === 'N2').length,
        N1: ALL_VOCAB.filter(v => v.level === 'N1').length,
        n2_bs: n2Bs,
        tu_lay: tuLayCount,
        luong_tu: luongTuCount,
      };
    }

    try {
      const res = await fetch(`${API_BASE}/vocabulary/stats`);
      if (!res.ok) throw new Error('API Error');
      const data = await res.json();

      const stats: VocabStats = {};
      if (Array.isArray(data)) {
        data.forEach((item: { level: string; count: number }) => {
          stats[item.level as keyof VocabStats] = item.count;
        });
      } else {
        (data.levels ?? []).forEach((item: { level: string; count: number }) => {
          stats[item.level as keyof VocabStats] = item.count;
        });
        if (data.special) {
          stats.n2_bs = data.special.n2_bs ?? 0;
          stats.tu_lay = data.special.tu_lay ?? 0;
          stats.luong_tu = data.special.luong_tu ?? 0;
        }
      }
      return stats;
    } catch (err) {
      console.error('Error fetching stats from API:', err);
      return {
        N5: ALL_VOCAB.filter(v => v.level === 'N5').length,
        N4: ALL_VOCAB.filter(v => v.level === 'N4').length,
        N3: ALL_VOCAB.filter(v => v.level === 'N3').length,
        N2: ALL_VOCAB.filter(v => v.level === 'N2').length,
        N1: ALL_VOCAB.filter(v => v.level === 'N1').length,
        n2_bs: 0,
        tu_lay: 0,
        luong_tu: 0,
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
