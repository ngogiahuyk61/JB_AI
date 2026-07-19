export interface KanjiVocab {
  kanji: string;
  hanViet: string;
  kana: string;
  meaning: string;
}

export interface KanjiEntry {
  kanji: string;
  hanViet: string;
  onyomiKunyomi: string;
  meaning: string;
  vocab: KanjiVocab[];
}

export interface KanjiSearchResult {
  type: 'exact_kanji' | 'exact_hanviet' | 'vocab_match' | 'meaning_match';
  kanjiEntry: KanjiEntry;
  matchedVocab?: KanjiVocab[];
  score: number;
}

export const parseKanjiData = (text: string): KanjiEntry[] => {
  const entries: KanjiEntry[] = [];
  const blocks = text.split(/Ảnh \d+(?: & \d+)?: Chữ /).filter(b => b.trim() !== '');

  for (const block of blocks) {
    const lines = block.split(/\r?\n/).map(l => l.trim()).filter(l => l !== '');
    if (lines.length === 0) continue;

    // First line is something like "森 (Số 41)"
    const titleMatch = lines[0].match(/^(.*?)\s*\(Số/);
    if (!titleMatch) continue;

    const kanji = titleMatch[1].trim();
    let hanViet = '';
    let onyomiKunyomi = '';
    let meaning = '';
    const vocab: KanjiVocab[] = [];

    let isVocabSection = false;

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];

      if (line.startsWith('* Hán Việt:')) {
        hanViet = line.replace('* Hán Việt:', '').trim();
      } else if (line.startsWith('* Onyomi / Kunyomi:')) {
        onyomiKunyomi = line.replace('* Onyomi / Kunyomi:', '').trim();
      } else if (line.startsWith('* Ý nghĩa:')) {
        meaning = line.replace('* Ý nghĩa:', '').trim();
      } else if (line.startsWith('* Từ vựng đi kèm:')) {
        isVocabSection = true;
      } else if (isVocabSection && line.startsWith('*')) {
        // e.g. "* 森林: SÂM-LÂM (しんりん) - rừng rậm"
        // Regex to extract pieces
        const vLine = line.replace(/^\*\s*/, '').trim();
        const vMatch = vLine.match(/^(.*?):\s*(.*?)\s*\((.*?)\)\s*-\s*(.*)$/);
        
        if (vMatch) {
          vocab.push({
            kanji: vMatch[1].trim(),
            hanViet: vMatch[2].trim(),
            kana: vMatch[3].trim(),
            meaning: vMatch[4].trim(),
          });
        } else {
          // Fallback if no colon or slightly different format
          const parts = vLine.split('-');
          if (parts.length >= 2) {
            vocab.push({
              kanji: parts[0].trim(),
              hanViet: '',
              kana: '',
              meaning: parts.slice(1).join('-').trim()
            });
          }
        }
      }
    }

    if (kanji) {
      entries.push({ kanji, hanViet, onyomiKunyomi, meaning, vocab });
    }
  }

  return entries;
};

// Normalize string for searching (lowercase, remove accents)
const normalize = (str: string) => {
  return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
};

export const searchKanji = (query: string, data: KanjiEntry[]): KanjiSearchResult[] => {
  const q = query.trim();
  const qLower = q.toLowerCase();
  const nq = normalize(q);
  if (!q) return [];

  const hasAccents = qLower !== nq;

  const checkMatch = (text: string) => {
    if (!text) return false;
    if (hasAccents) {
      return text.toLowerCase().includes(qLower);
    } else {
      return normalize(text).includes(nq);
    }
  };

  const checkExact = (text: string) => {
    if (!text) return false;
    if (hasAccents) {
      return text.toLowerCase() === qLower;
    } else {
      return normalize(text) === nq;
    }
  };

  const results: KanjiSearchResult[] = [];

  for (const entry of data) {
    // 1. Exact Kanji Match
    if (entry.kanji === q) {
      results.push({ type: 'exact_kanji', kanjiEntry: entry, score: 100 });
      continue;
    }

    // 2. Exact Han Viet Match
    if (checkExact(entry.hanViet)) {
      results.push({ type: 'exact_hanviet', kanjiEntry: entry, score: 90 });
      continue;
    }

    // 3. Kanji Meaning Match
    if (checkMatch(entry.meaning)) {
      const meanings = entry.meaning.split(/[,\-]/).map(m => m.trim());
      const exactMeaning = meanings.some(m => hasAccents ? m.toLowerCase() === qLower : normalize(m) === nq);
      results.push({ type: 'meaning_match', kanjiEntry: entry, score: exactMeaning ? 80 : 70 });
      continue;
    }

    // 4. Vocab Match
    const matchedVocab = entry.vocab.filter(v => {
      return v.kanji === q || 
             checkExact(v.hanViet) || 
             v.kana === q || 
             checkMatch(v.meaning);
    });

    if (matchedVocab.length > 0) {
      // Determine highest relevance in vocab
      let score = 50;
      if (matchedVocab.some(v => v.kanji === q)) score = 95;
      else if (matchedVocab.some(v => checkExact(v.hanViet))) score = 85;
      else if (matchedVocab.some(v => v.kana === q)) score = 85;
      else {
        const exactMeaning = matchedVocab.some(v => {
           const meanings = v.meaning.split(/[,\-]/).map(m => m.trim());
           return meanings.some(m => hasAccents ? m.toLowerCase() === qLower : normalize(m) === nq);
        });
        if (exactMeaning) score = 85;
      }
      
      results.push({ type: 'vocab_match', kanjiEntry: entry, matchedVocab, score });
    }
  }

  // Sort by score descending
  return results.sort((a, b) => b.score - a.score);
};
