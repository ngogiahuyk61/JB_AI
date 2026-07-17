import { useState, useEffect } from 'react';
import { ArrowLeft, Play, Award, CheckCircle2, Timer, Loader2, Volume2 } from 'lucide-react';
import { groqService } from '../../services/groqService';
import { speechService } from '../../services/speechService';
import type { MinnaTestResult } from '../../types/minnaTest';
import * as wanakana from 'wanakana';

// Utility to compare text robustly (ignore spaces, punctuation, katakana/hiragana match if needed)
const isCorrectAnswer = (userAns: string, expected: string) => {
  if (!userAns || !expected) return false;
  // Convert user answer to Hiragana for comparison (if it's romaji)
  let normalizedUser = wanakana.toKana(userAns.trim());
  let normalizedExpected = wanakana.toKana(expected.trim());
  
  // Remove spaces and punctuation
  const clean = (s: string) => s.replace(/[\s、。！？!?,.]/g, '').toLowerCase();
  
  return clean(normalizedUser) === clean(normalizedExpected) || clean(userAns.trim()) === clean(expected.trim());
};

interface MinnaTestViewProps {
  lesson: number;
  onBack: () => void;
}

export default function MinnaTestView({ lesson, onBack }: MinnaTestViewProps) {
  const [gameState, setGameState] = useState<"loading" | "ready" | "playing" | "result">("loading");
  const [testData, setTestData] = useState<MinnaTestResult | null>(null);
  
  // Store user answers
  // part1, part2, part4_r answers are strings
  // part3, part4_s answers are strings (selected choice)
  const [answersP1, setAnswersP1] = useState<Record<string, string>>({});
  const [answersP2, setAnswersP2] = useState<Record<string, string>>({});
  const [answersP3, setAnswersP3] = useState<Record<string, string>>({});
  const [answersP4s, setAnswersP4s] = useState<Record<string, string>>({});
  const [answersP4r, setAnswersP4r] = useState<Record<string, string>>({});
  
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
      const generated = await groqService.generateMinnaLessonTest(lesson);
      
      // Validate that AI actually generated content, not just placeholders or empty strings
      const firstWord = generated.part1?.questions?.[0]?.word || "";
      const isMissingContent = !firstWord || firstWord.includes("Từ gốc") || firstWord.includes("Kanji");
                               
      if (isMissingContent) {
        if (retryCount < 2) {
          console.warn("AI generated empty/placeholder content, retrying...", retryCount + 1);
          return loadTest(retryCount + 1);
        } else {
          throw new Error("AI hiện tại đang bị quá tải hoặc trả về dữ liệu rỗng. Vui lòng nhấn Thử lại.");
        }
      }

      setTestData(generated);
      setGameState("ready");
    } catch (err: any) {
      if (retryCount < 2) {
         console.warn("API error, retrying...", retryCount + 1);
         return loadTest(retryCount + 1);
      }
      setError(err.message || "Lỗi tải đề thi");
      setGameState("ready");
    }
  };

  const startExam = () => {
    // 25 mins for the whole test
    setTimeLeft(25 * 60);
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

    // Part 1
    testData.part1.questions.forEach(q => {
      totalQuestions++;
      if (isCorrectAnswer(answersP1[q.id] || '', q.answer)) correctCount++;
    });
    
    // Part 2
    testData.part2.questions.forEach(q => {
      totalQuestions++;
      if (isCorrectAnswer(answersP2[q.id] || '', q.answer)) correctCount++;
    });

    // Part 3
    testData.part3.questions.forEach(q => {
      totalQuestions++;
      if (answersP3[q.id] === q.correctAnswer) correctCount++;
    });

    // Part 4 Star
    testData.part4.starQuestions.forEach(q => {
      totalQuestions++;
      if (answersP4s[q.id] === q.correctAnswer) correctCount++;
    });

    // Part 4 Reading
    testData.part4.reading.questions.forEach((q, idx) => {
      totalQuestions++;
      const qId = `p4_r_${idx}`;
      // Reading answers can be fuzzy, we do strict for now or rely on self-check. 
      // Ideally AI evaluates this, but for simplicity we do exact string match.
      if (isCorrectAnswer(answersP4r[qId] || '', q.answer)) correctCount++;
    });

    setScore(Math.round((correctCount / totalQuestions) * 100));
    setGameState("result");
  };

  if (gameState === "loading") {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "60vh" }}>
        <Loader2 className="animate-spin" style={{ width: "4rem", height: "4rem", color: "#4f46e5", marginBottom: "1rem" }} />
        <h3 style={{ color: "#1e293b", fontWeight: 800 }}>AI Đang Khởi Tạo Đề Thi Bài {lesson}...</h3>
        <p style={{ color: "#64748b", fontWeight: 600, marginTop: 8 }}>Vui lòng chờ khoảng 15 - 30 giây để AI biên soạn đề chất lượng cao.</p>
      </div>
    );
  }

  if (gameState === "ready") {
    return (
      <div className="verb-quiz-container">
        <div className="verb-quiz-header">
          <button onClick={onBack} className="verb-quiz-back-btn">
            <ArrowLeft size={20} />
          </button>
          <h1 className="verb-quiz-title">Test Ngữ Pháp Bài {lesson}</h1>
        </div>
        <div className="verb-quiz-config-card" style={{ textAlign: "center", marginTop: 40 }}>
          <Award size={48} color="#4f46e5" style={{ marginBottom: 16 }} />
          <h2 className="verb-quiz-config-title">Đề Thi Minna no Nihongo - Bài {lesson}</h2>
          
          {error ? (
            <div style={{ color: "#ef4444", marginBottom: 20 }}>
              <p>{error}</p>
              <button onClick={loadTest} className="btn btn-outline" style={{ marginTop: 12 }}>Thử lại</button>
            </div>
          ) : (
            <div style={{ margin: "20px 0", color: "#475569", background: "#f8fafc", padding: 24, borderRadius: 16 }}>
              <p style={{ fontWeight: 700, fontSize: 16, color: "#0f172a", marginBottom: 12 }}>Trọng tâm ngữ pháp:</p>
              <p style={{ fontSize: 15, lineHeight: 1.6 }}>{testData?.grammarFocus}</p>
              
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 24, textAlign: "left" }}>
                <div style={{ background: "white", padding: 16, borderRadius: 12, border: "1px solid #e2e8f0" }}>
                  <strong>Phần 1:</strong> Bảng chia thể ({testData?.part1.questions.length} câu)
                </div>
                <div style={{ background: "white", padding: 16, borderRadius: 12, border: "1px solid #e2e8f0" }}>
                  <strong>Phần 2:</strong> Điền từ ({testData?.part2.questions.length} câu)
                </div>
                <div style={{ background: "white", padding: 16, borderRadius: 12, border: "1px solid #e2e8f0" }}>
                  <strong>Phần 3:</strong> Trắc nghiệm ({testData?.part3.questions.length} câu)
                </div>
                <div style={{ background: "white", padding: 16, borderRadius: 12, border: "1px solid #e2e8f0" }}>
                  <strong>Phần 4:</strong> Sao & Đọc hiểu (5 câu)
                </div>
              </div>
            </div>
          )}
          <button onClick={startExam} className="verb-quiz-start-btn" disabled={!!error || !testData}>
            <Play size={20} fill="currentColor" /> Bắt Đầu Làm Bài (25 phút)
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
          <h1 className="verb-quiz-title">Minna Test - Bài {lesson}</h1>
        </div>
        <div className="verb-quiz-timer" style={{ background: timeLeft < 300 ? '#fef2f2' : 'white', color: timeLeft < 300 ? '#ef4444' : '#0f172a' }}>
          <Timer size={18} />
          <span style={{ fontWeight: 800 }}>{Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, "0")}</span>
        </div>
      </div>

      <div style={{ paddingBottom: 100 }}>
        
        {/* ================= PART 1 ================= */}
        <div style={{ background: "white", borderRadius: 20, padding: 32, marginBottom: 32, boxShadow: "0 10px 30px rgba(0,0,0,0.02)" }}>
          <h2 style={{ fontSize: 20, color: "#4f46e5", borderBottom: "2px solid #e0e7ff", paddingBottom: 12, marginBottom: 24 }}>{testData?.part1.title}</h2>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                <th style={{ padding: 16, textAlign: "left", borderBottom: "2px solid #e2e8f0", width: "35%" }}>Từ gốc</th>
                <th style={{ padding: 16, textAlign: "left", borderBottom: "2px solid #e2e8f0" }}>Chia thể (Nhập Romaji hoặc Kana)</th>
                {gameState === "result" && <th style={{ padding: 16, textAlign: "left", borderBottom: "2px solid #e2e8f0", width: "30%" }}>Kết quả</th>}
              </tr>
            </thead>
            <tbody>
              {testData?.part1.questions.map(q => {
                const isCorrect = isCorrectAnswer(answersP1[q.id] || '', q.answer);
                return (
                  <tr key={q.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: 16 }}>
                      <div style={{ fontSize: 16, fontWeight: 700, color: "#0f172a" }}>{q.word}</div>
                      <div style={{ fontSize: 13, color: "#64748b" }}>{q.reading}</div>
                    </td>
                    <td style={{ padding: 16 }}>
                      <input 
                        type="text" 
                        disabled={gameState === "result"}
                        value={answersP1[q.id] || ''}
                        onChange={e => setAnswersP1({...answersP1, [q.id]: e.target.value})}
                        style={{ 
                          width: "100%", padding: "10px 14px", borderRadius: 8, 
                          border: `1.5px solid ${gameState === "result" ? (isCorrect ? '#10b981' : '#ef4444') : '#cbd5e1'}`,
                          fontSize: 15, background: gameState === "result" ? '#f8fafc' : 'white'
                        }}
                        placeholder="Nhập đáp án..."
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

        {/* ================= PART 2 ================= */}
        <div style={{ background: "white", borderRadius: 20, padding: 32, marginBottom: 32, boxShadow: "0 10px 30px rgba(0,0,0,0.02)" }}>
          <h2 style={{ fontSize: 20, color: "#4f46e5", borderBottom: "2px solid #e0e7ff", paddingBottom: 12, marginBottom: 24 }}>{testData?.part2.title}</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {testData?.part2.questions.map((q, idx) => {
              const isCorrect = isCorrectAnswer(answersP2[q.id] || '', q.answer);
              const parts = q.sentence.split('[_]');
              return (
                <div key={q.id} style={{ background: "#f8fafc", padding: 20, borderRadius: 12, border: "1px solid #e2e8f0" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                    <span style={{ background: "#4f46e5", color: "white", width: 24, height: 24, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700 }}>{idx + 1}</span>
                    <span style={{ fontSize: 14, color: "#64748b", fontWeight: 600 }}>(Gợi ý: {q.hintWord})</span>
                  </div>
                  
                  <div style={{ fontSize: 18, color: "#0f172a", lineHeight: 2, display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                    {parts[0]}
                    <input
                      type="text"
                      disabled={gameState === "result"}
                      value={answersP2[q.id] || ''}
                      onChange={e => setAnswersP2({...answersP2, [q.id]: e.target.value})}
                      style={{ 
                        width: 120, padding: "8px 12px", borderRadius: 8, 
                        border: `2px solid ${gameState === "result" ? (isCorrect ? '#10b981' : '#ef4444') : '#4f46e5'}`,
                        fontSize: 16, fontWeight: 700, color: "#4f46e5", textAlign: "center",
                        background: gameState === "result" ? (isCorrect ? '#ecfdf5' : '#fef2f2') : '#e0e7ff'
                      }}
                    />
                    {parts[1]}
                  </div>

                  {gameState === "result" && (
                    <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px dashed #cbd5e1" }}>
                      {!isCorrect && <div style={{ color: "#ef4444", fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Đáp án đúng: {q.answer}</div>}
                      <div style={{ fontSize: 14, color: "#475569" }}>{q.explanation}</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ================= PART 3 ================= */}
        <div style={{ background: "white", borderRadius: 20, padding: 32, marginBottom: 32, boxShadow: "0 10px 30px rgba(0,0,0,0.02)" }}>
          <h2 style={{ fontSize: 20, color: "#4f46e5", borderBottom: "2px solid #e0e7ff", paddingBottom: 12, marginBottom: 24 }}>{testData?.part3.title}</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {testData?.part3.questions.map((q, idx) => {
              return (
                <div key={q.id} style={{ background: "#f8fafc", padding: 20, borderRadius: 12, border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", marginBottom: 16 }}>{idx + 1}. {q.questionText}</div>
                  
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    {q.choices.map((choice, cIdx) => {
                      const isSelected = answersP3[q.id] === choice;
                      const isChoiceCorrect = choice === q.correctAnswer;
                      
                      let bg = "white";
                      let border = "1px solid #cbd5e1";
                      if (gameState === "result") {
                        if (isChoiceCorrect) { bg = "#ecfdf5"; border = "2px solid #10b981"; }
                        else if (isSelected) { bg = "#fef2f2"; border = "2px solid #ef4444"; }
                      } else if (isSelected) {
                        bg = "#e0e7ff"; border = "2px solid #4f46e5";
                      }

                      return (
                        <button
                          key={cIdx}
                          disabled={gameState === "result"}
                          onClick={() => setAnswersP3({...answersP3, [q.id]: choice})}
                          style={{
                            padding: "12px 16px", borderRadius: 10, background: bg, border: border,
                            textAlign: "left", fontSize: 15, color: "#1e293b", cursor: gameState === "result" ? "default" : "pointer",
                            transition: "all 0.2s"
                          }}
                        >
                          <span style={{ fontWeight: 700, color: "#64748b", marginRight: 8 }}>{String.fromCharCode(65 + cIdx)}.</span>
                          {choice}
                        </button>
                      );
                    })}
                  </div>

                  {gameState === "result" && (
                    <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px dashed #cbd5e1", fontSize: 14, color: "#475569" }}>
                      {q.explanation}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ================= PART 4 ================= */}
        <div style={{ background: "white", borderRadius: 20, padding: 32, marginBottom: 32, boxShadow: "0 10px 30px rgba(0,0,0,0.02)" }}>
          <h2 style={{ fontSize: 20, color: "#4f46e5", borderBottom: "2px solid #e0e7ff", paddingBottom: 12, marginBottom: 24 }}>{testData?.part4.title}</h2>
          
          <h3 style={{ fontSize: 16, fontWeight: 800, color: "#334155", marginBottom: 16 }}>I. Sắp xếp câu (Dấu sao *)</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 24, marginBottom: 40 }}>
            {testData?.part4.starQuestions.map((q, idx) => {
              return (
                <div key={q.id} style={{ background: "#f8fafc", padding: 20, borderRadius: 12, border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", marginBottom: 16 }}>{idx + 1}. {q.questionText}</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                    {q.choices.map((choice, cIdx) => {
                      const isSelected = answersP4s[q.id] === choice;
                      const isChoiceCorrect = choice === q.correctAnswer;
                      let bg = "white";
                      let border = "1px solid #cbd5e1";
                      if (gameState === "result") {
                        if (isChoiceCorrect) { bg = "#ecfdf5"; border = "2px solid #10b981"; }
                        else if (isSelected) { bg = "#fef2f2"; border = "2px solid #ef4444"; }
                      } else if (isSelected) {
                        bg = "#e0e7ff"; border = "2px solid #4f46e5";
                      }
                      return (
                        <button
                          key={cIdx} disabled={gameState === "result"}
                          onClick={() => setAnswersP4s({...answersP4s, [q.id]: choice})}
                          style={{ padding: "10px 16px", borderRadius: 8, background: bg, border, cursor: gameState === "result" ? "default" : "pointer" }}
                        >
                          {choice}
                        </button>
                      );
                    })}
                  </div>
                  {gameState === "result" && (
                    <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px dashed #cbd5e1", fontSize: 14, color: "#475569" }}>{q.explanation}</div>
                  )}
                </div>
              );
            })}
          </div>

          <h3 style={{ fontSize: 16, fontWeight: 800, color: "#334155", marginBottom: 16 }}>II. Đọc hiểu</h3>
          {testData?.part4.reading && (
            <div style={{ background: "#f8fafc", padding: 24, borderRadius: 16, border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: 16, lineHeight: 2, color: "#0f172a", whiteSpace: "pre-wrap", marginBottom: 24 }}>
                {testData.part4.reading.passage}
              </div>
              <button onClick={() => speechService.speakJapanese(testData.part4.reading.passage)} className="btn btn-outline" style={{ marginBottom: 24 }}>
                <Volume2 size={16} /> Nghe đoạn văn
              </button>

              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                {testData.part4.reading.questions.map((q, idx) => {
                  const qId = `p4_r_${idx}`;
                  const isCorrect = isCorrectAnswer(answersP4r[qId] || '', q.answer);
                  return (
                    <div key={qId}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: "#1e293b", marginBottom: 8 }}>{idx + 1}. {q.questionText}</div>
                      <input 
                        type="text" 
                        disabled={gameState === "result"}
                        value={answersP4r[qId] || ''}
                        onChange={e => setAnswersP4r({...answersP4r, [qId]: e.target.value})}
                        style={{ 
                          width: "100%", padding: "12px 16px", borderRadius: 8, 
                          border: `1.5px solid ${gameState === "result" ? (isCorrect ? '#10b981' : '#ef4444') : '#cbd5e1'}`,
                          fontSize: 15, background: gameState === "result" ? '#f8fafc' : 'white'
                        }}
                        placeholder="Trả lời (nhập Romaji hoặc tiếng Nhật)..."
                      />
                      {gameState === "result" && (
                        <div style={{ marginTop: 12, padding: 12, background: "#f1f5f9", borderRadius: 8 }}>
                          <div style={{ color: "#059669", fontWeight: 700, marginBottom: 4 }}>Đáp án tham khảo: {q.answer}</div>
                          <div style={{ fontSize: 13, color: "#475569" }}>{q.explanation}</div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {gameState === "result" && (
                <div style={{ marginTop: 24, paddingTop: 24, borderTop: "2px solid #e2e8f0" }}>
                  <h4 style={{ fontSize: 14, fontWeight: 700, color: "#64748b", marginBottom: 8 }}>Bản dịch đoạn văn:</h4>
                  <div style={{ fontSize: 15, color: "#475569", lineHeight: 1.6 }}>{testData.part4.reading.translation}</div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Submit or Result Info */}
        {gameState === "playing" && (
          <div style={{ textAlign: "center" }}>
            <button
              onClick={submitExam}
              style={{
                background: "linear-gradient(135deg, #10b981, #059669)", color: "white", padding: "16px 40px",
                borderRadius: 99, border: "none", fontSize: 18, fontWeight: 800, cursor: "pointer",
                boxShadow: "0 10px 25px rgba(16, 185, 129, 0.4)", display: "inline-flex", alignItems: "center", gap: 8
              }}
            >
              <CheckCircle2 size={24} />
              Nộp Bài
            </button>
          </div>
        )}

        {gameState === "result" && (
          <div className="verb-quiz-result-card" style={{ marginTop: 40 }}>
            <div className="verb-quiz-result-icon-wrapper"><Award style={{ width: "3rem", height: "3rem" }} /></div>
            <h2 className="verb-quiz-result-title">Hoàn thành bài thi!</h2>
            <p className="verb-quiz-result-subtitle">
              {score >= 80 ? "Xuất sắc! Bạn nắm rất vững ngữ pháp bài này." : score >= 50 ? "Khá tốt! Hãy ôn tập lại những câu làm sai nhé." : "Điểm chưa đạt. Đừng nản chí, hãy xem lại lý thuyết bài này!"}
            </p>
            <div className="verb-quiz-score-box">
              <div className="verb-quiz-score-number">{score} <span>/ 100 điểm</span></div>
            </div>
            <div className="verb-quiz-result-actions">
              <button onClick={onBack} className="verb-quiz-action-btn-secondary">Về danh sách bài</button>
              <button onClick={() => {
                // reset
                setAnswersP1({}); setAnswersP2({}); setAnswersP3({}); setAnswersP4s({}); setAnswersP4r({});
                loadTest();
              }} className="verb-quiz-action-btn-primary">
                Thi lại bài này
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
