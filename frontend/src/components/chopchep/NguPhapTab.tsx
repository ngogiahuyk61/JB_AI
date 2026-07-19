import { useState, useEffect } from 'react';
import { Loader2, AlertCircle, BookOpen, MessageCircle } from 'lucide-react';

interface GrammarItem {
  lesson: number;
  content: string;
}

export default function NguPhapTab() {
  const [grammarData, setGrammarData] = useState<GrammarItem[]>([]);
  const [selectedLesson, setSelectedLesson] = useState<number>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFile = async () => {
      setIsLoading(true);
      try {
        const res = await fetch('/chopchep/nguphaptomtat.txt');
        if (!res.ok) throw new Error('Không tìm thấy dữ liệu nguphaptomtat.txt');
        const text = await res.text();
        const splitLines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l);
        
        const data: GrammarItem[] = [];
        let i = 0;
        
        // Find the index where lesson 1 starts
        while (i < splitLines.length && splitLines[i] !== '1') {
          i++;
        }

        while (i < splitLines.length) {
          const lessonStr = splitLines[i];
          const lessonNum = parseInt(lessonStr, 10);
          
          if (!isNaN(lessonNum) && i + 1 < splitLines.length) {
            const content = splitLines[i + 1];
            data.push({ lesson: lessonNum, content });
            i += 2;
          } else {
            i++;
          }
        }
        setGrammarData(data);
      } catch (err: any) {
        setError(err.message || 'Lỗi khi tải dữ liệu ngữ pháp');
      } finally {
        setIsLoading(false);
      }
    };
    fetchFile();
  }, []);

  const currentGrammar = grammarData.find(g => g.lesson === selectedLesson);

  return (
    <div className="flex-1 flex flex-col md:flex-row h-full bg-[#0a0a0a]">
      {/* Sidebar for Lessons */}
      <div className="w-full md:w-64 bg-[#111111] border-r border-white/5 flex-none overflow-y-auto">
        <div className="p-4 border-b border-white/5 sticky top-0 bg-[#111111]/90 backdrop-blur z-10">
          <h2 className="text-lg font-bold text-white/90 flex items-center gap-2">
            <BookOpen className="text-indigo-400" size={20} />
            Bài học
          </h2>
        </div>
        <div className="p-2 space-y-1">
          {Array.from({length: 25}, (_, i) => i + 1).map(num => (
            <button
              key={num}
              onClick={() => setSelectedLesson(num)}
              className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-colors ${
                selectedLesson === num 
                  ? 'bg-indigo-600 text-white shadow-md' 
                  : 'text-white/60 hover:bg-white/5 hover:text-white/90'
              }`}
            >
              Bài {num}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-4 md:p-8 overflow-y-auto">
        <div className="max-w-3xl mx-auto">
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-20 text-white/50">
              <Loader2 className="w-8 h-8 animate-spin mb-4" />
              <p>Đang tải ngữ pháp...</p>
            </div>
          )}
          
          {error && (
            <div className="flex flex-col items-center justify-center py-20 text-red-400">
              <AlertCircle className="w-12 h-12 mb-4 opacity-50" />
              <p>{error}</p>
            </div>
          )}

          {!isLoading && !error && currentGrammar && (
            <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-6 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 bg-indigo-500/10 rounded-bl-full w-32 h-32 -z-0"></div>
              
              <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400 mb-6 relative z-10">
                Ngữ pháp Bài {selectedLesson}
              </h2>
              
              <div className="space-y-6 relative z-10">
                {currentGrammar.content.split(';').map((structure, index) => {
                  const s = structure.trim();
                  if (!s) return null;
                  return (
                    <div key={index} className="bg-black/20 p-4 rounded-xl border border-white/5">
                      <div className="text-xl font-bold text-amber-400 mb-2">{s}</div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-8 pt-6 border-t border-white/10 flex justify-end">
                <p className="text-sm text-white/40 flex items-center gap-2">
                  <MessageCircle size={16} />
                  Mở Chat AI góc phải dưới để được giải thích chi tiết
                </p>
              </div>
            </div>
          )}
          
          {!isLoading && !error && !currentGrammar && (
            <div className="text-center py-20 text-white/40">
              Không tìm thấy dữ liệu ngữ pháp bài {selectedLesson}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
