import { useState, useEffect, useCallback, useRef, type ChangeEvent } from 'react';
import {
  UploadCloud, FileSpreadsheet, Shuffle, ListOrdered,
  Trash2, ChevronLeft, ChevronRight, Play, BrainCircuit,
  Loader2, X, CheckCircle, AlertCircle, BookMarked, Database, Award
} from 'lucide-react';
import type { FlashCard, ExcelSheetData } from '../types';
import { excelService } from '../services/excelService';
import { speechService } from '../services/speechService';
import { geminiService } from '../services/geminiService';
import { analyzeWord } from '../constants/kanjiDB';
import { ALL_VOCAB, POS_LABELS, type VocabEntry } from '../constants/jlptData';
import { SPECIAL_CATEGORIES, type SpecialCategory } from '../constants/specialCategories';
import { apiService } from '../services/apiService';
import UniversalQuizPage, { type QuizItem } from './UniversalQuizPage';

type KanjiPanelData = {
  fullHanViet: string;
  components: Array<{
    char: string;
    hanViet: string;
    meaning: string;
    on: string;
    kun: string;
    radical: string;
    strokes: number;
  }>;
};



type Phase = 'upload' | 'select' | 'study';
type SourceMode = 'excel' | 'jlpt';

export default function FlashcardPage() {
  const [phase, setPhase] = useState<Phase>('upload');
  const [sourceMode, setSourceMode] = useState<SourceMode>('jlpt');
  // JLPT source state
  const [jlptLevels, setJlptLevels] = useState<Set<string>>(new Set(['N5']));
  const [jlptCategory, setJlptCategory] = useState<SpecialCategory | ''>('');
  const [jlptPos, setJlptPos] = useState('');
  const [specialStats, setSpecialStats] = useState({ n2_bs: 0, tu_lay: 0, luong_tu: 0 });
  const [jlptCount, setJlptCount] = useState<number | 'all'>('all');
  const [autoPlayState, setAutoPlayState] = useState<'idle' | 'playing'>('idle');
  const autoPlayRef = useRef(false);


  const [sheets, setSheets] = useState<ExcelSheetData>({});
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [cards, setCards] = useState<FlashCard[]>([]);
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [jumpTo, setJumpTo] = useState('');
  const [showKanji, setShowKanji] = useState(false);
  const [kanjiData, setKanjiData] = useState<KanjiPanelData | null>(null);
  const [example, setExample] = useState<{ ja: string; vi: string } | null>(null);
  const [exampleLoading, setExampleLoading] = useState(false);
  const [knownCount, setKnownCount] = useState(0);
  const [hardCount, setHardCount] = useState(0);
  const [activeQuiz, setActiveQuiz] = useState<{ title: string; items: QuizItem[] } | null>(null);

  // Load saved data
  useEffect(() => {
    const saved = excelService.loadFromStorage();
    if (saved && Object.keys(saved).length > 0) {
      setSheets(saved);
      setSelected(Object.fromEntries(Object.keys(saved).map(k => [k, false])));
      setPhase('select');
    }
  }, []);

  useEffect(() => {
    const initStats = async () => {
      try {
        const stats = await apiService.getStats();
        setSpecialStats({
          n2_bs: stats.n2_bs ?? 0,
          tu_lay: stats.tu_lay ?? 0,
          luong_tu: stats.luong_tu ?? 0,
        });
      } catch { /* ignore */ }
    };
    initStats();
  }, []);

  const handleFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true); setError('');
    try {
      const data = await excelService.parseExcelFile(file);
      excelService.saveToStorage(data);
      setSheets(data);
      setSelected(Object.fromEntries(Object.keys(data).map(k => [k, false])));
      setPhase('select');
    } catch (err: any) {
      setError(err.message || 'Lỗi đọc file');
    } finally { setLoading(false); }
  };

  const toggleAll = () => {
    const allOn = Object.values(selected).every(Boolean);
    setSelected(Object.fromEntries(Object.keys(selected).map(k => [k, !allOn])));
  };

  const startStudy = async (shuffle: boolean) => {
    setLoading(true);
    setError('');
    let all: FlashCard[] = [];
    
    try {
      if (sourceMode === 'jlpt') {
        const isOnline = await apiService.checkHealth();
        if (isOnline) {
          let apiVocab: VocabEntry[] = [];

          if (jlptCategory) {
            apiVocab = await apiService.getVocabulary({
              category: jlptCategory,
              pos: jlptPos || undefined,
              limit: 1000,
            });
          } else {
            const levelsList = Array.from(jlptLevels);
            for (const lv of levelsList) {
              const items = await apiService.getVocabulary({
                level: lv,
                pos: jlptPos || undefined,
                limit: 1000,
              });
              apiVocab = [...apiVocab, ...items];
            }
          }
          
          if (shuffle) apiVocab = apiVocab.sort(() => Math.random() - 0.5);
          if (jlptCount !== 'all') apiVocab = apiVocab.slice(0, jlptCount);
          
          all = apiVocab.map(v => ({
            id: v.id,
            kanji: v.kanji,
            kana: v.kana,
            hanViet: v.hanViet,
            vietnamese: v.vietnamese,
            level: v.level
          }));
        } else {
          // Offline fallback
          let vocab = ALL_VOCAB.filter(v => jlptLevels.has(v.level));
          if (jlptPos) vocab = vocab.filter(v => v.pos === jlptPos);
          if (shuffle) vocab = [...vocab].sort(() => Math.random() - 0.5);
          if (jlptCount !== 'all') vocab = vocab.slice(0, jlptCount);
          all = vocab.map(v => ({ id: v.id, kanji: v.kanji, kana: v.kana, hanViet: v.hanViet, vietnamese: v.vietnamese, level: v.level }));
        }
      } else {
        Object.entries(selected).forEach(([k, v]) => { if (v) all = [...all, ...sheets[k]]; });
      }

      if (all.length === 0) {
        setError(jlptCategory ? 'Không có từ trong nhóm này. Hãy bật backend + DB.' : 'Chọn ít nhất 1 nhóm từ vựng!');
        setLoading(false);
        return;
      }

      if (shuffle && sourceMode === 'excel') all = [...all].sort(() => Math.random() - 0.5);
      setCards(all);
      setIdx(0);
      setFlipped(false);
      setPhase('study');
      setKnownCount(0);
      setHardCount(0);
      speechService.speakJapanese('');
    } catch (err) {
      console.error(err);
      setError('Lỗi khi tải thẻ học từ database');
    } finally {
      setLoading(false);
    }
  };

  const card = cards[idx];

  // Slideshow Logic
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;

    const playNext = async () => {
      if (!autoPlayRef.current || phase !== 'study' || !card) return;

      // Đảm bảo bắt đầu ở mặt trước (nếu vừa mới chuyển thẻ)
      if (flipped) {
        setFlipped(false);
        await new Promise(r => { timeoutId = setTimeout(r, 400); });
        if (!autoPlayRef.current) return;
      }
      
      // Thời gian nhìn mặt trước (Kanji)
      await new Promise(r => { timeoutId = setTimeout(r, 1200); });
      if (!autoPlayRef.current) return;

      // Lật thẻ
      setFlipped(true);
      
      // Chờ lật xong
      await new Promise(r => { timeoutId = setTimeout(r, 400); });
      if (!autoPlayRef.current) return;

      // Phát âm
      await speechService.speakFlashcard(card.kana, card.vietnamese, card.hanViet);
      if (!autoPlayRef.current) return;

      // Chờ một chút trước khi sang thẻ mới
      await new Promise(r => { timeoutId = setTimeout(r, 1500); });
      if (!autoPlayRef.current) return;

      // Chuyển thẻ
      if (idx < cards.length - 1) {
        setIdx(prev => prev + 1);
        setFlipped(false);
      } else {
        autoPlayRef.current = false;
        setAutoPlayState('idle');
      }
    };

    if (autoPlayState === 'playing') {
      autoPlayRef.current = true;
      playNext();
    } else {
      autoPlayRef.current = false;
      speechService.cancel();
    }

    return () => {
      clearTimeout(timeoutId);
    };
  }, [autoPlayState, idx, phase, card]);

  const toggleAutoPlay = () => {
    speechService.unlockAudioSync();
    setAutoPlayState(prev => prev === 'idle' ? 'playing' : 'idle');
  };

  const handleFlip = useCallback(() => {
    setFlipped(f => !f);
    setShowKanji(false);
    if (!flipped && card) {
      speechService.speakFlashcard(card.kana, card.vietnamese, card.hanViet);
      setExample(null); setExampleLoading(true);
      if (geminiService.isAvailable()) {
        geminiService.generateExample(card.kanji, card.kana, card.vietnamese)
          .then(setExample).catch(() => setExample(getMockExample(card)))
          .finally(() => setExampleLoading(false));
      } else {
        setTimeout(() => { setExample(getMockExample(card)); setExampleLoading(false); }, 600);
      }
    }


  }, [flipped, card]);

  const next = (known?: boolean) => {
    if (known === true) setKnownCount(c => c + 1);
    if (known === false) setHardCount(c => c + 1);
    setFlipped(false); setShowKanji(false); setExample(null);
    if (idx < cards.length - 1) setIdx(i => i + 1);
  };
  const prev = () => { setFlipped(false); setShowKanji(false); if (idx > 0) setIdx(i => i - 1); };

  const handleJump = () => {
    const n = parseInt(jumpTo) - 1;
    if (!isNaN(n) && n >= 0 && n < cards.length) { setIdx(n); setFlipped(false); setJumpTo(''); }
  };

  const openKanji = async () => {
    if (!card) return;
    setShowKanji(true);
    setKanjiData(null);

    const apiComponents = await apiService.analyzeKanji(card.kanji);
    if (apiComponents && apiComponents.length > 0) {
      setKanjiData({
        fullHanViet: apiComponents.map(c => c.hanViet || '').join(''),
        components: apiComponents.map(c => ({
          char: c.character,
          hanViet: c.hanViet || '',
          meaning: c.meaning || '',
          on: c.onyomi || '',
          kun: c.kunyomi || '',
          radical: c.radical || '',
          strokes: c.strokeCount || 0,
        })),
      });
      return;
    }

    const offline = analyzeWord(card.kanji);
    if (offline?.components?.length) {
      setKanjiData({
        fullHanViet: offline.fullHanViet,
        components: offline.components
          .filter(c => c.info)
          .map(c => ({
            char: c.char,
            hanViet: c.info!.hanViet,
            meaning: c.info!.meaning,
            on: c.info!.on,
            kun: c.info!.kun,
            radical: c.info!.radical,
            strokes: c.info!.strokes,
          })),
      });
    }
  };

  // ── Upload / Source Selection Phase ──
  if (phase === 'upload') {
    // Available POS in selected JLPT levels
    const jlptPosOptions = Array.from(new Set(
      ALL_VOCAB.filter(v => jlptLevels.has(v.level)).map(v => v.pos)
    )).filter(Boolean);
    const jlptStats = jlptCategory
      ? ({ n2_bs: specialStats.n2_bs, tu_lay: specialStats.tu_lay, luong_tu: specialStats.luong_tu })[jlptCategory] || 0
      : ALL_VOCAB.filter(v => jlptLevels.has(v.level) && (!jlptPos || v.pos === jlptPos)).length;

    return (
      <div className="page-inner" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Source tabs */}
        <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: 16, padding: 4, gap: 4 }}>
          <button onClick={() => setSourceMode('excel')}
            style={{
              flex: 1, padding: '12px 20px', border: 'none', borderRadius: 12, cursor: 'pointer',
              fontWeight: 700, fontSize: 14, transition: 'all 150ms',
              background: sourceMode === 'excel' ? 'white' : 'transparent',
              color: sourceMode === 'excel' ? 'var(--primary)' : 'var(--text-secondary)',
              boxShadow: sourceMode === 'excel' ? '0 2px 8px rgba(0,0,0,.1)' : 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
            <FileSpreadsheet size={16} /> Upload Excel
          </button>
          <button onClick={() => setSourceMode('jlpt')}
            style={{
              flex: 1, padding: '12px 20px', border: 'none', borderRadius: 12, cursor: 'pointer',
              fontWeight: 700, fontSize: 14, transition: 'all 150ms',
              background: sourceMode === 'jlpt' ? 'white' : 'transparent',
              color: sourceMode === 'jlpt' ? 'var(--primary)' : 'var(--text-secondary)',
              boxShadow: sourceMode === 'jlpt' ? '0 2px 8px rgba(0,0,0,.1)' : 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
            <BookMarked size={16} /> Từ vựng JLPT
          </button>
        </div>

        {/* JLPT Source Mode */}
        {sourceMode === 'jlpt' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{
              background: 'linear-gradient(135deg,#1e1b4b,#312e81)', color: 'white',
              borderRadius: 20, padding: 24,
            }}>
              <h2 style={{ fontSize: 20, fontWeight: 900, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 10 }}>
                <Database size={20} /> Học từ JLPT có sẵn
              </h2>
              <p style={{ fontSize: 13, opacity: 0.8 }}>Không cần upload file – dữ liệu {ALL_VOCAB.length.toLocaleString()} từ N5・N4・N3 đã có sẵn</p>
            </div>

            {/* Level select */}
            <div style={{ background: 'white', borderRadius: 16, padding: 20, border: '1px solid var(--border)' }}>
              <h4 style={{ fontWeight: 800, marginBottom: 14, fontSize: 14 }}>📊 Chọn cấp độ JLPT</h4>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {(['N5', 'N4', 'N3', 'N2', 'N1'] as const).map(lv => {
                  const count = ALL_VOCAB.filter(v => v.level === lv).length;
                  const active = !jlptCategory && jlptLevels.has(lv);
                  return (
                    <button key={lv}
                      onClick={() => {
                        setJlptCategory('');
                        setJlptLevels(prev => { const next = new Set(prev); if (next.has(lv)) next.delete(lv); else next.add(lv); return next; });
                      }}
                      disabled={!!jlptCategory}
                      style={{
                        padding: '12px 24px', borderRadius: 14, cursor: jlptCategory ? 'not-allowed' : 'pointer', fontWeight: 800, fontSize: 15,
                        border: `2px solid ${active ? 'var(--primary)' : 'var(--border)'}`,
                        background: active ? 'var(--primary-50)' : 'white',
                        color: active ? 'var(--primary)' : 'var(--text-secondary)',
                        opacity: jlptCategory ? 0.5 : 1,
                        transition: 'all 150ms',
                      }}>
                      {lv} <span style={{ fontSize: 11, opacity: 0.7 }}>({count.toLocaleString()} từ)</span>
                      {active && ' ✓'}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Special categories */}
            <div style={{ background: 'white', borderRadius: 16, padding: 20, border: '1px solid var(--border)' }}>
              <h4 style={{ fontWeight: 800, marginBottom: 14, fontSize: 14 }}>⭐ Bộ đặc biệt</h4>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {SPECIAL_CATEGORIES.map(cat => {
                  const count = ({ n2_bs: specialStats.n2_bs, tu_lay: specialStats.tu_lay, luong_tu: specialStats.luong_tu })[cat.id];
                  const active = jlptCategory === cat.id;
                  return (
                    <button key={cat.id}
                      onClick={() => {
                        setJlptCategory(active ? '' : cat.id);
                        if (!active) setJlptLevels(new Set());
                      }}
                      style={{
                        padding: '12px 20px', borderRadius: 14, cursor: 'pointer', fontWeight: 800, fontSize: 14,
                        border: `2px solid ${active ? cat.border : 'var(--border)'}`,
                        background: active ? cat.bg : 'white',
                        color: active ? cat.color : 'var(--text-secondary)',
                        transition: 'all 150ms',
                      }}>
                      {cat.label}
                      {count > 0 && <span style={{ fontSize: 11, opacity: 0.7, marginLeft: 6 }}>({count})</span>}
                      {active && ' ✓'}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* POS filter */}
            <div style={{ background: 'white', borderRadius: 16, padding: 20, border: '1px solid var(--border)' }}>
              <h4 style={{ fontWeight: 800, marginBottom: 14, fontSize: 14 }}>🏷️ Lọc theo loại từ (tuỳ chọn)</h4>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button onClick={() => setJlptPos('')}
                  style={{
                    padding: '8px 16px', borderRadius: 99, fontSize: 13, fontWeight: 700, cursor: 'pointer',
                    border: `1.5px solid ${!jlptPos ? 'var(--primary)' : 'var(--border)'}`,
                    background: !jlptPos ? 'var(--primary)' : 'white',
                    color: !jlptPos ? 'white' : 'var(--text-secondary)',
                  }}>Tất cả loại</button>
                {jlptPosOptions.map(pos => (
                  <button key={pos} onClick={() => setJlptPos(pos === jlptPos ? '' : pos)}
                    style={{
                      padding: '8px 16px', borderRadius: 99, fontSize: 13, fontWeight: 700, cursor: 'pointer',
                      border: `1.5px solid ${jlptPos === pos ? 'var(--primary)' : 'var(--border)'}`,
                      background: jlptPos === pos ? 'var(--primary)' : 'white',
                      color: jlptPos === pos ? 'white' : 'var(--text-secondary)',
                    }}>{POS_LABELS[pos] || pos}</button>
                ))}
              </div>
            </div>

            {/* Count */}
            <div style={{ background: 'white', borderRadius: 16, padding: 20, border: '1px solid var(--border)' }}>
              <h4 style={{ fontWeight: 800, marginBottom: 14, fontSize: 14 }}>🎯 Số lượng thẻ</h4>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {([30, 50, 100, 'all'] as const).map(n => (
                  <button key={String(n)} onClick={() => setJlptCount(n)}
                    style={{
                      padding: '10px 20px', borderRadius: 12, cursor: 'pointer', fontWeight: 700, fontSize: 14,
                      border: `2px solid ${jlptCount === n ? 'var(--primary)' : 'var(--border)'}`,
                      background: jlptCount === n ? 'var(--primary-50)' : 'white',
                      color: jlptCount === n ? 'var(--primary)' : 'var(--text-secondary)',
                    }}>{n === 'all' ? `Tất cả (${jlptStats.toLocaleString()})` : n + ' thẻ'}</button>
                ))}
              </div>
            </div>


            {/* Summary + Start */}
            <div style={{
              background: 'linear-gradient(135deg,#f0fdf4,#dcfce7)', borderRadius: 16, padding: 20,
              border: '1px solid #86efac', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16,
            }}>
              <div>
                <div style={{ fontSize: 13, color: '#166534', fontWeight: 700 }}>📚 Sẵn sàng học</div>
                <div style={{ fontSize: 24, fontWeight: 900, color: '#15803d', marginTop: 4 }}>
                  {Math.min(jlptCount === 'all' ? jlptStats : jlptCount, jlptStats).toLocaleString()} thẻ
                </div>
                <div style={{ fontSize: 12, color: '#166534', opacity: 0.8, marginTop: 2 }}>
                  {jlptCategory
                    ? `Bộ: ${SPECIAL_CATEGORIES.find(c => c.id === jlptCategory)?.label}`
                    : `Level: ${Array.from(jlptLevels).join(', ') || '(chưa chọn)'}`} · {jlptPos ? POS_LABELS[jlptPos] || jlptPos : 'Tất cả loại từ'}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => startStudy(false)} disabled={!jlptCategory && jlptLevels.size === 0}
                  className="btn btn-outline btn-lg" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ListOrdered size={18} /> Tuần tự
                </button>
                <button onClick={() => startStudy(true)} disabled={!jlptCategory && jlptLevels.size === 0}
                  className="btn btn-primary btn-lg" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Shuffle size={18} /> Học ngẫu nhiên
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Excel upload mode */}
        {sourceMode === 'excel' && (
          <>
            <div className="upload-zone" onClick={() => document.getElementById('excel-input')?.click()}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>📊</div>
              <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Tải file Excel từ vựng</h2>
              <p style={{ color: 'var(--text-muted)', marginBottom: 24, maxWidth: 400, margin: '0 auto 24px' }}>
                Hỗ trợ 2-4 cột: Hán tự | Kana | Hán Việt | Nghĩa Việt<br />
                Tự động nhận diện format và extract Hán Việt
              </p>
              <label style={{ cursor: 'pointer' }}>
                <input id="excel-input" type="file" accept=".xlsx,.xls,.csv" className="sr-only" onChange={handleFile} />
                <span className="btn btn-primary btn-lg">
                  {loading ? <Loader2 size={20} className="animate-spin" /> : <UploadCloud size={20} />}
                  {loading ? 'Đang phân tích...' : 'Chọn File Excel'}
                </span>
              </label>
              {error && <p style={{ color: 'var(--danger)', marginTop: 12, fontWeight: 600 }}>{error}</p>}
            </div>

            <div style={{ marginTop: 4, padding: 20, background: '#f8fafc', borderRadius: 16, border: '1px solid var(--border)' }}>
              <h4 style={{ fontWeight: 700, marginBottom: 12, fontSize: 14 }}>📋 Format file hỗ trợ:</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 12 }}>
                {[
                  { title: '2 cột', desc: 'Kanji | Nghĩa Việt' },
                  { title: '3 cột', desc: 'Kanji | Kana | Nghĩa' },
                  { title: '4 cột', desc: 'Kanji | Kana | Hán Việt | Nghĩa' },
                ].map(f => (
                  <div key={f.title} style={{ padding: '10px 14px', background: 'white', borderRadius: 10, border: '1px solid var(--border)' }}>
                    <strong style={{ fontSize: 13 }}>{f.title}</strong>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{f.desc}</p>
                  </div>
                ))}
              </div>
             </div>
          </>
        )}
      </div>
    );
  }


  // ── Select Phase ──
  if (phase === 'select') return (
    <div className="page-inner" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="card card-p" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <h2 style={{ fontSize: 20, fontWeight: 800 }}>⚙️ Cấu hình ôn tập</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-outline btn-sm" onClick={() => { excelService.clearStorage(); setSheets({}); setPhase('upload'); }}>
            <Trash2 size={14} /> Xóa data
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => setPhase('upload')}>
            Tải file khác
          </button>
        </div>
      </div>

      <div className="card card-p">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontWeight: 700 }}>Chọn nhóm từ vựng:</h3>
          <button className="btn btn-outline btn-sm" onClick={toggleAll}>
            {Object.values(selected).every(Boolean) ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
          </button>
        </div>

        <div className="sheet-grid" style={{ marginBottom: 20 }}>
          {Object.entries(sheets).map(([name, list]) => (
            <div key={name} className={`sheet-chip ${selected[name] ? 'selected' : ''}`}
              onClick={() => setSelected(s => ({ ...s, [name]: !s[name] }))}>
              <div className="sheet-chip-name">{name}</div>
              <div className="sheet-chip-count">{list.length} từ</div>
            </div>
          ))}
        </div>

        {error && <p style={{ color: 'var(--danger)', marginBottom: 12, fontWeight: 600 }}>{error}</p>}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <button className="btn btn-primary btn-lg" onClick={() => startStudy(true)}>
            <Shuffle size={18} /> Trộn ngẫu nhiên
          </button>
          <button className="btn btn-lg" style={{ background: 'var(--success)', color: 'white' }} onClick={() => startStudy(false)}>
            <ListOrdered size={18} /> Theo thứ tự
          </button>
        </div>
      </div>
    </div>
  );

  // ── Study Phase ──
  if (!card) return null;

  if (activeQuiz) {
    return (
      <div style={{ padding: 20 }}>
        <UniversalQuizPage
          title={activeQuiz.title}
          items={activeQuiz.items}
          onBack={() => setActiveQuiz(null)}
        />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 160px)', maxWidth: 1100, margin: '0 auto' }}>
      {/* Controls row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ background: 'white', border: '1px solid var(--border)', padding: '6px 14px', borderRadius: 99, fontSize: 13, fontWeight: 700 }}>
            {idx + 1} / {cards.length}
          </span>
          <div style={{ display: 'flex', background: 'white', border: '1px solid var(--border)', borderRadius: 99, overflow: 'hidden' }}>
            <input type="number" value={jumpTo} onChange={e => setJumpTo(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleJump()}
              placeholder="Đến thẻ..." min={1} max={cards.length}
              style={{ width: 90, padding: '6px 12px', border: 'none', outline: 'none', fontSize: 13 }} />
            <button onClick={handleJump} style={{ padding: '6px 12px', background: '#f8fafc', border: 'none', borderLeft: '1px solid var(--border)', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
              Đến
            </button>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12, fontSize: 13, alignItems: 'center' }}>
          <button 
            onClick={toggleAutoPlay}
            style={{ 
              display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', 
              background: autoPlayState === 'playing' ? '#fefce8' : 'white', 
              padding: '6px 16px', borderRadius: 99, 
              border: `1px solid ${autoPlayState === 'playing' ? '#eab308' : 'var(--border)'}`, 
              fontWeight: 700, 
              color: autoPlayState === 'playing' ? '#ca8a04' : 'var(--text-secondary)',
              transition: 'all 0.2s ease'
            }}>
            <Play size={14} style={{ fill: autoPlayState === 'playing' ? 'currentColor' : 'none' }} />
            {autoPlayState === 'playing' ? 'Đang Auto-play' : 'Auto-play'}
          </button>
          
          <button
            onClick={() => {
              setAutoPlayState('idle');
              const items: QuizItem[] = cards.map(c => ({
                question: c.kanji || c.kana,
                answer: c.vietnamese,
                hint: c.hanViet || c.kana || undefined,
                kana: c.kanji ? c.kana : undefined,
                hanViet: c.hanViet || undefined
              }));
              setActiveQuiz({ title: 'Test Từ Vựng Đang Học', items });
            }}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
              background: 'linear-gradient(to right, #4f46e5, #7c3aed)',
              color: 'white', padding: '8px 16px', borderRadius: 999, border: 'none',
              fontWeight: 800, boxShadow: '0 3px 10px rgba(79, 70, 229, 0.3)',
              minWidth: 140, justifyContent: 'center'
            }}
          >
            <Award size={14} />
            Test từ vựng
          </button>

          <span style={{ color: 'var(--success)', fontWeight: 700 }}>✅ {knownCount}</span>
          <span style={{ color: 'var(--danger)', fontWeight: 700 }}>❌ {hardCount}</span>
          <button className="btn btn-outline btn-sm" onClick={() => {
            setAutoPlayState('idle');
            setPhase('select');
          }}>← Quay lại</button>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8, marginBottom: 8 }}>
        <button
          onClick={() => {
            setAutoPlayState('idle');
            const items: QuizItem[] = cards.map(c => ({
              question: c.kanji || c.kana,
              answer: c.vietnamese,
              hint: c.hanViet || c.kana || undefined,
              kana: c.kanji ? c.kana : undefined,
              hanViet: c.hanViet || undefined
            }));
            setActiveQuiz({ title: 'Test Từ Vựng Đang Học', items });
          }}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer',
            background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
            color: 'white', padding: '10px 16px', borderRadius: 999, border: 'none',
            fontWeight: 800, boxShadow: '0 3px 12px rgba(79, 70, 229, 0.25)'
          }}
        >
          <Award size={14} />
          Bắt đầu test từ vựng
        </button>
      </div>

      {/* Card area */}
      <div style={{ flex: 1, display: 'flex', gap: 16, minHeight: 0 }}>
        {/* Main card */}
        <div className="flashcard-wrap" style={{ position: 'relative' }} onClick={handleFlip}>
          {/* Front */}
          <div className={`flashcard-face front ${flipped ? 'flipped' : ''}`}>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16, textTransform: 'uppercase', letterSpacing: 2 }}>
                Click để lật thẻ
              </p>
              <div className="kanji-main text-ja">{card.kanji}</div>
            </div>
          </div>

          {/* Back */}
          <div className={`flashcard-face back ${flipped ? 'flipped' : ''}`} style={{ justifyContent: 'flex-start', overflow: 'hidden' }}>
            <div style={{ width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <div className="kanji-main text-ja" style={{ fontSize: 'clamp(36px,7vw,64px)', textAlign: 'left' }}>{card.kanji}</div>
                  {card.hanViet && <div className="card-hv">{card.hanViet}</div>}
                  <div className="card-kana text-ja">{card.kana}</div>
                  <div className="card-vi">{card.vietnamese}</div>
                </div>
                <button className="btn btn-icon btn-ghost" style={{ borderRadius: '50%', width: 48, height: 48 }}
                  onClick={e => { e.stopPropagation(); speechService.speakFlashcard(card.kana, card.vietnamese, card.hanViet); }}>
                  <Play size={18} fill="currentColor" />
                </button>
              </div>

              <div style={{ borderTop: '1px solid var(--border)', margin: '16px 0' }} />

              {/* Example */}
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, color: 'var(--primary)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <BrainCircuit size={14} /> AI sinh câu ví dụ
                </p>
                {exampleLoading ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: 13 }}>
                    <Loader2 size={14} className="animate-spin" /> Đang tạo câu...
                  </div>
                ) : example ? (
                  <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 16px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <button className="btn btn-icon" style={{ background: 'var(--primary-50)', color: 'var(--primary)', width: 36, height: 36, flexShrink: 0 }}
                      onClick={e => { e.stopPropagation(); speechService.speakJapanese(example.ja); }}>
                      <Play size={14} fill="currentColor" />
                    </button>
                    <div>
                      <p className="text-ja" style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>{example.ja}</p>
                      <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>{example.vi}</p>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            {/* Kanji panel trigger (vertical tab) */}
            {!showKanji && (
              <button onClick={e => { e.stopPropagation(); openKanji(); }}
                style={{
                  position: 'absolute', right: -36, top: '50%', transform: 'translateY(-50%)',
                  background: 'white', border: '1px solid var(--border)', borderLeft: 'none',
                  borderRadius: '0 12px 12px 0', padding: '12px 8px',
                  cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                  color: 'var(--text-secondary)', transition: 'all 150ms ease'
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--primary)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)'; }}>
                <BrainCircuit size={16} />
                <span style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', fontSize: 10, fontWeight: 700, letterSpacing: 2 }}>漢字</span>
              </button>
            )}
          </div>
        </div>

        {/* Kanji Panel */}
        {showKanji && (
          <div className="kanji-panel">
            <div style={{ padding: '12px 16px', background: '#f8fafc', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                <BrainCircuit size={16} style={{ color: 'var(--primary)' }} /> Phân tích Hán tự
              </span>
              <button className="btn btn-icon btn-sm" style={{ background: 'transparent' }} onClick={() => setShowKanji(false)}>
                <X size={16} />
              </button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
              {!kanjiData || kanjiData.components.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', paddingTop: 24 }}>
                  <p style={{ fontSize: 24, marginBottom: 8 }}>🔤</p>
                  <p>Không có Hán tự trong từ này</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ textAlign: 'center', paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
                    <p style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 2, color: 'var(--text-muted)', marginBottom: 4 }}>Âm Hán Việt</p>
                    <p style={{ fontSize: 20, fontWeight: 900, color: '#dc2626' }}>{kanjiData.fullHanViet}</p>
                  </div>
                  {kanjiData.components.map((c, i) => (
                    <div key={i} style={{ background: '#f8fafc', borderRadius: 14, padding: 14, border: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 10, paddingBottom: 8, borderBottom: '1px solid var(--border)' }}>
                        <span className="text-ja" style={{ fontSize: 40, fontWeight: 900 }}>{c.char}</span>
                        <span style={{ fontSize: 14, fontWeight: 800, color: '#dc2626', background: '#fef2f2', padding: '4px 10px', borderRadius: 8 }}>{c.hanViet}</span>
                      </div>
                      <div style={{ fontSize: 13, display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <Row label="Nghĩa" val={c.meaning} />
                        <Row label="On" val={c.on} />
                        <Row label="Kun" val={c.kun || '—'} />
                        <Row label="Bộ thủ" val={c.radical} />
                        <Row label="Số nét" val={String(c.strokes)} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, padding: '0 4px' }}>
        <button className="btn btn-icon" style={{ width: 52, height: 52, borderRadius: 16, background: 'white', border: '1px solid var(--border)' }}
          onClick={prev} disabled={idx === 0}>
          <ChevronLeft size={24} />
        </button>

        <div style={{ display: 'flex', gap: 10, flex: 1, justifyContent: 'center', maxWidth: 400, margin: '0 12px' }}>
          <button className="btn btn-lg" style={{ flex: 1, background: '#fef2f2', color: 'var(--danger)', border: '1.5px solid #fecaca' }}
            onClick={() => next(false)}>
            <AlertCircle size={16} /> Khó nhớ
          </button>
          <button className="btn btn-lg btn-success" style={{ flex: 1 }}
            onClick={() => next(true)}>
            <CheckCircle size={16} /> Đã thuộc
          </button>
        </div>

        <button className="btn btn-icon" style={{ width: 52, height: 52, borderRadius: 16, background: 'white', border: '1px solid var(--border)' }}
          onClick={() => next()} disabled={idx === cards.length - 1}>
          <ChevronRight size={24} />
        </button>
      </div>
    </div>
  );
}

function Row({ label, val }: { label: string; val: string }) {
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <span style={{ fontWeight: 700, color: 'var(--text-muted)', minWidth: 56 }}>{label}:</span>
      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{val}</span>
    </div>
  );
}

function getMockExample(card: FlashCard) {
  return {
    ja: `彼女は新しい${card.kanji}を買いました。`,
    vi: `Cô ấy đã mua ${card.vietnamese} mới.`,
  };
}
