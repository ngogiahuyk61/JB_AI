import { useState, useEffect } from 'react';
import { ArrowLeft, Play, Award, CheckCircle2, Timer, Loader2, PenTool } from 'lucide-react';
import { groqService } from '../../services/groqService';
import type { MinnaKanjiTestResult } from '../../types/minnaTest';
import * as wanakana from 'wanakana';

interface MinnaKanjiViewProps {
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

export default function MinnaKanjiView({ lesson, onBack }: MinnaKanjiViewProps) {
  const [gameState, setGameState] = useState<"loading" | "ready" | "playing" | "result">("loading");
  const [testData, setTestData] = useState<MinnaKanjiTestResult | null>(null);
  
  const [answersP1, setAnswersP1] = useState<Record<string, string>>({});
  const [answersP2, setAnswersP2] = useState<Record<string, string>>({});
  const [answersP3, setAnswersP3] = useState<Record<string, string>>({});
  
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
      const generated = await groqService.generateMinnaKanjiTest(lesson);
      
      const isMissingContent = !generated.part1?.questions?.[0]?.questionText || generated.part1.questions.length === 0;
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
    setTimeLeft(15 * 60); // 15 minutes for Kanji test
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
    let totalQuestions = 0;

    testData.part1.questions.forEach(q => {
      totalQuestions++;
      if (answersP1[q.id] === q.correctAnswer) correctCount++;
    });
    testData.part2.questions.forEach(q => {
      totalQuestions++;
      if (answersP2[q.id] === q.correctAnswer) correctCount++;
    });
    testData.part3.questions.forEach(q => {
      totalQuestions++;
      if (isCorrectAnswer(answersP3[q.id] || '', q.answer)) correctCount++;
    });

    setScore(Math.round((correctCount / totalQuestions) * 100));
    setGameState("result");
  };

