import { useState, useEffect } from 'react';
import { ArrowLeft, Play, Award, CheckCircle2, Timer, Loader2, Volume2 } from 'lucide-react';
import { groqService } from '../../services/groqService';
import { speechService } from '../../services/speechService';
import type { MinnaVocabTestResult } from '../../types/minnaTest';
import * as wanakana from 'wanakana';

interface MinnaVocabViewProps {
  lesson: number;
  onBack: () => void;
}

const isCorrectAnswer = (userAns: string, expected: string) => {
  if (!userAns || !expected) return false;
  let normalizedUser = wanakana.toKana(userAns.trim());
  let normalizedExpected = wanakana.toKana(expected.trim());
  const clean = (s: string) => s.replace(/[\s、。！？!?,.]/g, '').toLowerCase();
  return clean(normalizedUser) === clean(normalizedExpected) || clean(userAns.trim()) === clean(expected.trim());
};

export default function MinnaVocabView({ lesson, onBack }: MinnaVocabViewProps) {
  const [gameState, setGameState] = useState<"loading" | "ready" | "playing" | "result">("loading");
  const [testData, setTestData] = useState<MinnaVocabTestResult | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [error, setError] = useState("");
  const [score, setScore] = useState(0);

  useEffect(() => {
    loadTest();
  }, [lesson]);

  const loadTest = async (retryCount = 0) => {
    setGameState("loading");
    setError("");
    try {
      if (!groqService.isAvailable()) throw new Error("Cần cấu hình Groq API để sinh đề");
      const generated = await groqService.generateMinnaVocabTest(lesson);
      
      const isMissingContent = !generated.words || generated.words.length === 0 || !generated.words[0].vi;
      if (isMissingContent) {
        if (retryCount < 2) return loadTest(retryCount + 1);
        throw new Error("AI trả về dữ liệu rỗng. Vui lòng nhấn Thử lại.");
      }

      setTestData(generated);
      setGameState("ready");
    } catch (err: any) {
      if (retryCount < 2) return loadTest(retryCount + 1);
      setError(err.message || "Lỗi tải đề thi");
      setGameState("ready");
    }
  };

  const startExam = () => {
    setTimeLeft(3 * 60); // 3 minutes
    setGameState("playing");
  };

  useEffect(() => {
    if (gameState === "playing" && timeLeft > 0) {
      const t = setTimeout(() => setTimeLeft(p => p - 1), 1000);
      return () => clearTimeout(t);
    } else if (gameState === "playing" && timeLeft === 0) {
      submitExam();
    }
  }, [gameState, timeLeft]);

  const submitExam = () => {
    if (!testData) return;
    let correctCount = 0;
    testData.words.forEach(w => {
      if (isCorrectAnswer(answers[w.id] || '', w.ja)) correctCount++;
    });
    setScore(Math.round((correctCount / testData.words.length) * 100));
    setGameState("result");
  };

  if (gameState === "loading") {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "60vh" }}>
        <Loader2 className="animate-spin" style={{ width: "4rem", height: "4rem", color: "#d97706", marginBottom: "1rem" }} />
        <h3 style={{ color: "#1e293b", fontWeight: 800 }}>AI Đang Tìm 10 Từ Vựng Bài {lesson}...</h3>
      </div>
    );
  }

  if (gameState === "ready") {
    return (
      <div className="verb-quiz-container">
        <div className="verb-quiz-header">
          <button onClick={onBack} className="verb-quiz-back-btn"><ArrowLeft size={20} /></button>
          <h1 className="verb-quiz-title">Test Từ Vựng Bài {lesson}</h1>
        </div>
        <div className="verb-quiz-config-card" style={{ textAlign: "center", marginTop: 40 }}>
          <Volume2 size={48} color="#d97706" style={{ marginBottom: 16 }} />
          <h2 className="verb-quiz-config-title">Kiểm tra Từ vựng - Bài {lesson}</h2>
          {error ? (
            <div style={{ color: "#ef4444", marginBottom: 20 }}>
              <p>{error}</p>
              <button onClick={() => loadTest(0)} className="btn btn-outline" style={{ marginTop: 12 }}>Thử lại</button>
            </div>
          ) : (
            <div style={{ margin: "20px 0", color: "#475569", background: "#f8fafc", padding: 24, borderRadius: 16 }}>
              <p style={{ fontWeight: 700, fontSize: 16, color: "#0f172a", marginBottom: 12 }}>Luật chơi:</p>
              <p style={{ fontSize: 15, lineHeight: 1.6 }}>Bạn có <strong>3 phút</strong> để hoàn thành 10 từ vựng.</p>
              <p style={{ fontSize: 15, lineHeight: 1.6 }}>Bạn sẽ thấy nghĩa tiếng Việt. Hãy bấm nút Nghe để nghe AI đọc từ đó bằng tiếng Nhật, sau đó gõ cách đọc Hiragana (hoặc Romaji) vào ô trống.</p>
            </div>
          )}
          <button onClick={startExam} className="verb-quiz-start-btn" disabled={!!error || !testData} style={{ background: '#d97706', boxShadow: '0 10px 25px rgba(217, 119, 6, 0.4)' }}>
            <Play size={20} fill="currentColor" /> Bắt Đầu (3 phút)
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="verb-quiz-container" style={{ maxWidth: 800 }}>
      <div className="verb-quiz-header" style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(241, 245, 249, 0.9)', backdropFilter: 'blur(10px)' }}>
        <div className="verb-quiz-header-left">
          <button onClick={onBack} className="verb-quiz-back-btn"><ArrowLeft size={20} /></button>
          <h1 className="verb-quiz-title">Từ vựng Bài {lesson}</h1>
        </div>
        <div className="verb-quiz-timer" style={{ background: timeLeft < 60 ? '#fef2f2' : 'white', color: timeLeft < 60 ? '#ef4444' : '#0f172a' }}>
          <Timer size={18} />
          <span style={{ fontWeight: 800 }}>{Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, "0")}</span>
        </div>
      </div>

      <div style={{ paddingBottom: 100, marginTop: 24 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {testData?.words.map((w, idx) => {
            const isCorrect = isCorrectAnswer(answers[w.id] || '', w.ja);
            return (
              <div key={w.id} style={{ background: "white", borderRadius: 16, padding: 20, boxShadow: "0 4px 6px rgba(0,0,0,0.02)", border: "1px solid #e2e8f0" }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14 }}>
                    {idx + 1}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>{w.vi}</div>
                  </div>
                  <button 
                    onClick={() => speechService.speakJapanese(w.ja)}
                    style={{ background: '#f8fafc', border: '1px solid #cbd5e1', padding: '8px 16px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', color: '#334155', fontWeight: 600 }}
                  >
                    <Volume2 size={16} /> Nghe
                  </button>
                </div>
                
                <div style={{ marginTop: 16 }}>
                  <input 
                    type="text" 
                    disabled={gameState === "result"}
                    value={answers[w.id] || ''}
                    onChange={e => setAnswers({...answers, [w.id]: e.target.value})}
                    style={{ 
                      width: "100%", padding: "12px 16px", borderRadius: 8, 
                      border: `2px solid ${gameState === "result" ? (isCorrect ? '#10b981' : '#ef4444') : '#e2e8f0'}`,
                      fontSize: 16, background: gameState === "result" ? '#f8fafc' : 'white'
                    }}
                    placeholder="Nhập Hiragana hoặc Romaji..."
                  />
                </div>

                {gameState === "result" && (
                  <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px dashed #cbd5e1" }}>
                    {!isCorrect && <div style={{ color: "#ef4444", fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Đúng: {w.ja} {w.kanji && `(${w.kanji})`}</div>}
                    {isCorrect && <div style={{ color: "#10b981", fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Kanji: {w.kanji || w.ja}</div>}
                    <div style={{ fontSize: 14, color: "#64748b" }}>{w.explanation}</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {gameState === "playing" && (
          <div style={{ textAlign: "center", marginTop: 40 }}>
            <button
              onClick={submitExam}
              style={{
                background: "linear-gradient(135deg, #10b981, #059669)", color: "white", padding: "16px 40px",
                borderRadius: 99, border: "none", fontSize: 18, fontWeight: 800, cursor: "pointer",
                boxShadow: "0 10px 25px rgba(16, 185, 129, 0.4)", display: "inline-flex", alignItems: "center", gap: 8
              }}
            >
              <CheckCircle2 size={24} /> Nộp Bài
            </button>
          </div>
        )}

        {gameState === "result" && (
          <div className="verb-quiz-result-card" style={{ marginTop: 40 }}>
            <div className="verb-quiz-result-icon-wrapper" style={{ background: '#fef3c7', color: '#d97706' }}><Award style={{ width: "3rem", height: "3rem" }} /></div>
            <h2 className="verb-quiz-result-title">Hoàn thành bài thi!</h2>
            <div className="verb-quiz-score-box">
              <div className="verb-quiz-score-number">{score} <span>/ 100 điểm</span></div>
            </div>
            <div className="verb-quiz-result-actions">
              <button onClick={onBack} className="verb-quiz-action-btn-secondary">Về Dashboard</button>
              <button onClick={() => {
                setAnswers({}); loadTest();
              }} className="verb-quiz-action-btn-primary" style={{ background: '#d97706' }}>
                Thi lại bài này
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
