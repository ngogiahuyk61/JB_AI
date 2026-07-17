import { useState, useEffect } from 'react';
import { ArrowLeft, Play, Award, CheckCircle2, Timer, Loader2, Ear, Volume2, Eye } from 'lucide-react';
import { groqService } from '../../services/groqService';
import { speechService } from '../../services/speechService';
import type { MinnaListeningTestResult } from '../../types/minnaTest';

interface MinnaListeningViewProps {
  lesson: number;
  onBack: () => void;
}

export default function MinnaListeningView({ lesson, onBack }: MinnaListeningViewProps) {
  const [gameState, setGameState] = useState<"loading" | "ready" | "playing" | "result">("loading");
  const [testData, setTestData] = useState<MinnaListeningTestResult | null>(null);
  
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
      const generated = await groqService.generateMinnaListeningTest(lesson);
      
      const isMissingContent = !generated.script || generated.questions.length === 0;
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
        <Loader2 className="animate-spin" style={{ width: "4rem", height: "4rem", color: "#9333ea", marginBottom: "1rem" }} />
        <h3 style={{ color: "#1e293b", fontWeight: 800 }}>AI Đang Soạn Đề Nghe Hiểu Bài {lesson}...</h3>
      </div>
    );
  }

  if (gameState === "ready") {
    return (
      <div className="verb-quiz-container">
        <div className="verb-quiz-header">
          <button onClick={onBack} className="verb-quiz-back-btn"><ArrowLeft size={20} /></button>
          <h1 className="verb-quiz-title">Test Nghe Hiểu Bài {lesson}</h1>
        </div>
        <div className="verb-quiz-config-card" style={{ textAlign: "center", marginTop: 40 }}>
          <Ear size={48} color="#9333ea" style={{ marginBottom: 16 }} />
          <h2 className="verb-quiz-config-title">Kiểm tra Nghe hiểu (Choukai) - Bài {lesson}</h2>
          {error ? (
            <div style={{ color: "#ef4444", marginBottom: 20 }}>
              <p>{error}</p>
              <button onClick={() => loadTest(0)} className="btn btn-outline" style={{ marginTop: 12 }}>Thử lại</button>
            </div>
          ) : (
            <div style={{ margin: "20px 0", color: "#475569", background: "#f8fafc", padding: 24, borderRadius: 16 }}>
              <p style={{ fontWeight: 700, fontSize: 16, color: "#0f172a", marginBottom: 12 }}>Luật chơi:</p>
              <p style={{ fontSize: 15, lineHeight: 1.6 }}>Bạn có <strong>10 phút</strong> để hoàn thành bài nghe hiểu.</p>
              <p style={{ fontSize: 15, lineHeight: 1.6 }}>Bạn sẽ không được nhìn thấy kịch bản. Hãy bấm nút Nghe để máy tự động đọc đoạn hội thoại, sau đó chọn đáp án đúng cho 5 câu hỏi trắc nghiệm.</p>
            </div>
          )}
          <button onClick={startExam} className="verb-quiz-start-btn" disabled={!!error || !testData} style={{ background: '#9333ea', boxShadow: '0 10px 25px rgba(147, 51, 234, 0.4)' }}>
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
          <h1 className="verb-quiz-title">Nghe hiểu Bài {lesson}</h1>
        </div>
        <div className="verb-quiz-timer" style={{ background: timeLeft < 180 ? '#fef2f2' : 'white', color: timeLeft < 180 ? '#ef4444' : '#0f172a' }}>
          <Timer size={18} />
          <span style={{ fontWeight: 800 }}>{Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, "0")}</span>
        </div>
      </div>

      <div style={{ paddingBottom: 100, marginTop: 24, display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        
        {/* Left Side: Audio Player & Script (if result) */}
        <div style={{ flex: '1 1 400px' }}>
          <div style={{ background: "white", borderRadius: 20, padding: 32, boxShadow: "0 10px 30px rgba(0,0,0,0.02)", position: 'sticky', top: 100 }}>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <button 
                onClick={() => speechService.speakJapanese(testData?.script || "")}
                style={{ 
                  background: '#f3e8ff', border: 'none', width: 80, height: 80, borderRadius: '50%', 
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', 
                  color: '#9333ea', boxShadow: '0 4px 12px rgba(147, 51, 234, 0.2)', marginBottom: 16
                }}
              >
                <Volume2 size={40} />
              </button>
              <h2 style={{ fontSize: 20, color: "#9333ea", margin: 0 }}>Bấm để nghe đoạn văn</h2>
              <p style={{ color: '#64748b', fontSize: 14, marginTop: 8 }}>Có thể bấm nhiều lần để nghe lại</p>
            </div>
            
            {gameState === "result" ? (
              <div style={{ marginTop: 32 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#0f172a', fontWeight: 800, fontSize: 16, marginBottom: 12 }}>
                  <Eye size={18} color="#9333ea" /> Kịch bản (Script)
                </div>
                <div style={{ fontSize: 16, lineHeight: 2.2, color: "#0f172a", whiteSpace: "pre-wrap", background: "#f8fafc", padding: 20, borderRadius: 12, border: "1px solid #e2e8f0" }}>
                  {testData?.script}
                </div>

                <div style={{ marginTop: 24, paddingTop: 24, borderTop: "2px solid #e2e8f0" }}>
                  <h4 style={{ fontSize: 15, fontWeight: 700, color: "#64748b", marginBottom: 12 }}>Bản dịch:</h4>
                  <div style={{ fontSize: 15, color: "#475569", lineHeight: 1.8 }}>{testData?.translation}</div>
                </div>
              </div>
            ) : (
              <div style={{ background: '#f8fafc', padding: 24, borderRadius: 12, textAlign: 'center', border: '1px dashed #cbd5e1', marginTop: 32 }}>
                <Eye size={32} color="#94a3b8" style={{ opacity: 0.5, marginBottom: 12 }} />
                <div style={{ color: '#64748b', fontSize: 15 }}>Kịch bản được ẩn đi trong quá trình làm bài.<br/>Hãy nghe thật kỹ!</div>
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
                      bg = "#f3e8ff"; border = "2px solid #9333ea";
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
                  background: "linear-gradient(135deg, #9333ea, #7e22ce)", color: "white", padding: "16px 40px",
                  borderRadius: 99, border: "none", fontSize: 18, fontWeight: 800, cursor: "pointer",
                  boxShadow: "0 10px 25px rgba(147, 51, 234, 0.4)", display: "inline-flex", alignItems: "center", gap: 8
                }}
              >
                <CheckCircle2 size={24} /> Nộp Bài
              </button>
            </div>
          )}

          {gameState === "result" && (
            <div className="verb-quiz-result-card" style={{ borderColor: '#f3e8ff', marginTop: 20 }}>
              <div className="verb-quiz-result-icon-wrapper" style={{ background: '#f3e8ff', color: '#9333ea' }}><Award style={{ width: "3rem", height: "3rem" }} /></div>
              <h2 className="verb-quiz-result-title">Hoàn thành bài thi!</h2>
              <div className="verb-quiz-score-box" style={{ background: '#faf5ff' }}>
                <div className="verb-quiz-score-number" style={{ color: '#9333ea' }}>{score} <span>/ 100 điểm</span></div>
              </div>
              <div className="verb-quiz-result-actions">
                <button onClick={onBack} className="verb-quiz-action-btn-secondary">Về Dashboard</button>
                <button onClick={() => {
                  setAnswers({}); loadTest();
                }} className="verb-quiz-action-btn-primary" style={{ background: '#9333ea' }}>
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
