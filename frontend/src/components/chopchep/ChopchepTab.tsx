import { useState, useEffect, useRef } from 'react';
import { Play, Pause, Loader2, AlertCircle, Volume2, BookOpen } from 'lucide-react';
import { speechService } from '../../services/speechService';

const isHeaderLine = (text: string) => {
  const t = text.trim();
  const headers = ['文型', '例文', '会話', '練習 A', '練習 B', '練習 C', '問題', 'Phần 1:', 'Phần 2:', 'Phần 3:', 'Bài 1', 'Bài 2', 'Bài 3', 'Bài 4', 'Bài 5', 'Bài 6', 'Bài 7'];
  return headers.some(h => t.startsWith(h));
};

export default function ChopchepTab() {
  const [selectedLesson, setSelectedLesson] = useState<number>(1);
  const [allLessons, setAllLessons] = useState<Record<number, string[]>>({});
  const [lines, setLines] = useState<string[]>([]);
  const [currentLineIndex, setCurrentLineIndex] = useState<number>(-1);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAutoPlayingRef = useRef(false);
  const lineRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    return () => {
      isAutoPlayingRef.current = false;
      setIsAutoPlaying(false);
      speechService.cancel();
    };
  }, []);

  useEffect(() => {
    const fetchFile = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch('/chopchep/chopchep.txt');
        if (!res.ok) throw new Error('Không tìm thấy dữ liệu chopchep.txt');
        const text = await res.text();
        const splitLines = text.split(/\r?\n/);
        
        const lessons: Record<number, string[]> = {};
        let currentLesson = 0;
        
        for (let i = 0; i < splitLines.length; i++) {
          const line = splitLines[i];
          const match = line.match(/^第(\d+)課/);
          if (match) {
            currentLesson = parseInt(match[1]);
          }
          
          if (currentLesson >= 1 && currentLesson <= 15) {
            if (!lessons[currentLesson]) lessons[currentLesson] = [];
            lessons[currentLesson].push(line);
          }
        }
        setAllLessons(lessons);
      } catch (err: any) {
        setError(err.message || 'Lỗi khi tải dữ liệu bài học');
      } finally {
        setIsLoading(false);
      }
    };
    fetchFile();
  }, []);

  useEffect(() => {
    if (allLessons[selectedLesson]) {
      setLines(allLessons[selectedLesson]);
      setCurrentLineIndex(-1);
      setIsAutoPlaying(false);
      isAutoPlayingRef.current = false;
      speechService.cancel();
    }
  }, [selectedLesson, allLessons]);

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

    setIsAutoPlaying(true);
    isAutoPlayingRef.current = true;
    let startIdx = currentLineIndex >= 0 ? currentLineIndex : 0;

    for (let i = startIdx; i < lines.length; i++) {
      if (!isAutoPlayingRef.current) break;
      const text = lines[i].trim();
      if (!text || isHeaderLine(text) || text.startsWith('第')) continue;

      setCurrentLineIndex(i);
      const lang = detectLang(text);
      await speechService.speak(text, { lang, rate: 0.9 });
      if (!isAutoPlayingRef.current) break;
      await delay(500);
    }

    if (isAutoPlayingRef.current) {
      setIsAutoPlaying(false);
      isAutoPlayingRef.current = false;
      setCurrentLineIndex(-1);
    }
  };

  const playLine = async (index: number) => {
    isAutoPlayingRef.current = false;
    setIsAutoPlaying(false);
    speechService.cancel();
    
    setCurrentLineIndex(index);
    const text = lines[index].trim();
    if (text && !isHeaderLine(text) && !text.startsWith('第')) {
      const lang = detectLang(text);
      await speechService.speak(text, { lang, rate: 0.9 });
    }
  };

  return (
    <div className="np-layout">
      {/* Sidebar for Lessons */}
      <div className="np-sidebar">
        <div className="np-sidebar-header">
          <BookOpen size={20} />
          Bài học
        </div>
        <div className="np-lesson-list">
          {Array.from({length: 15}, (_, i) => i + 1).map(num => (
            <button
              key={num}
              onClick={() => setSelectedLesson(num)}
              className={`np-lesson-btn ${selectedLesson === num ? 'active' : ''}`}
            >
              Bài {num}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="chopchep-content-area" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div className="chopchep-controls" style={{ justifyContent: 'flex-end', borderBottom: '1px solid var(--border)' }}>
          <button
            onClick={toggleAutoPlay}
            disabled={lines.length === 0}
            className={`chopchep-btn-play ${isAutoPlaying ? 'playing' : ''}`}
          >
            {isAutoPlaying ? <Pause size={18} /> : <Play size={18} />}
            {isAutoPlaying ? 'Dừng đọc' : 'Đọc tự động'}
          </button>
        </div>

        <div className="chopchep-list-container">
          <div className="chopchep-list-inner">
          {isLoading && (
            <div className="center-message">
              <Loader2 className="animate-spin" size={32} />
              <p>Đang tải bài học...</p>
            </div>
          )}
          
          {error && (
            <div className="center-message error">
              <AlertCircle size={48} />
              <p>{error}</p>
            </div>
          )}

          {!isLoading && !error && lines.map((line, index) => {
            const isHeader = isHeaderLine(line) || line.startsWith('第');
            const isActive = index === currentLineIndex;
            const isEmpty = !line.trim();

            if (isEmpty) return <div key={index} style={{ height: '16px' }} />;

            if (isHeader) {
              return (
                <div 
                  key={index} 
                  ref={el => { lineRefs.current[index] = el; }}
                  className="chopchep-header-sticky"
                >
                  <div className="chopchep-header-badge">
                    {line}
                  </div>
                </div>
              );
            }

            const isConversation = line.includes('：');
            const [speaker, ...speechParts] = isConversation ? line.split('：') : [];
            const speech = speechParts.join('：');

            return (
              <div
                key={index}
                ref={el => { lineRefs.current[index] = el; }}
                onClick={() => playLine(index)}
                className={`chopchep-line-item ${isActive ? 'active' : ''}`}
              >
                <div className="chopchep-icon">
                  <Volume2 size={20} />
                </div>
                
                <div className="chopchep-text-main">
                  {isConversation ? (
                    <div>
                      <span className="chopchep-speaker">{speaker}</span>
                      <span>
                        {speech.split('(').map((part, i) => 
                          i === 0 ? <span key={i}>{part}</span> : <span key={i} className="chopchep-text-trans">({part}</span>
                        )}
                      </span>
                    </div>
                  ) : (
                    <div>
                      {line.split('(').map((part, i) => 
                        i === 0 ? <span key={i}>{part}</span> : <span key={i} className="chopchep-text-trans">({part}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
      </div>
    </div>
    </div>
    </div>
  );
}
