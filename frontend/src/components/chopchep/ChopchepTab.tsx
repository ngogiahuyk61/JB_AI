import { useState, useEffect, useRef } from 'react';
import { Play, Pause, Loader2, AlertCircle, BookOpen } from 'lucide-react';
import ChopchepLine, { parseForSpeech } from './ChopchepLine';
import { speechService } from '../../services/speechService';

const isHeaderLine = (text: string) => {
  const t = text.trim();
  const headers = ['文型', '例文', '会話', '練習 A', '練習 B', '練習 C', '問題', 'Phần 1:', 'Phần 2:', 'Phần 3:', 'Bài 1', 'Bài 2', 'Bài 3', 'Bài 4', 'Bài 5', 'Bài 6', 'Bài 7'];
  return headers.some(h => t.startsWith(h));
};

export default function ChopchepTab() {
  const [selectedLesson, setSelectedLesson] = useState<number | null>(null);
  const [allLessons, setAllLessons] = useState<Record<number, string[]>>({});
  const [lines, setLines] = useState<string[]>([]);
  const [currentLineIndex, setCurrentLineIndex] = useState<number>(-1);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAutoPlayingRef = useRef(false);
  const currentPlayIdRef = useRef<number>(0);
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
    if (selectedLesson !== null && allLessons[selectedLesson]) {
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

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const toggleAutoPlay = async () => {
    if (isAutoPlaying) {
      isAutoPlayingRef.current = false;
      setIsAutoPlaying(false);
      currentPlayIdRef.current = Date.now(); // Cancel current play
      speechService.cancel();
      return;
    }

    setIsAutoPlaying(true);
    isAutoPlayingRef.current = true;
    let startIdx = currentLineIndex >= 0 ? currentLineIndex : 0;
    if (startIdx >= lines.length - 1) {
      startIdx = 0;
    }
    
    const playId = Date.now();
    currentPlayIdRef.current = playId;

    try {
      for (let i = startIdx; i < lines.length; i++) {
        if (!isAutoPlayingRef.current || currentPlayIdRef.current !== playId) break;
        const text = lines[i].trim();
        if (!text || isHeaderLine(text) || text.startsWith('第')) continue;

        setCurrentLineIndex(i);
        const { japanese, vietnamese } = parseForSpeech(text);

        if (japanese && isAutoPlayingRef.current && currentPlayIdRef.current === playId) {
          await speechService.speak(japanese, { lang: 'ja-JP', rate: 0.9 });
        }
        if (vietnamese && isAutoPlayingRef.current && currentPlayIdRef.current === playId) {
          await delay(200);
          if (currentPlayIdRef.current === playId) {
            await speechService.speak(vietnamese, { lang: 'vi-VN', rate: 0.95 });
          }
        }
        
        if (!isAutoPlayingRef.current || currentPlayIdRef.current !== playId) break;
        await delay(500);
      }
    } catch (err) {
      console.error('AutoPlay error:', err);
    }

    if (isAutoPlayingRef.current && currentPlayIdRef.current === playId) {
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
    const line = lines[index].trim();
    if (!line || isHeaderLine(line) || line.startsWith('第')) return;

    const playId = Date.now();
    currentPlayIdRef.current = playId;

    const { japanese, vietnamese } = parseForSpeech(line);
    
    if (japanese && currentPlayIdRef.current === playId) {
      await speechService.speak(japanese, { lang: 'ja-JP', rate: 0.9 });
    }
    if (vietnamese && currentPlayIdRef.current === playId) {
      await delay(200);
      if (currentPlayIdRef.current === playId) {
        await speechService.speak(vietnamese, { lang: 'vi-VN', rate: 0.95 });
      }
    }
  };

  if (selectedLesson === null) {
    return (
      <div className="lesson-grid-container">
        <div className="lesson-grid">
          {Array.from({length: 25}, (_, i) => i + 1).map(num => (
            <button
              key={num}
              onClick={() => setSelectedLesson(num)}
              disabled={num > 15} // Only 1-15 available for now
              className="lesson-grid-btn"
              style={{ opacity: num > 15 ? 0.5 : 1, cursor: num > 15 ? 'not-allowed' : 'pointer' }}
            >
              {num}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="np-layout">
      {/* Sidebar for Lessons */}
      <div className="np-sidebar">
        <div className="np-sidebar-header">
          <BookOpen size={20} />
          Bài học
        </div>
        <div className="np-lesson-grid">
          {Array.from({length: 15}, (_, i) => i + 1).map(num => (
            <button
              key={num}
              onClick={() => setSelectedLesson(num)}
              className={`np-lesson-grid-btn ${selectedLesson === num ? 'active' : ''}`}
            >
              {num}
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
            return (
              <div key={index} ref={el => { lineRefs.current[index] = el; }}>
                <ChopchepLine 
                  line={line} 
                  isActive={index === currentLineIndex}
                  onClick={() => playLine(index)}
                  isHeaderLine={isHeaderLine}
                />
              </div>
            );
          })}
      </div>
    </div>
    </div>
    </div>
  );
}
