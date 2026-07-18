import { useState, useEffect, useRef } from 'react';
import { Play, Pause, BookOpen, Headphones, Loader2, AlertCircle, Sparkles, Volume2 } from 'lucide-react';
import { speechService } from '../services/speechService';

type Level = 'N5' | 'N4' | 'N3' | 'N2' | 'N1';

const LEVELS: Level[] = ['N5', 'N4', 'N3', 'N2', 'N1'];
const LEVEL_INDEX: Record<Level, string> = {
  'N5': '01',
  'N4': '02',
  'N3': '03',
  'N2': '04',
  'N1': '05'
};

const isHeaderLine = (text: string) => {
  const t = text.trim();
  const headers = ['文型', '例文', '会話', '練習 A', '練習 B', '練習 C', '問題', 'Phần 1:', 'Phần 2:', 'Phần 3:'];
  return headers.some(h => t.startsWith(h));
};

export default function ChopchepPage() {
  const [selectedLevel, setSelectedLevel] = useState<Level | null>('N5');
  const [selectedLesson, setSelectedLesson] = useState<number | null>(null);
  const [lines, setLines] = useState<string[]>([]);
  const [currentLineIndex, setCurrentLineIndex] = useState<number>(-1);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAutoPlayingRef = useRef(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const lineRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isAutoPlayingRef.current = false;
      setIsAutoPlaying(false);
      speechService.cancel();
    };
  }, []);

  // Fetch file when level & lesson change
  useEffect(() => {
    if (!selectedLevel || !selectedLesson) return;

    const fetchFile = async () => {
      setIsLoading(true);
      setError(null);
      setLines([]);
      setCurrentLineIndex(-1);
      setIsAutoPlaying(false);
      isAutoPlayingRef.current = false;
      speechService.cancel();

      const levelIdx = LEVEL_INDEX[selectedLevel];
      const lessonIdx = selectedLesson.toString().padStart(2, '0');
      const filename = `/chopchep/chopchep_${levelIdx}_${lessonIdx}.txt`;

      try {
        const res = await fetch(filename);
        if (!res.ok) {
          throw new Error('Bài học này chưa có nội dung');
        }
        const text = await res.text();
        const splitLines = text.split(/\r?\n/);
        setLines(splitLines);
      } catch (err: any) {
        setError(err.message || 'Lỗi khi tải dữ liệu bài học');
      } finally {
        setIsLoading(false);
      }
    };

    fetchFile();
  }, [selectedLevel, selectedLesson]);

  // Scroll to current line
  useEffect(() => {
    if (currentLineIndex >= 0 && lineRefs.current[currentLineIndex]) {
      lineRefs.current[currentLineIndex]?.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }
  }, [currentLineIndex]);

  const detectLang = (text: string): 'ja-JP' | 'vi-VN' => {
    return /[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uffef\u4e00-\u9faf]/.test(text) ? 'ja-JP' : 'vi-VN';
  };

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const toggleAutoPlay = async () => {
    if (isAutoPlaying) {
      isAutoPlayingRef.current = false;
      setIsAutoPlaying(false);
      speechService.cancel();
      return;
    }

    isAutoPlayingRef.current = true;
    setIsAutoPlaying(true);
    let startIndex = currentLineIndex >= 0 ? currentLineIndex : 0;
    
    if (startIndex >= lines.length - 1 && startIndex > 0) {
      startIndex = 0;
    }

    await speechService.unlockAudio();

    for (let i = startIndex; i < lines.length; i++) {
      if (!isAutoPlayingRef.current) break;
      
      const line = lines[i].trim();
      if (!line) continue;
      
      setCurrentLineIndex(i);
      const lang = detectLang(line);
      await speechService.speak(line, { lang, rate: 0.85 });
      
      if (!isAutoPlayingRef.current) break;
      await delay(300);
    }
    
    setIsAutoPlaying(false);
    isAutoPlayingRef.current = false;
  };

  const readCurrentLine = async () => {
    if (isAutoPlaying) {
      isAutoPlayingRef.current = false;
      setIsAutoPlaying(false);
      speechService.cancel();
    }
    
    await speechService.unlockAudio();
    let indexToRead = currentLineIndex >= 0 ? currentLineIndex : 0;
    
    while (indexToRead < lines.length && !lines[indexToRead].trim()) {
      indexToRead++;
    }
    
    if (indexToRead >= lines.length) return;
    
    setCurrentLineIndex(indexToRead);
    const line = lines[indexToRead].trim();
    if (line) {
      const lang = detectLang(line);
      await speechService.speak(line, { lang, rate: 0.85 });
    }
    
    let nextIndex = indexToRead + 1;
    while (nextIndex < lines.length && !lines[nextIndex].trim()) {
      nextIndex++;
    }
    
    if (nextIndex < lines.length) {
      setCurrentLineIndex(nextIndex);
    }
  };

  const stopReading = () => {
    isAutoPlayingRef.current = false;
    setIsAutoPlaying(false);
    speechService.cancel();
  };

  return (
    <div className="page-inner" style={{ paddingBottom: 100 }}>
      {/* Header Banner - Premium Gradient & Glassmorphism */}
      <div 
        style={{ 
          background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
          marginBottom: 32,
          padding: 32,
          borderRadius: 24,
          color: 'white',
          boxShadow: 'var(--shadow-lg)',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <div style={{ position: 'absolute', top: 0, right: 0, padding: 32, opacity: 0.2 }}>
          <Headphones size={120} />
        </div>
        <div style={{ position: 'relative', zIndex: 10, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ 
            padding: 12, 
            background: 'rgba(255,255,255,0.2)', 
            borderRadius: 16, 
            backdropFilter: 'blur(8px)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
          }}>
            <Volume2 size={32} color="white" />
          </div>
          <div>
            <h1 style={{ fontSize: 32, fontWeight: 900, letterSpacing: '-0.5px' }}>Chopchep 聴解</h1>
            <p style={{ color: 'rgba(255,255,255,0.9)', fontWeight: 600, marginTop: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
              Luyện nghe tiếng Nhật phản xạ <Sparkles size={16} color="#fde047" />
            </p>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
        
        {/* Left Column: Navigation (Level & Lesson) */}
        <div style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div className="card card-p" style={{ border: '1px solid var(--border)' }}>
            <h3 style={{ fontWeight: 800, fontSize: 18, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-primary)' }}>
              <span style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--primary-50)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>1</span>
              Chọn cấp độ
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {LEVELS.map(level => {
                const isActive = selectedLevel === level;
                return (
                  <button
                    key={level}
                    style={{
                      flex: '1 1 60px',
                      padding: '12px 0',
                      borderRadius: 12,
                      fontWeight: 800,
                      transition: 'all 200ms ease',
                      border: isActive ? 'none' : '1px solid var(--border)',
                      background: isActive ? 'var(--primary)' : 'var(--bg)',
                      color: isActive ? 'white' : 'var(--text-secondary)',
                      transform: isActive ? 'scale(1.05)' : 'none',
                      boxShadow: isActive ? '0 4px 12px rgba(79,70,229,0.3)' : 'none',
                      cursor: 'pointer'
                    }}
                    onClick={() => {
                      setSelectedLevel(level);
                      setSelectedLesson(null);
                      setLines([]);
                      setCurrentLineIndex(-1);
                      stopReading();
                    }}
                  >
                    {level}
                  </button>
                )
              })}
            </div>
          </div>

          {selectedLevel && (
            <div className="card card-p" style={{ border: '1px solid var(--border)' }}>
              <h3 style={{ fontWeight: 800, fontSize: 18, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-primary)' }}>
                <span style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--primary-50)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>2</span>
                Chọn bài ({selectedLevel})
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
                {Array.from({ length: 25 }, (_, i) => i + 1).map(lesson => {
                  const isActive = selectedLesson === lesson;
                  return (
                    <button
                      key={lesson}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: 48,
                        borderRadius: 12,
                        fontSize: 14,
                        fontWeight: 800,
                        transition: 'all 200ms ease',
                        border: isActive ? 'none' : '1px solid var(--border)',
                        background: isActive ? 'var(--primary)' : 'var(--bg)',
                        color: isActive ? 'white' : 'var(--text-secondary)',
                        transform: isActive ? 'scale(1.05)' : 'none',
                        boxShadow: isActive ? '0 4px 12px rgba(79,70,229,0.3)' : 'none',
                        cursor: 'pointer'
                      }}
                      onClick={() => setSelectedLesson(lesson)}
                    >
                      {lesson}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Player & Content */}
        <div style={{ flex: '2 1 600px' }}>
          <div className="card" style={{ 
            border: '1px solid var(--border)', 
            overflow: 'hidden', 
            display: 'flex', 
            flexDirection: 'column', 
            height: 650, 
            position: 'relative' 
          }}>
            
            {/* Empty State */}
            {!selectedLesson && !isLoading && !error && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', background: 'rgba(248, 250, 252, 0.5)', padding: 32 }}>
                <div style={{ width: 96, height: 96, borderRadius: '50%', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
                  <Headphones size={48} color="var(--border)" />
                </div>
                <h3 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 }}>Chưa chọn bài học</h3>
                <p style={{ textAlign: 'center', maxWidth: 300, lineHeight: 1.5 }}>Hãy chọn cấp độ và bài học ở cột bên trái để bắt đầu phần luyện nghe Chopchep.</p>
              </div>
            )}

            {/* Loading State */}
            {isLoading && (
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(4px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 20 }}>
                <div style={{ animation: 'spin 1s linear infinite', marginBottom: 16 }}>
                  <Loader2 size={48} color="var(--primary)" />
                </div>
                <span style={{ fontWeight: 800, fontSize: 18, color: 'var(--primary)' }}>Đang tải bài học...</span>
              </div>
            )}
            
            {/* Error State */}
            {error && !isLoading && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', background: 'rgba(248, 250, 252, 0.5)', padding: 32, textAlign: 'center' }}>
                <div style={{ width: 96, height: 96, borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24, color: 'var(--danger)' }}>
                  <AlertCircle size={48} />
                </div>
                <h3 style={{ fontSize: 20, fontWeight: 800, color: 'var(--danger)', marginBottom: 8 }}>{error}</h3>
                <p style={{ maxWidth: 350, lineHeight: 1.5 }}>Hiện tại hệ thống chỉ cung cấp bài N5 Bài 15 làm dữ liệu luyện tập mẫu.</p>
                <button 
                  className="btn btn-outline"
                  style={{ marginTop: 24 }}
                  onClick={() => { setSelectedLevel('N5'); setSelectedLesson(15); }}
                >
                  Mở bài 15 (N5)
                </button>
              </div>
            )}

            {/* Content State */}
            {!isLoading && !error && lines.length > 0 && (
              <>
                {/* Floating Player Controls */}
                <div style={{ 
                  background: 'rgba(255,255,255,0.85)', 
                  backdropFilter: 'blur(12px)', 
                  borderBottom: '1px solid rgba(0,0,0,0.05)', 
                  padding: 16, 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between', 
                  zIndex: 10, 
                  position: 'sticky', 
                  top: 0 
                }}>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <button 
                      style={{
                        height: 48,
                        padding: '0 24px',
                        borderRadius: 24,
                        fontWeight: 800,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        transition: 'all 200ms ease',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'white',
                        background: isAutoPlaying ? 'var(--danger)' : 'var(--success)',
                        boxShadow: isAutoPlaying ? '0 4px 12px rgba(239, 68, 68, 0.3)' : '0 4px 12px rgba(16, 185, 129, 0.3)',
                      }}
                      onClick={toggleAutoPlay}
                    >
                      {isAutoPlaying ? <Pause size={18} /> : <Play size={18} />}
                      {isAutoPlaying ? 'Tạm dừng' : 'Nghe toàn bài'}
                    </button>
                    
                    <button 
                      style={{
                        height: 48,
                        padding: '0 24px',
                        borderRadius: 24,
                        fontWeight: 800,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        transition: 'all 200ms ease',
                        border: 'none',
                        cursor: isAutoPlaying ? 'not-allowed' : 'pointer',
                        color: 'var(--primary)',
                        background: 'var(--primary-50)',
                        opacity: isAutoPlaying ? 0.5 : 1
                      }}
                      onClick={readCurrentLine}
                      disabled={isAutoPlaying}
                    >
                      <BookOpen size={18} />
                      Nghe từng câu
                    </button>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ 
                      fontSize: 14, 
                      fontWeight: 800, 
                      color: 'var(--text-muted)', 
                      background: 'var(--bg)', 
                      padding: '8px 16px', 
                      borderRadius: 24 
                    }}>
                      <span style={{ color: 'var(--primary)' }}>{currentLineIndex >= 0 ? currentLineIndex + 1 : 0}</span> / {lines.length}
                    </div>
                  </div>
                </div>

                {/* Text View Area */}
                <div 
                  ref={contentRef}
                  style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: 24,
                    scrollBehavior: 'smooth',
                    background: '#f8fafc',
                    backgroundImage: 'radial-gradient(#e2e8f0 1px, transparent 1px)',
                    backgroundSize: '24px 24px'
                  }}
                >
                  <div style={{ maxWidth: 768, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {lines.map((line, idx) => {
                      const isCurrent = idx === currentLineIndex;
                      const isPast = idx < currentLineIndex;
                      const isHeader = isHeaderLine(line);
                      const isGrammar = line.trim().startsWith('Cấu trúc ngữ pháp:');
                      
                      return (
                        <div 
                          key={idx}
                          ref={el => { lineRefs.current[idx] = el; }}
                          onClick={() => {
                            setCurrentLineIndex(idx);
                            stopReading();
                          }}
                          style={{
                            padding: isHeader ? '24px 20px 8px' : '12px 20px',
                            borderRadius: 16,
                            cursor: 'pointer',
                            transition: 'all 300ms ease',
                            fontSize: isHeader ? 22 : 16,
                            lineHeight: 1.6,
                            wordBreak: 'break-word',
                            minHeight: isHeader ? 'auto' : 56,
                            borderLeft: isCurrent && !isHeader ? '4px solid var(--primary)' : '4px solid transparent',
                            borderBottom: isHeader ? '2px solid #e2e8f0' : 'none',
                            background: isCurrent && !isHeader ? 'white' : 'transparent',
                            color: isGrammar ? '#d97706' : (isCurrent && !isHeader ? 'var(--primary)' : (isHeader ? '#0f172a' : 'var(--text-primary)')),
                            fontWeight: isCurrent || isHeader || isGrammar ? 800 : 500,
                            transform: isCurrent && !isHeader ? 'scale(1.02)' : 'none',
                            boxShadow: isCurrent && !isHeader ? '0 8px 24px rgba(79,70,229,0.1)' : 'none',
                            zIndex: isCurrent ? 10 : 1,
                            position: 'relative',
                            opacity: (isPast && !isCurrent && !isHeader) ? 0.6 : 1,
                            letterSpacing: isHeader ? '-0.5px' : 'normal'
                          }}
                          onMouseEnter={(e) => {
                            if (!isCurrent && !isHeader) {
                              e.currentTarget.style.background = 'white';
                              e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)';
                              e.currentTarget.style.opacity = '1';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isCurrent && !isHeader) {
                              e.currentTarget.style.background = 'transparent';
                              e.currentTarget.style.boxShadow = 'none';
                              e.currentTarget.style.opacity = (isPast && !isCurrent) ? '0.6' : '1';
                            }
                          }}
                        >
                          {line}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
