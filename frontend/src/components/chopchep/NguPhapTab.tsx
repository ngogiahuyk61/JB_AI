import { useState, useEffect } from 'react';
import { Loader2, AlertCircle, BookOpen, MessageCircle } from 'lucide-react';

interface GrammarItem {
  lesson: number;
  content: string;
}

export default function NguPhapTab() {
  const [grammarData, setGrammarData] = useState<GrammarItem[]>([]);
  const [selectedLesson, setSelectedLesson] = useState<number | null>(null);
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

  if (selectedLesson === null) {
    return (
      <div className="lesson-grid-container">
        <div className="lesson-grid">
          {Array.from({length: 25}, (_, i) => i + 1).map(num => (
            <button
              key={num}
              onClick={() => setSelectedLesson(num)}
              className="lesson-grid-btn"
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
          {Array.from({length: 25}, (_, i) => i + 1).map(num => (
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

      {/* Main Content */}
      <div className="np-content">
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          {isLoading && (
            <div className="center-message">
              <Loader2 className="animate-spin" size={32} />
              <p>Đang tải ngữ pháp...</p>
            </div>
          )}
          
          {error && (
            <div className="center-message error">
              <AlertCircle size={48} />
              <p>{error}</p>
            </div>
          )}

          {!isLoading && !error && currentGrammar && (
            <div className="np-card">
              <h2 className="np-card-title">
                Ngữ pháp Bài {selectedLesson}
              </h2>
              
              <div>
                {currentGrammar.content.split(';').map((structure, index) => {
                  const s = structure.trim();
                  if (!s) return null;
                  return (
                    <div key={index} className="np-structure">
                      {s}
                    </div>
                  );
                })}
              </div>

              <div className="np-hint">
                <MessageCircle size={16} />
                Mở Chat AI góc phải dưới để được giải thích chi tiết
              </div>
            </div>
          )}
          
          {!isLoading && !error && !currentGrammar && (
            <div className="center-message">
              Không tìm thấy dữ liệu ngữ pháp bài {selectedLesson}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
