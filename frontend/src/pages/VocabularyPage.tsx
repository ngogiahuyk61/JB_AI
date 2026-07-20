import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  Search, Volume2, BookOpen, Filter, X, ChevronDown, Play,
  Pause, Square, SkipForward, Zap, Server
} from 'lucide-react';
import { ALL_VOCAB, POS_LABELS, type VocabEntry } from '../constants/jlptData';
import { SPECIAL_CATEGORIES, type SpecialCategory } from '../constants/specialCategories';
import { N5_LESSONS, type LessonDefinition } from '../constants/lessonData';
import { speechService, autoReadWords, cancelAutoRead, pauseAutoRead, resumeAutoRead } from '../services/speechService';
import { analyzeWord } from '../constants/kanjiDB';
import { apiService, getSpecialCategoryVocab } from '../services/apiService';
import { useDeviceLayout } from '../hooks/useDeviceLayout';

type LevelFilter = 'all' | 'N5' | 'N4' | 'N3' | 'N2' | 'N1';
type CategoryFilter = 'all' | SpecialCategory;

interface VocabularyPageProps {
  onNavigate?: (tab: string) => void;
}

const LEVEL_COLORS: Record<string, { bg: string; text: string; border: string; gradient: string }> = {
  N5: { bg: '#f0fdf4', text: '#166534', border: '#86efac', gradient: '#22c55e' },
  N4: { bg: '#eff6ff', text: '#1d4ed8', border: '#93c5fd', gradient: '#3b82f6' },
  N3: { bg: '#faf5ff', text: '#6b21a8', border: '#c4b5fd', gradient: '#a855f7' },
  N2: { bg: '#fff7ed', text: '#9a3412', border: '#fdba74', gradient: '#f97316' },
  N1: { bg: '#fef2f2', text: '#991b1b', border: '#fca5a5', gradient: '#ef4444' },
};

const POS_COLORS: Record<string, string> = {
  '名詞': '#4f46e5', '動詞': '#dc2626', 'い形容詞': '#ea580c',
  'な形容詞': '#d97706', '副詞': '#0891b2', '感動詞': '#7c3aed',
  '数詞': '#059669', '代名詞': '#0891b2', '接続詞': '#6366f1',
};

type AutoReadState = 'idle' | 'playing' | 'paused';

type KanjiDetailView = {
  char: string;
  hanViet: string;
  meaning: string;
  onReading: string;
  kunReading: string;
  radical: string;
  strokeCount: number;
};

