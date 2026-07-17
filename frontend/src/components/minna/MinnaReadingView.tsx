import { useState, useEffect } from 'react';
import { ArrowLeft, Play, Award, CheckCircle2, Timer, Loader2, BookOpen, Volume2 } from 'lucide-react';
import { groqService } from '../../services/groqService';
import { speechService } from '../../services/speechService';
import type { MinnaReadingTestResult } from '../../types/minnaTest';

interface MinnaReadingViewProps {
  lesson: number;
  onBack: () => void;
}

export default function MinnaReadingView({ lesson, onBack }: MinnaReadingViewProps) {
  const [gameState, setGameState] = useState<"loading" | "ready" | "playing" | "result">("loading");
  const [testData, setTestData] = useState<MinnaReadingTestResult | null>(null);
  
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
      const generated = await groqService.generateMinnaReadingTest(lesson);
      
      const isMissingContent = !generated.passage || generated.questions.length === 0;
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
    setTimeLeft(10 * 60); // 10 minutes
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

    testData.questions.forEach(q => {
      if (answers[q.id] === q.correctAnswer) correctCount++;
    });

    setScore(Math.round((correctCount / testData.questions.length) * 100));
    setGameState("result");
  };

  if (gameState === "loading") {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "60vh" }}>
        <Loader2 className="animate-spin" style={{ width: "4rem", height: "4rem", color: "#16a34a", marginBottom: "1rem" }} />
        <h3 style={{ color: "#1e293b", fontWeight: 800 }}>AI Đang Soạn Đề Đọc Hiểu Bài {lesson}...</h3>
      </div>
    );
  }

  if (gameState === "ready") {
    return (
      <div className="verb-quiz-container">
        <div className="verb-quiz-header">
          <button onClick={onBack} className="verb-quiz-back-btn"><ArrowLeft size={20} /></button>
          <h1 className="verb-quiz-title">Test Đọc Hiểu Bài {lesson}</h1>
        </div>
        <div className="verb-quiz-config-card" style={{ textAlign: "center", marginTop: 40 }}>
          <BookOpen size={48} color="#16a34a" style={{ marginBottom: 16 }} />
          <h2 className="verb-quiz-config-title">Kiểm tra Đọc hiểu (Reading) - Bài {lesson}</h2>
          {error ? (
            <div style={{ color: "#ef4444", marginBottom: 20 }}>
              <p>{error}</p>
              <button onClick={() => loadTest(0)} className="btn btn-outline" style={{ marginTop: 12 }}>Thử lại</button>
            </div>
          ) : (
            <div style={{ margin: "20px 0", color: "#475569", background: "#f8fafc", padding: 24, borderRadius: 16 }}>
              <p style={{ fontWeight: 700, fontSize: 16, color: "#0f172a", marginBottom: 12 }}>Luật chơi:</p>
              <p style={{ fontSize: 15, lineHeight: 1.6 }}>Bạn có <strong>10 phút</strong> để hoàn thành bài đọc hiểu.</p>
              <p style={{ fontSize: 15, lineHeight: 1.6 }}>Đoạn văn được viết bám sát theo format thi năng lực tiếng Nhật JLPT N5, áp dụng các cấu trúc ngữ pháp và từ vựng từ đầu chương trình đến bài hiện tại.</p>
            </div>
          )}
          <button onClick={startExam} className="verb-quiz-start-btn" disabled={!!error || !testData} style={{ background: '#16a34a', boxShadow: '0 10px 25px rgba(22, 163, 74, 0.4)' }}>
            <Play size={20} fill="currentColor" /> Bắt Đầu (10 phút)
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="verb-quiz-container" style={{ maxWidth: 1000 }}>
      <div className="verb-quiz-header" style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(241, 245, 249, 0.9)', backdropFilter: 'blur(10px)' }}>
        <div className="verb-quiz-header-left">
          <button onClick={onBack} className="verb-quiz-back-btn"><ArrowLeft size={20} /></button>
          <h1 className="verb-quiz-title">Đọc hiểu Bài {lesson}</h1>
        </div>
        <div className="verb-quiz-timer" style={{ background: timeLeft < 180 ? '#fef2f2' : 'white', color: timeLeft < 180 ? '#ef4444' : '#0f172a' }}>
          <Timer size={18} />
          <span style={{ fontWeight: 800 }}>{Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, "0")}</span>
        </div>
      </div>

      <div style={{ paddingBottom: 100, marginTop: 24, display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        
        {/* Left Side: Passage */}
        <div style={{ flex: '1 1 400px' }}>
          <div style={{ background: "white", borderRadius: 20, padding: 32, boxShadow: "0 10px 30px rgba(0,0,0,0.02)", position: 'sticky', top: 100 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{ fontSize: 20, color: "#16a34a", margin: 0 }}>Đoạn văn</h2>
              <button 
                onClick={() => speechService.speakJapanese(testData?.passage || "")}
                style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '8px 16px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', color: '#16a34a', fontWeight: 600 }}
              >
                <Volume2 size={16} /> Nghe
              </button>
            </div>
            
            <div style={{ fontSize: 17, lineHeight: 2.2, color: "#0f172a", whiteSpace: "pre-wrap", background: "#f8fafc", padding: 24, borderRadius: 12, border: "1px solid #e2e8f0" }}>
              {testData?.passage}
            </div>

            {gameState === "result" && (
              <div style={{ marginTop: 24, paddingTop: 24, borderTop: "2px solid #e2e8f0" }}>
                <h4 style={{ fontSize: 15, fontWeight: 700, color: "#64748b", marginBottom: 12 }}>Bản dịch:</h4>
                <div style={{ fontSize: 15, color: "#475569", lineHeight: 1.8 }}>{testData?.translation}</div>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Questions */}
        <div style={{ flex: '1 1 400px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {testData?.questions.map((q, idx) => {
            return (
              <div key={q.id} style={{ background: "white", padding: 24, borderRadius: 20, border: "1px solid #e2e8f0", boxShadow: "0 4px 6px rgba(0,0,0,0.02)" }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", marginBottom: 16 }}>{idx + 1}. {q.questionText}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {q.choices.map((choice, cIdx) => {
                    const isSelected = answers[q.id] === choice;
                    const isChoiceCorrect = choice === q.correctAnswer;
                    let bg = "#f8fafc", border = "1px solid #e2e8f0";
                    if (gameState === "result") {
                      if (isChoiceCorrect) { bg = "#ecfdf5"; border = "2px solid #10b981"; }
                      else if (isSelected) { bg = "#fef2f2"; border = "2px solid #ef4444"; }
                    } else if (isSelected) {
                      bg = "#dcfce7"; border = "2px solid #16a34a";
                    }
                    return (
                      <button
                        key={cIdx} disabled={gameState === "result"} onClick={() => setAnswers({...answers, [q.id]: choice})}
                        style={{ padding: "12px 16px", borderRadius: 10, background: bg, border: border, textAlign: "left", fontSize: 16, color: "#1e293b", cursor: gameState === "result" ? "default" : "pointer" }}
                      >
                        <span style={{ fontWeight: 700, color: "#64748b", marginRight: 12, fontSize: 14 }}>{String.fromCharCode(65 + cIdx)}.</span> {choice}
                      </button>
                    );
                  })}
                </div>
                {gameState === "result" && <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px dashed #cbd5e1", fontSize: 14, color: "#475569" }}>{q.explanation}</div>}
              </div>
            );
          })}

          {/* Submit or Result Info */}
          {gameState === "playing" && (
            <div style={{ textAlign: "center", marginTop: 20 }}>
              <button
                onClick={submitExam}
                style={{
                  background: "linear-gradient(135deg, #16a34a, #15803d)", color: "white", padding: "16px 40px",
                  borderRadius: 99, border: "none", fontSize: 18, fontWeight: 800, cursor: "pointer",
                  boxShadow: "0 10px 25px rgba(22, 163, 74, 0.4)", display: "inline-flex", alignItems: "center", gap: 8
                }}
              >
                <CheckCircle2 size={24} /> Nộp Bài
              </button>
            </div>
          )}

          {gameState === "result" && (
            <div className="verb-quiz-result-card" style={{ borderColor: '#dcfce7', marginTop: 20 }}>
              <div className="verb-quiz-result-icon-wrapper" style={{ background: '#dcfce7', color: '#16a34a' }}><Award style={{ width: "3rem", height: "3rem" }} /></div>
              <h2 className="verb-quiz-result-title">Hoàn thành bài thi!</h2>
              <div className="verb-quiz-score-box" style={{ background: '#f0fdf4' }}>
                <div className="verb-quiz-score-number" style={{ color: '#16a34a' }}>{score} <span>/ 100 điểm</span></div>
              </div>
              <div className="verb-quiz-result-actions">
                <button onClick={onBack} className="verb-quiz-action-btn-secondary">Về Dashboard</button>
                <button onClick={() => {
                  setAnswers({}); loadTest();
                }} className="verb-quiz-action-btn-primary" style={{ background: '#16a34a' }}>
                  Thi lại bài này
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