  if (gameState === "loading") {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "60vh" }}>
        <Loader2 className="animate-spin" style={{ width: "4rem", height: "4rem", color: "#dc2626", marginBottom: "1rem" }} />
        <h3 style={{ color: "#1e293b", fontWeight: 800 }}>AI Đang Biên Soạn Đề Kanji Bài {lesson}...</h3>
      </div>
    );
  }

  if (gameState === "ready") {
    return (
      <div className="verb-quiz-container">
        <div className="verb-quiz-header">
          <button onClick={onBack} className="verb-quiz-back-btn"><ArrowLeft size={20} /></button>
          <h1 className="verb-quiz-title">Test Kanji Bài {lesson}</h1>
        </div>
        <div className="verb-quiz-config-card" style={{ textAlign: "center", marginTop: 40 }}>
          <PenTool size={48} color="#dc2626" style={{ marginBottom: 16 }} />
          <h2 className="verb-quiz-config-title">Kiểm tra Hán tự (Kanji) - Bài {lesson}</h2>
          {error ? (
            <div style={{ color: "#ef4444", marginBottom: 20 }}>
              <p>{error}</p>
              <button onClick={() => loadTest(0)} className="btn btn-outline" style={{ marginTop: 12 }}>Thử lại</button>
            </div>
          ) : (
            <div style={{ margin: "20px 0", color: "#475569", background: "#f8fafc", padding: 24, borderRadius: 16 }}>
              <p style={{ fontWeight: 700, fontSize: 16, color: "#0f172a", marginBottom: 12 }}>Cấu trúc đề (15 phút):</p>
              <ul style={{ textAlign: 'left', lineHeight: 1.8, fontSize: 15 }}>
                <li><strong>Phần 1:</strong> 4 câu trắc nghiệm chọn chữ Kanji đúng.</li>
                <li><strong>Phần 2:</strong> 4 câu trắc nghiệm chọn cách đọc đúng của chữ Kanji.</li>
                <li><strong>Phần 3:</strong> 5 câu tự luận (Đọc câu, xem nghĩa và gõ cách đọc Hiragana của từ Kanji).</li>
              </ul>
            </div>
          )}
          <button onClick={startExam} className="verb-quiz-start-btn" disabled={!!error || !testData} style={{ background: '#dc2626', boxShadow: '0 10px 25px rgba(220, 38, 38, 0.4)' }}>
            <Play size={20} fill="currentColor" /> Bắt Đầu Làm Bài
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="verb-quiz-container" style={{ maxWidth: 900 }}>
      <div className="verb-quiz-header" style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(241, 245, 249, 0.9)', backdropFilter: 'blur(10px)' }}>
        <div className="verb-quiz-header-left">
          <button onClick={onBack} className="verb-quiz-back-btn"><ArrowLeft size={20} /></button>
          <h1 className="verb-quiz-title">Kanji Bài {lesson}</h1>
        </div>
        <div className="verb-quiz-timer" style={{ background: timeLeft < 300 ? '#fef2f2' : 'white', color: timeLeft < 300 ? '#ef4444' : '#0f172a' }}>
          <Timer size={18} />
          <span style={{ fontWeight: 800 }}>{Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, "0")}</span>
        </div>
      </div>

      <div style={{ paddingBottom: 100, marginTop: 24 }}>
        
        {/* ================= PART 1 ================= */}
        <div style={{ background: "white", borderRadius: 20, padding: 32, marginBottom: 32, boxShadow: "0 10px 30px rgba(0,0,0,0.02)" }}>
          <h2 style={{ fontSize: 20, color: "#dc2626", borderBottom: "2px solid #fee2e2", paddingBottom: 12, marginBottom: 24 }}>{testData?.part1.title}</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {testData?.part1.questions.map((q, idx) => {
              return (
                <div key={q.id} style={{ background: "#f8fafc", padding: 20, borderRadius: 12, border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", marginBottom: 16 }}>{idx + 1}. {q.questionText}</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    {q.choices.map((choice, cIdx) => {
                      const isSelected = answersP1[q.id] === choice;
                      const isChoiceCorrect = choice === q.correctAnswer;
                      let bg = "white", border = "1px solid #cbd5e1";
                      if (gameState === "result") {
                        if (isChoiceCorrect) { bg = "#ecfdf5"; border = "2px solid #10b981"; }
                        else if (isSelected) { bg = "#fef2f2"; border = "2px solid #ef4444"; }
                      } else if (isSelected) {
                        bg = "#fee2e2"; border = "2px solid #dc2626";
                      }
                      return (
                        <button
                          key={cIdx} disabled={gameState === "result"} onClick={() => setAnswersP1({...answersP1, [q.id]: choice})}
                          style={{ padding: "12px 16px", borderRadius: 10, background: bg, border: border, textAlign: "left", fontSize: 18, color: "#1e293b", cursor: gameState === "result" ? "default" : "pointer" }}
                        >
                          <span style={{ fontWeight: 700, color: "#64748b", marginRight: 8, fontSize: 14 }}>{String.fromCharCode(65 + cIdx)}.</span> {choice}
                        </button>
                      );
                    })}
                  </div>
                  {gameState === "result" && <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px dashed #cbd5e1", fontSize: 14, color: "#475569" }}>{q.explanation}</div>}
                </div>
              );
            })}
          </div>
        </div>

        {/* ================= PART 2 ================= */}
        <div style={{ background: "white", borderRadius: 20, padding: 32, marginBottom: 32, boxShadow: "0 10px 30px rgba(0,0,0,0.02)" }}>
          <h2 style={{ fontSize: 20, color: "#dc2626", borderBottom: "2px solid #fee2e2", paddingBottom: 12, marginBottom: 24 }}>{testData?.part2.title}</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {testData?.part2.questions.map((q, idx) => {
              return (
                <div key={q.id} style={{ background: "#f8fafc", padding: 20, borderRadius: 12, border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", marginBottom: 16 }}>{idx + 1}. {q.questionText}</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    {q.choices.map((choice, cIdx) => {
                      const isSelected = answersP2[q.id] === choice;
                      const isChoiceCorrect = choice === q.correctAnswer;
                      let bg = "white", border = "1px solid #cbd5e1";
                      if (gameState === "result") {
                        if (isChoiceCorrect) { bg = "#ecfdf5"; border = "2px solid #10b981"; }
                        else if (isSelected) { bg = "#fef2f2"; border = "2px solid #ef4444"; }
                      } else if (isSelected) {
                        bg = "#fee2e2"; border = "2px solid #dc2626";
                      }
                      return (
                        <button
                          key={cIdx} disabled={gameState === "result"} onClick={() => setAnswersP2({...answersP2, [q.id]: choice})}
                          style={{ padding: "12px 16px", borderRadius: 10, background: bg, border: border, textAlign: "left", fontSize: 16, color: "#1e293b", cursor: gameState === "result" ? "default" : "pointer" }}
                        >
                          <span style={{ fontWeight: 700, color: "#64748b", marginRight: 8, fontSize: 14 }}>{String.fromCharCode(65 + cIdx)}.</span> {choice}
                        </button>
                      );
                    })}
                  </div>
                  {gameState === "result" && <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px dashed #cbd5e1", fontSize: 14, color: "#475569" }}>{q.explanation}</div>}
                </div>
              );
            })}
          </div>
        </div>

        {/* ================= PART 3 ================= */}
        <div style={{ background: "white", borderRadius: 20, padding: 32, marginBottom: 32, boxShadow: "0 10px 30px rgba(0,0,0,0.02)" }}>
          <h2 style={{ fontSize: 20, color: "#dc2626", borderBottom: "2px solid #fee2e2", paddingBottom: 12, marginBottom: 24 }}>{testData?.part3.title}</h2>
          
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                <th style={{ padding: 16, textAlign: "left", borderBottom: "2px solid #e2e8f0", width: "45%" }}>Câu tiếng Nhật & Nghĩa</th>
                <th style={{ padding: 16, textAlign: "left", borderBottom: "2px solid #e2e8f0" }}>Nhập Hiragana cho chữ in đậm</th>
                {gameState === "result" && <th style={{ padding: 16, textAlign: "left", borderBottom: "2px solid #e2e8f0", width: "25%" }}>Kết quả</th>}
              </tr>
            </thead>
            <tbody>
              {testData?.part3.questions.map((q, idx) => {
                const isCorrect = isCorrectAnswer(answersP3[q.id] || '', q.answer);
                
                // Highlight the Kanji word in the sentence if possible
                const parts = q.sentence.split(q.kanjiWord);
                
                return (
                  <tr key={q.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: 16 }}>
                      <div style={{ fontSize: 16, color: "#0f172a", marginBottom: 8 }}>
                        {idx + 1}. {parts.length === 2 ? (
                          <>{parts[0]}<span style={{ fontWeight: 800, color: '#dc2626', fontSize: 18 }}>{q.kanjiWord}</span>{parts[1]}</>
                        ) : q.sentence}
                      </div>
                      <div style={{ fontSize: 14, color: "#64748b", fontStyle: 'italic' }}>"{q.vietnamese}"</div>
                    </td>
                    <td style={{ padding: 16 }}>
                      <input 
                        type="text" 
                        disabled={gameState === "result"}
                        value={answersP3[q.id] || ''}
                        onChange={e => setAnswersP3({...answersP3, [q.id]: e.target.value})}
                        style={{ 
                          width: "100%", padding: "10px 14px", borderRadius: 8, 
                          border: `1.5px solid ${gameState === "result" ? (isCorrect ? '#10b981' : '#ef4444') : '#cbd5e1'}`,
                          fontSize: 15, background: gameState === "result" ? '#f8fafc' : 'white'
                        }}
                        placeholder="Nhập hiragana..."
                      />
                    </td>
                    {gameState === "result" && (
                      <td style={{ padding: 16 }}>
                        {!isCorrect && <div style={{ color: "#ef4444", fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Đúng: {q.answer}</div>}
                        <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.4 }}>{q.explanation}</div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Submit or Result Info */}
        {gameState === "playing" && (
          <div style={{ textAlign: "center" }}>
            <button
              onClick={submitExam}
              style={{
                background: "linear-gradient(135deg, #dc2626, #b91c1c)", color: "white", padding: "16px 40px",
                borderRadius: 99, border: "none", fontSize: 18, fontWeight: 800, cursor: "pointer",
                boxShadow: "0 10px 25px rgba(220, 38, 38, 0.4)", display: "inline-flex", alignItems: "center", gap: 8
              }}
            >
              <CheckCircle2 size={24} /> Nộp Bài
            </button>
          </div>
        )}

        {gameState === "result" && (
          <div className="verb-quiz-result-card" style={{ marginTop: 40, borderColor: '#fee2e2' }}>
            <div className="verb-quiz-result-icon-wrapper" style={{ background: '#fee2e2', color: '#dc2626' }}><Award style={{ width: "3rem", height: "3rem" }} /></div>
            <h2 className="verb-quiz-result-title">Hoàn thành bài thi!</h2>
            <div className="verb-quiz-score-box" style={{ background: '#fef2f2' }}>
              <div className="verb-quiz-score-number" style={{ color: '#dc2626' }}>{score} <span>/ 100 điểm</span></div>
            </div>
            <div className="verb-quiz-result-actions">
              <button onClick={onBack} className="verb-quiz-action-btn-secondary">Về Dashboard</button>
              <button onClick={() => {
                setAnswersP1({}); setAnswersP2({}); setAnswersP3({}); loadTest();
              }} className="verb-quiz-action-btn-primary" style={{ background: '#dc2626' }}>
                Thi lại bài này
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
