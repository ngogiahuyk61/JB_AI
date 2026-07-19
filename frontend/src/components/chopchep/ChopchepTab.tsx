import { useState, useEffect, useRef } from 'react';
import { Play, Pause, Loader2, AlertCircle, Volume2 } from 'lucide-react';
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

  // Fetch and parse chopchep.txt once
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

  // Update lines when selectedLesson or allLessons changes
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
    <div className="flex-1 flex flex-col h-full bg-[#0a0a0a]">
      {/* Controls */}
      <div className="flex-none p-4 bg-[#111111] border-b border-white/5 shadow-md flex items-center justify-between z-10">
        <div className="flex items-center gap-4">
          <select 
            value={selectedLesson}
            onChange={(e) => setSelectedLesson(Number(e.target.value))}
            className="bg-[#1a1a1a] border border-white/10 text-white rounded-xl px-4 py-2 outline-none focus:border-indigo-500 transition-colors font-medium shadow-inner"
          >
            {Array.from({length: 15}, (_, i) => i + 1).map(num => (
              <option key={num} value={num}>Bài {num}</option>
            ))}
          </select>
        </div>

        <button
          onClick={toggleAutoPlay}
          disabled={lines.length === 0}
          className={`flex items-center gap-2 px-6 py-2 rounded-xl font-medium transition-all shadow-lg hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed ${
            isAutoPlaying 
              ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20'
              : 'bg-indigo-600 text-white hover:bg-indigo-500'
          }`}
        >
          {isAutoPlaying ? <Pause size={18} /> : <Play size={18} />}
          {isAutoPlaying ? 'Dừng đọc' : 'Đọc tự động'}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth">
        <div className="max-w-3xl mx-auto space-y-2 pb-24">
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-20 text-white/50">
              <Loader2 className="w-8 h-8 animate-spin mb-4" />
              <p>Đang tải bài học...</p>
            </div>
          )}
          
          {error && (
            <div className="flex flex-col items-center justify-center py-20 text-red-400">
              <AlertCircle className="w-12 h-12 mb-4 opacity-50" />
              <p>{error}</p>
            </div>
          )}

          {!isLoading && !error && lines.map((line, index) => {
            const isHeader = isHeaderLine(line) || line.startsWith('第');
            const isActive = index === currentLineIndex;
            const isEmpty = !line.trim();

            if (isEmpty) return <div key={index} className="h-4" />;

            if (isHeader) {
              return (
                <div 
                  key={index} 
                  ref={el => { lineRefs.current[index] = el; }}
                  className="pt-8 pb-4 sticky top-0 bg-[#0a0a0a]/95 backdrop-blur-xl z-10"
                >
                  <div className="inline-block bg-gradient-to-r from-amber-400 to-orange-400 text-black font-black px-6 py-2.5 rounded-xl shadow-[0_4px_20px_rgba(251,191,36,0.3)] text-lg uppercase tracking-widest border border-amber-300">
                    {line}
                  </div>
                </div>
              );
            }

            const isConversation = line.includes('：');
            const [speaker, ...speechParts] = isConversation ? line.split('：') : [];
            const speech = speechParts.join('：'); // in case there are multiple colons

            return (
              <div
                key={index}
                ref={el => { lineRefs.current[index] = el; }}
                onClick={() => playLine(index)}
                className={`group flex items-start gap-4 p-5 rounded-2xl transition-all duration-300 cursor-pointer border ${
                  isActive 
                    ? 'bg-indigo-600/20 border-indigo-500 shadow-[0_0_30px_rgba(79,70,229,0.15)] scale-[1.01] transform' 
                    : 'bg-[#151515] border-white/5 hover:bg-[#1a1a1a] hover:border-indigo-500/30 hover:shadow-lg'
                }`}
              >
                <button className={`mt-1 flex-none transition-colors duration-300 ${isActive ? 'text-indigo-400 scale-110' : 'text-white/20 group-hover:text-white/40'}`}>
                  <Volume2 size={20} />
                </button>
                <div className="flex-1 text-base md:text-lg leading-relaxed">
                  {isConversation ? (
                    <div className="flex flex-col gap-1">
                      <span className={`text-xs font-black uppercase tracking-widest ${isActive ? 'text-indigo-300' : 'text-amber-500/80'}`}>
                        {speaker}
                      </span>
                      <span className={`${isActive ? 'text-indigo-50' : 'text-white/90'}`}>
                        {speech.split('(').map((part, i) => 
                          i === 0 ? <span key={i}>{part}</span> : <span key={i} className={`${isActive ? 'text-indigo-200/60' : 'text-white/40'} text-sm ml-1`}>({part}</span>
                        )}
                      </span>
                    </div>
                  ) : (
                    <div className={`${isActive ? 'text-indigo-50' : 'text-white/90'}`}>
                      {line.split('(').map((part, i) => 
                        i === 0 ? <span key={i}>{part}</span> : <span key={i} className={`${isActive ? 'text-indigo-200/60' : 'text-white/40'} text-sm ml-1`}>({part}</span>
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
  );
}