export default function VocabularyPage({ onNavigate }: VocabularyPageProps) {
  const deviceLayout = useDeviceLayout();
  const isMobile = deviceLayout === 'mobile';
  const [levelFilter, setLevelFilter] = useState<LevelFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [lessonFilter, setLessonFilter] = useState<number | null>(null);
  const [posFilter, setPosFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWord, setSelectedWord] = useState<VocabEntry | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [speakingId, setSpeakingId] = useState<string | null>(null);

  // Dynamic API states
  const [vocabList, setVocabList] = useState<VocabEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [dbOnline, setDbOnline] = useState(false);
  const [stats, setStats] = useState({ n5: 728, n4: 968, n3: 821, n2: 0, n1: 0, n2_bs: 0, tu_lay: 0, luong_tu: 0 });

  // Auto-read state
  const [showAutoRead, setShowAutoRead] = useState(false);
  const [autoReadLevels, setAutoReadLevels] = useState<Set<string>>(new Set(['N5']));
  const [autoReadLessons, setAutoReadLessons] = useState<Set<number>>(new Set());
  const [autoReadMode] = useState<'sequential' | 'random'>('sequential');
  const [autoReadDelay] = useState(3000); // ms
  const [autoReadState, setAutoReadState] = useState<AutoReadState>('idle');
  const [autoReadIndex, setAutoReadIndex] = useState(0);
  const [speechRate, setSpeechRate] = useState(1.0);
  const autoReadWordsRef = useRef<VocabEntry[]>([]);

  // Seek bar state
  const seekBarRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const isDraggingRef = useRef(false);

  // Sync speech rate with service
  useEffect(() => {
    speechService.setRate(speechRate);
  }, [speechRate]);

  // Check DB status & load stats on load
  useEffect(() => {
    const init = async () => {
      const isOnline = await apiService.checkHealth();
      setDbOnline(isOnline);
      try {
        const apiStats = await apiService.getStats();
        setStats({
          n5: apiStats.N5 ?? stats.n5,
          n4: apiStats.N4 ?? stats.n4,
          n3: apiStats.N3 ?? stats.n3,
          n2: apiStats.N2 ?? 0,
          n1: apiStats.N1 ?? 0,
          n2_bs: apiStats.n2_bs ?? 0,
          tu_lay: apiStats.tu_lay ?? 0,
          luong_tu: apiStats.luong_tu ?? 0,
        });
      } catch {}
    };
    init();
  }, []);

  // Fetch vocabulary dynamically based on filters
  useEffect(() => {
    let active = true;
    const fetchVocab = async () => {
      setLoading(true);
      try {
        let data: VocabEntry[];
        if (searchQuery.trim()) {
          data = await apiService.searchVocabulary(searchQuery);
        } else {
          data = await apiService.getVocabulary({
            level: categoryFilter !== 'all' ? undefined : levelFilter,
            pos: posFilter,
            category: categoryFilter !== 'all' ? categoryFilter : undefined,
            limit: 1000
          });
        }
        if (active) {
          // If searching, we don't apply posFilter on frontend since C# backend handled it or fallback does it
          if (searchQuery.trim() && posFilter) {
            data = data.filter(v => v.pos === posFilter);
          }
          // Apply lesson filter client-side if a lesson is selected
          if (lessonFilter !== null && levelFilter === 'N5') {
            const lessonDef = N5_LESSONS.find(l => l.lessonNum === lessonFilter);
            if (lessonDef) {
              data = data.filter(v => {
                if (!v.stt) return false;
                return lessonDef.sttRanges.some(([min, max]) => v.stt! >= min && v.stt! <= max);
              });
            }
          }
          setVocabList(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchVocab();
    return () => { active = false; };
  }, [levelFilter, categoryFilter, posFilter, searchQuery, lessonFilter, dbOnline]);

  // Words for auto-read (always pull from local ALL_VOCAB to get all items regardless of pagination)
  const autoReadWordList = useMemo(() => {
    if (autoReadLevels.size === 0) return [];
    
    // N5-N1 core items
    const selectedJlpt = ['N5', 'N4', 'N3', 'N2', 'N1'].filter(l => autoReadLevels.has(l));
    let list = ALL_VOCAB.filter(v => selectedJlpt.includes(v.level));
    
    // Apply lesson filter for N5 if specific lessons are selected in auto-read
    if (autoReadLevels.has('N5') && autoReadLessons.size > 0) {
      // Keep all non-N5 items + N5 items that match selected lessons
      list = list.filter(v => {
        if (v.level !== 'N5') return true;
        if (!v.stt) return false;
        
        // Check if the vocab's STT falls into any of the selected lesson ranges
        return Array.from(autoReadLessons).some(lessonNum => {
          const def = N5_LESSONS.find(l => l.lessonNum === lessonNum);
          return def ? def.sttRanges.some(([min, max]) => v.stt! >= min && v.stt! <= max) : false;
        });
      });
    }

    // Special categories
    if (autoReadLevels.has('n2_bs')) list = [...list, ...getSpecialCategoryVocab('n2_bs')];
    if (autoReadLevels.has('tu_lay')) list = [...list, ...getSpecialCategoryVocab('tu_lay')];
    if (autoReadLevels.has('luong_tu')) list = [...list, ...getSpecialCategoryVocab('luong_tu')];

    if (autoReadMode === 'random') {
      list = [...list].sort(() => Math.random() - 0.5);
    }
    return list;
  }, [autoReadLevels, autoReadLessons, autoReadMode]);

  const availablePos = useMemo(() => {
    return Object.keys(POS_LABELS);
  }, []);

  const currentAutoWord = autoReadWordsRef.current[autoReadIndex];

  // ── Fetch detail of a single word (includes KanjiDetails from DB) ──
  const handleSelectWord = useCallback(async (word: VocabEntry) => {
    if (selectedWord?.id === word.id) {
      setSelectedWord(null);
      return;
    }
    setSelectedWord(word); // show immediately with local data
    if (dbOnline && !isNaN(Number(word.id))) {
      setDetailLoading(true);
      try {
        const detail = await apiService.getVocabularyById(word.id);
        if (detail) setSelectedWord(detail);
      } finally {
        setDetailLoading(false);
      }
    }
  }, [selectedWord, dbOnline]);

  // ── Speak single word ──
  const handleSpeak = useCallback(async (word: VocabEntry, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSpeakingId(word.id);
    try {
      await speechService.speakFlashcard(word.kana, word.vietnamese, word.hanViet);
    } finally {
      setSpeakingId(null);
    }
  }, []);

  // ── Auto-read controls ──
  const startAutoRead = useCallback(() => {
    const words = autoReadMode === 'random'
      ? [...autoReadWordList].sort(() => Math.random() - 0.5)
      : autoReadWordList;
    autoReadWordsRef.current = words;
    setAutoReadIndex(0);
    setAutoReadState('playing');

    autoReadWords(
      words,
      {
        readKana: true,
        readVietnamese: true,
        readHanViet: true,
        delayBetweenWords: autoReadDelay,
        onWordStart: (i: number) => setAutoReadIndex(i),
        onWordEnd: () => {},
      },
      0
    ).then((completed) => {
      if (completed) {
        setAutoReadState('idle');
        setAutoReadIndex(0);
      }
    });
  }, [autoReadWordList, autoReadMode, autoReadDelay]);

  const handlePause = () => {
    pauseAutoRead();
    setAutoReadState('paused');
  };

  const handleResume = () => {
    resumeAutoRead();
    setAutoReadState('playing');
  };

  const handleStop = () => {
    cancelAutoRead();
    setAutoReadState('idle');
    setAutoReadIndex(0);
  };

  const handleSkip = () => {
    cancelAutoRead();
    const nextIdx = autoReadIndex + 1;
    if (nextIdx >= autoReadWordsRef.current.length) {
      setAutoReadState('idle');
      return;
    }
    setAutoReadState('playing');
    autoReadWords(
      autoReadWordsRef.current,
      {
        readKana: true, readVietnamese: true, readHanViet: true,
        delayBetweenWords: autoReadDelay,
        onWordStart: (i: number) => setAutoReadIndex(i),
        onWordEnd: () => {},
      },
      nextIdx
    ).then((completed) => { 
      if (completed) {
        setAutoReadState('idle'); 
        setAutoReadIndex(0); 
      }
    });
  };

  // ── Seek bar ──
  const calcIndexFromClientX = useCallback((clientX: number): number => {
    const bar = seekBarRef.current;
    if (!bar || autoReadWordsRef.current.length === 0) return 0;
    const rect = bar.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return Math.min(
      Math.floor(ratio * autoReadWordsRef.current.length),
      autoReadWordsRef.current.length - 1
    );
  }, []);

  const handleSeek = useCallback((targetIndex: number) => {
    if (autoReadWordsRef.current.length === 0) return;
    const idx = Math.max(0, Math.min(targetIndex, autoReadWordsRef.current.length - 1));
    cancelAutoRead();
    setAutoReadIndex(idx);
    setAutoReadState(prev => {
      if (prev === 'playing') {
        // restart reading from new index immediately (autoReadWords has internal delay)
        autoReadWords(
          autoReadWordsRef.current,
          {
            readKana: true, readVietnamese: true, readHanViet: true,
            delayBetweenWords: autoReadDelay,
            onWordStart: (i: number) => setAutoReadIndex(i),
            onWordEnd: () => {},
          },
          idx
        ).then((completed) => { 
          if (completed) {
            setAutoReadState('idle'); 
            setAutoReadIndex(0); 
          }
        });
        return 'playing';
      }
      return prev; // paused → stay paused at new position
    });
  }, [autoReadDelay]);

  const handleSeekMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const idx = calcIndexFromClientX(e.clientX);
    setHoverIndex(idx);
    setIsDragging(true);
    isDraggingRef.current = true;
  }, [calcIndexFromClientX]);

  const handleSeekTouchStart = useCallback((e: React.TouchEvent) => {
    // don't prevent default here or it might break scroll, but for seekbar it's fine
    const idx = calcIndexFromClientX(e.touches[0].clientX);
    setHoverIndex(idx);
    setIsDragging(true);
    isDraggingRef.current = true;
  }, [calcIndexFromClientX]);

  const handleSeekBarHover = useCallback((e: React.MouseEvent) => {
    if (!isDraggingRef.current) {
      const idx = calcIndexFromClientX(e.clientX);
      setHoverIndex(idx);
    }
  }, [calcIndexFromClientX]);

  // Global mouse/touch move/up for drag outside the bar
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const idx = calcIndexFromClientX(e.clientX);
      setHoverIndex(idx);
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!isDraggingRef.current) return;
      const idx = calcIndexFromClientX(e.touches[0].clientX);
      setHoverIndex(idx);
    };
    const onMouseUp = (e: MouseEvent | TouchEvent) => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;
      setIsDragging(false);
      const clientX = 'changedTouches' in e && e.changedTouches.length > 0 
        ? e.changedTouches[0].clientX 
        : ('clientX' in e ? e.clientX : 0);
      const idx = calcIndexFromClientX(clientX);
      setHoverIndex(null);
      handleSeek(idx);
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('touchend', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('touchend', onMouseUp);
    };
  }, [calcIndexFromClientX, handleSeek]);

  const toggleLevel = (level: string) => {
    setAutoReadLevels(prev => {
      const next = new Set(prev);
      if (next.has(level)) next.delete(level);
      else next.add(level);
      return next;
    });
  };

  // Cleanup on unmount
  useEffect(() => () => cancelAutoRead(), []);

  const mergedKanjiDetails = useMemo((): KanjiDetailView[] => {
    if (!selectedWord) return [];

    if (selectedWord.kanjiDetails && selectedWord.kanjiDetails.length > 0) {
      return selectedWord.kanjiDetails.map(kd => ({
        char: kd.character,
        hanViet: kd.hanViet || '',
        meaning: kd.meaning || '',
        onReading: kd.onyomi || '',
        kunReading: kd.kunyomi || '',
        radical: kd.radical || '',
        strokeCount: kd.strokeCount || 0
      }));
    }

    const offlineAnalysis = !dbOnline ? analyzeWord(selectedWord.kanji) : null;
    if (offlineAnalysis && offlineAnalysis.components) {
      return offlineAnalysis.components.map(c => ({
        char: c.char,
        hanViet: c.info?.hanViet || '',
        meaning: c.info?.meaning || '',
        onReading: c.info?.on || '',
        kunReading: c.info?.kun || '',
        radical: c.info?.radical || '',
        strokeCount: c.info?.strokes || 0
      }));
    }

    return [];
  }, [selectedWord, dbOnline]);

  return (
    <div className="page-inner" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Flashcard CTA */}
      {onNavigate && (
        <button
          type="button"
          onClick={() => onNavigate('flashcard')}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
            padding: '14px 18px', borderRadius: 14, border: '1.5px solid #c7d2fe',
            background: 'linear-gradient(135deg,#eef2ff,#e0e7ff)', cursor: 'pointer',
            textAlign: 'left', width: '100%',
          }}
        >
          <div>
            <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--primary)' }}>🃏 Luyện Flashcard từ Excel</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>Upload file .xlsx hoặc học từ JLPT / N2-BS / Từ láy</div>
          </div>
          <span style={{ fontSize: 20 }}>→</span>
        </button>
      )}

      {/* Header Banner */}
      <div style={{
        background: 'linear-gradient(135deg,#1e1b4b 0%,#312e81 50%,#4338ca 100%)',
        borderRadius: 20, padding: '24px 28px', color: 'white',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16,
        position: 'relative'
      }}>
        <div>
          <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>Database JLPT từ Excel thực tế</span>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              background: dbOnline ? 'rgba(34,197,94,.2)' : 'rgba(234,179,8,.2)',
              color: dbOnline ? '#4ade80' : '#facc15',
              padding: '2px 8px', borderRadius: 99, fontSize: 10, fontWeight: 700,
              border: dbOnline ? '1px solid rgba(34,197,94,.4)' : '1px solid rgba(234,179,8,.4)'
            }}>
              <Server size={10} /> {dbOnline ? 'DB Connected' : 'Offline Mode'}
            </span>
          </div>
          <h2 style={{ fontSize: 'clamp(18px,3vw,26px)', fontWeight: 900, marginBottom: 8 }}>
            📚 Từ vựng JLPT N5・N4・N3・N2・N1
          </h2>
          <p style={{ fontSize: 13, opacity: 0.8 }}>
            Click từ để xem chi tiết · 🔊 Nghe phát âm JP + VI · 🎧 Chế độ nghe tự động
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {[
            { level: 'N5', count: stats.n5, color: '#4ade80' },
            { level: 'N4', count: stats.n4, color: '#60a5fa' },
            { level: 'N3', count: stats.n3, color: '#c084fc' },
            { level: 'N2', count: stats.n2, color: '#fb923c' },
            { level: 'N1', count: stats.n1, color: '#f87171' },
          ].filter(s => s.count > 0).map(s => (
            <div key={s.level} style={{
              background: 'rgba(255,255,255,.12)', backdropFilter: 'blur(10px)',
              borderRadius: 14, padding: '10px 16px', textAlign: 'center', minWidth: 70,
              border: '1px solid rgba(255,255,255,.2)'
            }}>
              <div style={{ fontSize: 20, fontWeight: 900, color: s.color }}>{s.count.toLocaleString()}</div>
              <div style={{ fontSize: 10, opacity: 0.8, marginTop: 2 }}>từ {s.level}</div>
            </div>
          ))}
          {SPECIAL_CATEGORIES.filter(c => {
            const counts = { n2_bs: stats.n2_bs, tu_lay: stats.tu_lay, luong_tu: stats.luong_tu };
            return counts[c.id] > 0;
          }).map(c => (
            <div key={c.id} style={{
              background: 'rgba(255,255,255,.12)', backdropFilter: 'blur(10px)',
              borderRadius: 14, padding: '10px 16px', textAlign: 'center', minWidth: 70,
              border: '1px solid rgba(255,255,255,.2)'
            }}>
              <div style={{ fontSize: 20, fontWeight: 900, color: c.border }}>{({ n2_bs: stats.n2_bs, tu_lay: stats.tu_lay, luong_tu: stats.luong_tu })[c.id].toLocaleString()}</div>
              <div style={{ fontSize: 10, opacity: 0.8, marginTop: 2 }}>{c.label}</div>
            </div>
          ))}
          <button
            onClick={() => setShowAutoRead(p => !p)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px',
              background: showAutoRead ? 'rgba(99,102,241,.6)' : 'rgba(255,255,255,.15)',
              border: '1px solid rgba(255,255,255,.3)', borderRadius: 14, color: 'white',
              cursor: 'pointer', fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap',
              backdropFilter: 'blur(10px)',
            }}>
            <Volume2 size={15} /> 🎧 Nghe tự động
          </button>
        </div>
      </div>

      {/* Auto-Read Panel */}
      {showAutoRead && (
        <div style={{
          background: 'linear-gradient(135deg,#0f172a,#1e1b4b)',
          borderRadius: 20, padding: 20, color: 'white',
          border: '1px solid rgba(99,102,241,.4)',
          boxShadow: '0 8px 32px rgba(79,70,229,.2)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontWeight: 800, fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              🎧 Chế độ nghe tự động
            </h3>
            <span style={{ fontSize: 12, opacity: 0.6 }}>
              {autoReadWordList.length.toLocaleString()} từ được chọn
            </span>
          </div>

          {/* Level selection & Speech Rate */}
          <div style={{ marginBottom: 16, display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ fontSize: 11, opacity: 0.6, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 }}>
                Chọn cấp độ (có thể chọn nhiều)
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {['N5', 'N4', 'N3', 'N2', 'N1'].map(lv => {
                  const lvColor = LEVEL_COLORS[lv];
                  const active = autoReadLevels.has(lv);
                  return (
                    <button key={lv} onClick={() => toggleLevel(lv)}
                      style={{
                        padding: '8px 18px', borderRadius: 10, border: `2px solid ${active ? lvColor.gradient : 'rgba(255,255,255,.2)'}`,
                        background: active ? `${lvColor.gradient}30` : 'rgba(255,255,255,.05)',
                        color: active ? lvColor.gradient : 'rgba(255,255,255,.6)',
                        cursor: 'pointer', fontWeight: 800, fontSize: 14, transition: 'all 150ms',
                      }}>
                      {lv} {active && '✓'}
                    </button>
                  );
                })}
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {SPECIAL_CATEGORIES.map(cat => {
                  const active = autoReadLevels.has(cat.id);
                  return (
                    <button key={cat.id} onClick={() => toggleLevel(cat.id)}
                      style={{
                        padding: '8px 18px', borderRadius: 10, border: `2px solid ${active ? cat.border : 'rgba(255,255,255,.2)'}`,
                        background: active ? `${cat.bg}40` : 'rgba(255,255,255,.05)',
                        color: active ? cat.border : 'rgba(255,255,255,.6)',
                        cursor: 'pointer', fontWeight: 800, fontSize: 13, transition: 'all 150ms',
                      }}>
                      {cat.label} {active && '✓'}
                    </button>
                  );
                })}
              </div>

              {autoReadLevels.has('N5') && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ fontSize: 11, opacity: 0.6, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Chọn bài N5 (tùy chọn)</span>
                    {autoReadLessons.size > 0 && (
                      <button onClick={() => setAutoReadLessons(new Set())} style={{ background: 'none', border: 'none', color: '#818cf8', cursor: 'pointer', fontSize: 11, textDecoration: 'underline', padding: 0 }}>
                        Bỏ chọn tất cả
                      </button>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', maxHeight: '140px', overflowY: 'auto', paddingRight: 4, msOverflowStyle: 'none', scrollbarWidth: 'thin' }}>
                    {N5_LESSONS.map(lesson => {
                      const active = autoReadLessons.has(lesson.lessonNum);
                      return (
                        <button key={lesson.lessonNum} onClick={() => {
                          setAutoReadLessons(prev => {
                            const next = new Set(prev);
                            if (next.has(lesson.lessonNum)) next.delete(lesson.lessonNum);
                            else next.add(lesson.lessonNum);
                            return next;
                          });
                        }}
                          style={{
                            padding: '6px 12px', borderRadius: 8, border: `1px solid ${active ? '#4ade80' : 'rgba(255,255,255,.2)'}`,
                            background: active ? 'rgba(74,222,128,.2)' : 'rgba(255,255,255,.05)',
                            color: active ? '#4ade80' : 'rgba(255,255,255,.6)',
                            cursor: 'pointer', fontWeight: 600, fontSize: 12, transition: 'all 150ms',
                          }}>
                          Bài {lesson.lessonNum}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div>
              <div style={{ fontSize: 11, opacity: 0.6, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 }}>
                Cài đặt giọng đọc
              </div>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '8px 16px',
                background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.2)',
                borderRadius: 10, color: 'white', fontSize: 13, fontWeight: 700,
                backdropFilter: 'blur(10px)', height: '40px'
              }}>
                <Volume2 size={16} style={{ color: '#818cf8' }} />
                <span>Giọng đọc: {speechRate.toFixed(2)}x</span>
                <input type="range" min={0.25} max={2.0} step={0.05} value={speechRate}
                  onChange={e => setSpeechRate(Number(e.target.value))}
                  style={{ width: 80, accentColor: '#818cf8', cursor: 'pointer', margin: 0 }}
                />
              </div>
            </div>
          </div>

          {/* Current word display */}
          {autoReadState !== 'idle' && currentAutoWord && (
            <div style={{
              background: 'rgba(255,255,255,.08)', borderRadius: 14, padding: '14px 18px',
              marginBottom: 14, border: '1px solid rgba(255,255,255,.15)',
            }}>
              <div style={{ fontSize: 11, opacity: 0.5, marginBottom: 6 }}>
                Đang đọc: {autoReadIndex + 1} / {autoReadWordsRef.current.length}
              </div>
              <div style={{
                display: 'flex', 
                alignItems: isMobile ? 'center' : 'center', 
                justifyContent: isMobile ? 'center' : 'flex-start',
                flexDirection: isMobile ? 'column' : 'row',
                gap: isMobile ? 12 : 16, 
                flexWrap: 'wrap',
                textAlign: isMobile ? 'center' : 'left',
                padding: isMobile ? '16px 0' : 0,
              }}>
                <span className="text-ja" style={{ fontSize: isMobile ? 56 : 36, fontWeight: 900, lineHeight: 1.2 }}>{currentAutoWord.kanji}</span>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: isMobile ? 'center' : 'flex-start' }}>
                  <div className="text-ja" style={{ fontSize: isMobile ? 18 : 14, opacity: 0.8 }}>{currentAutoWord.kana}</div>
                  {currentAutoWord.hanViet && <div style={{ fontSize: isMobile ? 16 : 12, color: '#fca5a5', fontWeight: 700, marginTop: isMobile ? 4 : 0 }}>{currentAutoWord.hanViet}</div>}
                  <div style={{ fontSize: isMobile ? 20 : 14, fontWeight: 600, marginTop: isMobile ? 8 : 2 }}>{currentAutoWord.vietnamese}</div>
                </div>
              </div>
              {/* Seekable progress bar */}
              {(() => {
                const total = autoReadWordsRef.current.length || 1;
                const displayIndex = hoverIndex !== null ? hoverIndex : autoReadIndex;
                const pct = Math.min(((displayIndex + 1) / total) * 100, 100);
                const isInteracting = isDragging || hoverIndex !== null;
                const previewWord = hoverIndex !== null ? autoReadWordsRef.current[hoverIndex] : null;
                return (
                  <div style={{ marginTop: 14, position: 'relative', paddingBottom: 4 }}>
                    {/* Tooltip */}
                    {previewWord && (
                      <div style={{
                        position: 'absolute',
                        bottom: 'calc(100% + 4px)',
                        left: `clamp(40px, ${pct}%, calc(100% - 40px))`,
                        transform: 'translateX(-50%)',
                        background: 'rgba(10,10,30,.96)',
                        color: 'white',
                        padding: '6px 12px',
                        borderRadius: 10,
                        fontSize: 12,
                        whiteSpace: 'nowrap',
                        pointerEvents: 'none',
                        boxShadow: '0 4px 20px rgba(0,0,0,.5)',
                        border: '1px solid rgba(99,102,241,.5)',
                        zIndex: 10,
                        textAlign: 'center',
                      }}>
                        <div style={{ fontWeight: 900, fontSize: 15, fontFamily: 'Noto Serif JP, serif', letterSpacing: 1 }}>
                          {previewWord.kanji}
                        </div>
                        {previewWord.kana !== previewWord.kanji && (
                          <div style={{ opacity: 0.65, fontSize: 11 }}>{previewWord.kana}</div>
                        )}
                        <div style={{ opacity: 0.5, fontSize: 10, marginTop: 2 }}>
                          {(hoverIndex ?? 0) + 1} / {total}
                        </div>
                        {/* Arrow */}
                        <div style={{
                          position: 'absolute', top: '100%', left: '50%',
                          transform: 'translateX(-50%)',
                          borderWidth: '5px 5px 0',
                          borderStyle: 'solid',
                          borderColor: 'rgba(10,10,30,.96) transparent transparent',
                        }} />
                      </div>
                    )}
                    {/* Track */}
                    <div
                      ref={seekBarRef}
                      onMouseDown={handleSeekMouseDown}
                      onTouchStart={handleSeekTouchStart}
                      onMouseMove={handleSeekBarHover}
                      onMouseLeave={() => { if (!isDraggingRef.current) setHoverIndex(null); }}
                      style={{
                        height: isInteracting ? 8 : 4,
                        background: 'rgba(255,255,255,.15)',
                        borderRadius: 99,
                        cursor: isDragging ? 'grabbing' : 'pointer',
                        position: 'relative',
                        transition: 'height 150ms ease',
                        userSelect: 'none',
                      }}
                    >
                      {/* Filled track */}
                      <div style={{
                        height: '100%',
                        borderRadius: 99,
                        background: 'linear-gradient(90deg,#6366f1,#a855f7)',
                        width: `${pct}%`,
                        transition: isDragging ? 'none' : 'width 250ms ease',
                        pointerEvents: 'none',
                      }} />
                      {/* Thumb dot */}
                      <div style={{
                        position: 'absolute',
                        top: '50%',
                        left: `${pct}%`,
                        transform: 'translate(-50%, -50%)',
                        width: isDragging ? 16 : 12,
                        height: isDragging ? 16 : 12,
                        borderRadius: '50%',
                        background: 'white',
                        boxShadow: isDragging
                          ? '0 0 0 4px rgba(99,102,241,.35), 0 2px 8px rgba(0,0,0,.5)'
                          : '0 2px 6px rgba(0,0,0,.4)',
                        opacity: isInteracting ? 1 : 0,
                        transition: isDragging ? 'width 100ms, height 100ms, box-shadow 100ms' : 'all 150ms ease',
                        pointerEvents: 'none',
                      }} />
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
          {/* Controls */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {autoReadState === 'idle' && (
              <button onClick={startAutoRead}
                disabled={autoReadLevels.size === 0 || autoReadWordList.length === 0}
                style={{
                  flex: 1, minWidth: 140, padding: '12px 20px', borderRadius: 12, border: 'none',
                  background: autoReadLevels.size === 0 ? 'rgba(255,255,255,.2)' : 'linear-gradient(135deg,#6366f1,#a855f7)',
                  color: 'white', cursor: autoReadLevels.size === 0 ? 'not-allowed' : 'pointer',
                  fontWeight: 800, fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}>
                <Play size={16} fill="white" /> Bắt đầu nghe
              </button>
            )}
            {autoReadState === 'playing' && (
              <>
                <button onClick={handlePause}
                  style={{ padding: '12px 20px', borderRadius: 12, border: '1px solid rgba(255,255,255,.3)', background: 'rgba(255,255,255,.1)', color: 'white', cursor: 'pointer', fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Pause size={16} /> Tạm dừng
                </button>
                <button onClick={handleSkip}
                  style={{ padding: '12px 20px', borderRadius: 12, border: '1px solid rgba(255,255,255,.3)', background: 'rgba(255,255,255,.1)', color: 'white', cursor: 'pointer', fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <SkipForward size={16} /> Bỏ qua
                </button>
              </>
            )}
            {autoReadState === 'paused' && (
              <button onClick={handleResume}
                style={{ padding: '12px 20px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#6366f1,#a855f7)', color: 'white', cursor: 'pointer', fontWeight: 800, fontSize: 15, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Play size={16} fill="white" /> Tiếp tục
              </button>
            )}
            {autoReadState !== 'idle' && (
              <button onClick={handleStop}
                style={{ padding: '12px 20px', borderRadius: 12, border: '1px solid #ef4444', background: 'rgba(239,68,68,.15)', color: '#f87171', cursor: 'pointer', fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Square size={14} fill="currentColor" /> Dừng
              </button>
            )}
          </div>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200, position: 'relative', display: 'flex', alignItems: 'center' }}>
          <Search size={16} style={{ position: 'absolute', left: 14, color: 'var(--text-muted)' }} />
          <input type="text" value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setLevelFilter('all'); }}
            placeholder="Tìm kanji, kana, tiếng Việt, Hán Việt..."
            style={{
              width: '100%', paddingLeft: 40, paddingRight: searchQuery ? 36 : 14,
              paddingTop: 11, paddingBottom: 11,
              border: '1.5px solid var(--border)', borderRadius: 12, fontSize: 14,
              outline: 'none', fontFamily: 'inherit', background: 'white', boxSizing: 'border-box',
            }}
            onFocus={e => { e.target.style.borderColor = 'var(--primary)'; }}
            onBlur={e => { e.target.style.borderColor = 'var(--border)'; }}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')}
              style={{ position: 'absolute', right: 10, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', padding: 4 }}>
              <X size={14} />
            </button>
          )}
        </div>
        <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: 12, padding: 3, gap: 2, flexWrap: 'wrap' }}>
          {(['all', 'N5', 'N4', 'N3', 'N2', 'N1'] as const).map(lv => (
            <button key={lv} onClick={() => { setLevelFilter(lv); setCategoryFilter('all'); setSearchQuery(''); setLessonFilter(null); }}
              style={{
                padding: '8px 14px', border: 'none', borderRadius: 10, cursor: 'pointer',
                fontSize: 13, fontWeight: 700, transition: 'all 150ms ease',
                background: levelFilter === lv && categoryFilter === 'all' && !searchQuery ? 'white' : 'transparent',
                color: levelFilter === lv && categoryFilter === 'all' && !searchQuery ? 'var(--primary)' : 'var(--text-secondary)',
                boxShadow: levelFilter === lv && categoryFilter === 'all' && !searchQuery ? '0 1px 4px rgba(0,0,0,.1)' : 'none',
              }}>{lv === 'all' ? 'Tất cả' : lv}</button>
          ))}
        </div>
        <div style={{ display: 'flex', background: '#fef3c7', borderRadius: 12, padding: 3, gap: 2, flexWrap: 'wrap' }}>
          {SPECIAL_CATEGORIES.map(cat => (
            <button key={cat.id}
              onClick={() => {
                setCategoryFilter(categoryFilter === cat.id ? 'all' : cat.id);
                setLevelFilter('all');
                setSearchQuery('');
                setLessonFilter(null);
              }}
              style={{
                padding: '8px 12px', borderRadius: 10, cursor: 'pointer',
                fontSize: 12, fontWeight: 700, transition: 'all 150ms ease',
                background: categoryFilter === cat.id ? cat.bg : 'transparent',
                color: categoryFilter === cat.id ? cat.color : 'var(--text-secondary)',
                border: categoryFilter === cat.id ? `1.5px solid ${cat.border}` : '1.5px solid transparent',
              }}>
              {cat.label}
            </button>
          ))}
        </div>
        <button onClick={() => setShowFilters(f => !f)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
            border: `1.5px solid ${posFilter ? 'var(--primary)' : 'var(--border)'}`,
            borderRadius: 12, cursor: 'pointer', fontSize: 13, fontWeight: 600,
            background: posFilter ? 'var(--primary-50)' : 'white',
            color: posFilter ? 'var(--primary)' : 'var(--text-secondary)',
          }}>
          <Filter size={14} />
          {posFilter ? POS_LABELS[posFilter] : 'Loại từ'}
          <ChevronDown size={12} style={{ transform: showFilters ? 'rotate(180deg)' : '', transition: '150ms' }} />
        </button>
      </div>

      {/* POS filter chips */}
      {showFilters && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', padding: '4px 0' }}>
          <button onClick={() => { setPosFilter(''); setShowFilters(false); }}
            style={{
              padding: '6px 14px', borderRadius: 99,
              border: `1.5px solid ${!posFilter ? 'var(--primary)' : 'var(--border)'}`,
              background: !posFilter ? 'var(--primary)' : 'white',
              color: !posFilter ? 'white' : 'var(--text-secondary)',
              fontSize: 12, fontWeight: 700, cursor: 'pointer',
            }}>Tất cả loại</button>
          {availablePos.map(pos => (
            <button key={pos} onClick={() => { setPosFilter(pos === posFilter ? '' : pos); setShowFilters(false); }}
              style={{
                padding: '6px 14px', borderRadius: 99, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                border: `1.5px solid ${posFilter === pos ? POS_COLORS[pos] || 'var(--primary)' : 'var(--border)'}`,
                background: posFilter === pos ? POS_COLORS[pos] || 'var(--primary)' : 'white',
                color: posFilter === pos ? 'white' : 'var(--text-secondary)',
              }}>
              {POS_LABELS[pos] || pos}
            </button>
          ))}
        </div>
      )}

      {/* Lesson Chips Filter Panel for N5/N4/N3/N2/N1 */}
      {levelFilter !== 'all' && categoryFilter === 'all' && !searchQuery && (
        <div style={{ 
          display: 'flex', gap: 10, overflowX: 'auto', padding: '8px 0', 
          msOverflowStyle: 'none', scrollbarWidth: 'none', 
          borderBottom: '1px solid var(--border)', marginBottom: 8 
        }}>
          <style>{`.lesson-chips::-webkit-scrollbar { display: none; }`}</style>
          <div className="lesson-chips" style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
            <button
              onClick={() => setLessonFilter(null)}
              style={{
                padding: '8px 16px', borderRadius: 20, border: 'none', whiteSpace: 'nowrap',
                background: lessonFilter === null ? 'var(--primary)' : '#f1f5f9',
                color: lessonFilter === null ? 'white' : 'var(--text-secondary)',
                fontWeight: 700, fontSize: 13, cursor: 'pointer', transition: 'all 0.2s'
              }}
            >
              Tất cả bài {levelFilter}
            </button>
            
            {levelFilter === 'N5' && N5_LESSONS.map(lesson => (
              <button
                key={lesson.lessonNum}
                onClick={() => setLessonFilter(lesson.lessonNum)}
                style={{
                  padding: '8px 16px', borderRadius: 20, border: 'none', whiteSpace: 'nowrap',
                  background: lessonFilter === lesson.lessonNum ? 'var(--primary)' : '#f1f5f9',
                  color: lessonFilter === lesson.lessonNum ? 'white' : 'var(--text-secondary)',
                  fontWeight: 600, fontSize: 13, cursor: 'pointer', transition: 'all 0.2s'
                }}
              >
                <strong>Bài {lesson.lessonNum}</strong> · {lesson.theme}
              </button>
            ))}

            {levelFilter !== 'N5' && (
              <div style={{ padding: '8px 16px', color: 'var(--text-muted)', fontSize: 13, fontStyle: 'italic', whiteSpace: 'nowrap' }}>
                Đang cập nhật danh sách bài học...
              </div>
            )}
          </div>
        </div>
      )}

      <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
        {loading && <span style={{ width: 12, height: 12, borderRadius: '50%', border: '2px solid var(--primary)', borderTopColor: 'transparent', display: 'inline-block', animation: 'spin 1s linear infinite' }} />}
        {searchQuery
          ? <span>🔍 Tìm thấy <strong style={{ color: 'var(--primary)' }}>{vocabList.length}</strong> từ cho "{searchQuery}"</span>
          : <span>Hiển thị <strong style={{ color: 'var(--primary)' }}>{vocabList.length.toLocaleString()}</strong> từ
            {categoryFilter !== 'all'
              ? ` · ${SPECIAL_CATEGORIES.find(c => c.id === categoryFilter)?.label}`
              : levelFilter !== 'all' ? ` JLPT ${levelFilter}` : ''}
            {posFilter ? ` · ${POS_LABELS[posFilter]}` : ''}</span>
        }
      </div>



        {/* Vocab Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(210px,1fr))', gap: 10 }}>
          {vocabList.length === 0 ? (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>{loading ? '⏳' : '🔍'}</div>
              <p style={{ fontWeight: 700, fontSize: 16 }}>{loading ? 'Đang tải dữ liệu...' : 'Không tìm thấy từ nào'}</p>
            </div>
          ) : vocabList.map(word => {
            const lvColor = LEVEL_COLORS[word.level] || LEVEL_COLORS.N5;
            const posColor = POS_COLORS[word.pos] || '#64748b';
            const isSelected = selectedWord?.id === word.id;
            const isSpeaking = speakingId === word.id;

            return (
              <div key={word.id} onClick={() => handleSelectWord(word)}
                style={{
                  background: isSelected ? 'var(--primary-50)' : 'white',
                  border: `1.5px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`,
                  borderRadius: 14, padding: '14px 16px', cursor: 'pointer',
                  transition: 'all 150ms ease', position: 'relative',
                  boxShadow: isSelected ? '0 0 0 3px rgba(79,70,229,.15)' : '0 1px 3px rgba(0,0,0,.04)',
                  transform: isSelected ? 'scale(1.01)' : 'scale(1)',
                }}
                onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.borderColor = '#c7d2fe'; }}
                onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; }}
              >
                <div style={{ display: 'flex', gap: 5, marginBottom: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 7px', borderRadius: 6, background: lvColor.bg, color: lvColor.text, border: `1px solid ${lvColor.border}` }}>
                    {word.level}
                  </span>
                  {word.pos && (
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 6, background: `${posColor}15`, color: posColor, border: `1px solid ${posColor}30` }}>
                      {POS_LABELS[word.pos] || word.pos}
                    </span>
                  )}
                </div>
                <div className="text-ja" style={{ fontSize: 'clamp(20px,3.5vw,28px)', fontWeight: 900, marginBottom: 3, lineHeight: 1.1, color: isSelected ? 'var(--primary)' : 'var(--text-primary)' }}>
                  {word.kanji}
                </div>
                <div className="text-ja" style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 5 }}>{word.kana}</div>
                {word.hanViet && <div style={{ fontSize: 10, fontWeight: 800, color: '#dc2626', letterSpacing: 1, marginBottom: 4 }}>{word.hanViet}</div>}
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.4 }}>{word.vietnamese}</div>
                <button onClick={(e) => handleSpeak(word, e)}
                  style={{
                    position: 'absolute', top: 10, right: 10, width: 30, height: 30, borderRadius: 8,
                    border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: isSpeaking ? 'var(--primary)' : 'var(--primary-50)', color: isSpeaking ? 'white' : 'var(--primary)',
                    animation: isSpeaking ? 'pulse 1s ease infinite' : 'none',
                  }}>
                  <Volume2 size={13} />
                </button>
              </div>
            );
          })}
        </div>

      {/* Detail Panel Bottom Sheet */}
      {selectedWord && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
          background: 'rgba(15,23,42,.6)', backdropFilter: 'blur(2px)'
        }} onClick={() => setSelectedWord(null)}>
          <div style={{
            background: 'white', borderRadius: '24px 24px 0 0',
            overflow: 'hidden', display: 'flex', flexDirection: 'column',
            maxHeight: '85vh', boxShadow: '0 -8px 40px rgba(0,0,0,.2)'
          }} onClick={e => e.stopPropagation()}>
            <div style={{ background: 'linear-gradient(135deg,#1e1b4b 0%,#4338ca 100%)', padding: '20px 20px 24px', color: 'white', position: 'relative', flexShrink: 0 }}>
              <button onClick={() => setSelectedWord(null)}
                style={{ position: 'absolute', top: 14, right: 14, background: 'rgba(255,255,255,.15)', border: 'none', color: 'white', width: 28, height: 28, borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={14} />
              </button>
              <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontSize: 11, fontWeight: 800, padding: '3px 8px', borderRadius: 7, background: 'rgba(255,255,255,.2)', color: 'white', border: '1px solid rgba(255,255,255,.3)' }}>
                  {selectedWord.level}
                </span>
                {selectedWord.pos && (
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 7, background: 'rgba(255,255,255,.15)', color: 'white', border: '1px solid rgba(255,255,255,.2)' }}>
                    {POS_LABELS[selectedWord.pos] || selectedWord.pos}
                  </span>
                )}
                {detailLoading && (
                  <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 7, background: 'rgba(255,255,255,.1)', color: 'rgba(255,255,255,.7)', border: '1px solid rgba(255,255,255,.15)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', border: '1.5px solid rgba(255,255,255,.5)', borderTopColor: 'transparent', display: 'inline-block', animation: 'spin 1s linear infinite' }} />
                    Đang tải chi tiết...
                  </span>
                )}
              </div>
              <div className="text-ja" style={{ fontSize: 52, fontWeight: 900, lineHeight: 1, marginBottom: 8 }}>{selectedWord.kanji}</div>
              <div className="text-ja" style={{ fontSize: 16, opacity: 0.85, marginBottom: 4 }}>{selectedWord.kana}</div>
            </div>
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto', flex: 1, scrollbarWidth: 'thin' }}>
              {selectedWord.hanViet && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '12px 16px' }}>
                  <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 2, color: '#991b1b', fontWeight: 700, marginBottom: 4 }}>Hán Việt</div>
                  <div style={{ fontSize: 20, fontWeight: 900, color: '#dc2626', letterSpacing: 2 }}>{selectedWord.hanViet}</div>
                </div>
              )}
              <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 12, padding: '12px 16px' }}>
                <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 2, color: '#166534', fontWeight: 700, marginBottom: 4 }}>Nghĩa tiếng Việt</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#15803d' }}>{selectedWord.vietnamese}</div>
              </div>
              
              {selectedWord.exampleSentence && (
                <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 12, padding: '12px 16px' }}>
                  <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 2, color: '#475569', fontWeight: 700, marginBottom: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    Ví dụ minh họa
                    <button onClick={() => speechService.speakJapanese(selectedWord.exampleSentence!)} style={{ background: 'none', border: 'none', padding: 2, cursor: 'pointer', color: 'var(--primary)', display: 'flex' }}>
                      <Volume2 size={14} />
                    </button>
                  </div>
                  <div className="text-ja" style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>{selectedWord.exampleSentence}</div>
                  {selectedWord.exampleRomaji && <div style={{ fontSize: 13, color: '#64748b', marginBottom: 4 }}>{selectedWord.exampleRomaji}</div>}
                  {selectedWord.exampleTranslation && <div style={{ fontSize: 14, color: '#334155' }}>{selectedWord.exampleTranslation}</div>}
                </div>
              )}
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <button onClick={() => speechService.speakJapanese(selectedWord.kana)}
                  style={{ flex: 1, padding: '10px', borderRadius: 12, border: '1.5px solid var(--border)', background: 'var(--primary-50)', color: 'var(--primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 13, fontWeight: 700 }}>
                  <Play size={14} fill="currentColor" /> Tiếng Nhật
                </button>
                <button onClick={() => speechService.speakVietnameseAndHanViet(selectedWord.vietnamese, selectedWord.hanViet)}
                  style={{ flex: 1, padding: '10px', borderRadius: 12, border: '1.5px solid var(--border)', background: '#f0fdf4', color: '#15803d', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 13, fontWeight: 700 }}>
                  <Volume2 size={14} /> Tiếng Việt + Hán Việt
                </button>
              </div>
              {mergedKanjiDetails.length > 0 && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Zap size={12} style={{ color: 'var(--primary)' }} /> Phân tích Hán tự
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {mergedKanjiDetails.map((c, i) => (
                      <div key={i} style={{ background: '#f8fafc', border: '1px solid var(--border)', borderRadius: 12, padding: '10px 14px', display: 'flex', gap: 12, alignItems: 'center' }}>
                        <div className="text-ja" style={{ fontSize: 34, fontWeight: 900, lineHeight: 1 }}>{c.char}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 800, color: '#dc2626', marginBottom: 2 }}>{c.hanViet}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{c.meaning}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                            {c.onReading && `On: ${c.onReading}`}
                            {c.onReading && c.kunReading && ' · '}
                            {c.kunReading && `Kun: ${c.kunReading}`}
                            {(c.radical || c.strokeCount > 0) && ' · '}
                            {c.radical && `Bộ: ${c.radical}`}
                            {c.strokeCount > 0 && ` (${c.strokeCount} nét)`}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <button onClick={() => speechService.speakFlashcard(selectedWord.kana, selectedWord.vietnamese, selectedWord.hanViet)}
                style={{ width: '100%', padding: '12px', borderRadius: 12, border: '2px solid var(--primary)', background: 'var(--primary)', color: 'white', cursor: 'pointer', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <BookOpen size={16} /> Nghe đầy đủ (JP → VI → Hán Việt)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
