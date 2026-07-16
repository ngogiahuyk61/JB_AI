import { useState, useEffect, useCallback } from "react";
import { ArrowLeft, Play, Award, RefreshCw, CheckCircle2, XCircle, Timer, Volume2, Languages } from "lucide-react";
import "../styles/VerbQuiz.css";
import { kaiwaService } from "../services/kaiwaService";

export interface QuizItem {
  question: string;
  answer: string;
  hint?: string;
  kana?: string;
  hanViet?: string;
  explanation?: string;
}

export interface UniversalQuizProps {
  title: string;
  items: QuizItem[];
  mode?: "word_to_meaning" | "meaning_to_word";
  onBack: () => void;
}

function shuffleArr<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

interface GenQuestion {
  questionText: string;
  hint?: string;
  hintKana?: string;
  hintHanViet?: string;
  choices: string[];
  correctIndex: number;
  explanation: string;
}

function buildQuestions(items: QuizItem[], count: number, mode: "word_to_meaning" | "meaning_to_word"): GenQuestion[] {
  const pool = shuffleArr(items).slice(0, count);
  const allAnswers = items.map(i => (mode === "word_to_meaning" ? i.answer : i.question));

  return pool.map(item => {
    const correct = mode === "word_to_meaning" ? item.answer : item.question;
    const questionText = mode === "word_to_meaning" ? item.question : item.answer;
    
    // In word_to_meaning mode, we hide kana and hanViet behind buttons
    const hintKana = mode === "word_to_meaning" ? item.kana : undefined;
    const hintHanViet = mode === "word_to_meaning" ? item.hanViet : undefined;
    // Keep standard hint logic for meaning_to_word mode or fallback
    const hint = mode === "meaning_to_word" ? item.hint : undefined;

    const wrongPool = allAnswers.filter(a => a !== correct);
    const wrongs = shuffleArr(wrongPool).slice(0, 3);
    const choices = shuffleArr([correct, ...wrongs]);
    const correctIndex = choices.indexOf(correct);

    return {
      questionText,
      hint,
      hintKana,
      hintHanViet,
      choices,
      correctIndex,
      explanation: item.explanation || ("Dap an dung: " + correct),
    };
  });
}

function HiddenHint({ label, content }: { label: string, content: string }) {
  const [show, setShow] = useState(false);
  return (
    <button 
      onClick={() => setShow(true)}
      style={{
        background: show ? 'transparent' : '#f1f5f9',
        border: show ? 'none' : '1px solid #cbd5e1',
        padding: '4px 12px',
        borderRadius: '999px',
        fontSize: '13px',
        color: show ? '#dc2626' : '#64748b',
        cursor: show ? 'default' : 'pointer',
        fontWeight: 600,
        transition: 'all 0.2s ease',
      }}
    >
      {show ? content : `👁️ Xem ${label}`}
    </button>
  );
}

export default function UniversalQuizPage({ title, items, mode = "word_to_meaning", onBack }: UniversalQuizProps) {
  const [gameState, setGameState] = useState<"config" | "playing" | "result">("config");
  const [count, setCount] = useState(10);
  const [quizMode, setQuizMode] = useState<"word_to_meaning" | "meaning_to_word">(mode);

  const [questions, setQuestions] = useState<GenQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [wrongAnswers, setWrongAnswers] = useState<GenQuestion[]>([]);
  const [timeLeft, setTimeLeft] = useState(0);

  const startGame = useCallback(() => {
    const effectiveCount = Math.min(count, items.length);
    const qs = buildQuestions(items, effectiveCount, quizMode);
    setQuestions(qs);
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setScore(0);
    setWrongAnswers([]);
    setTimeLeft(effectiveCount * 15);
    setGameState("playing");
  }, [items, count, quizMode]);

  useEffect(() => {
    if (gameState === "playing" && timeLeft > 0) {
      const t = setTimeout(() => setTimeLeft(p => p - 1), 1000);
      return () => clearTimeout(t);
    } else if (gameState === "playing" && timeLeft === 0) {
      handleNext();
    }
  }, [gameState, timeLeft]);

  const handleNext = () => {
    setCurrentIndex(p => {
      if (p < questions.length - 1) {
        setSelectedAnswer(null);
        return p + 1;
      } else {
        setGameState("result");
        return p;
      }
    });
  };

  const handleSelectAnswer = (idx: number) => {
    if (selectedAnswer !== null) return;
    setSelectedAnswer(idx);
    const q = questions[currentIndex];
    if (idx === q.correctIndex) {
      setScore(p => p + 10);
    } else {
      setWrongAnswers(p => [...p, q]);
    }
    setTimeout(() => {
      if (currentIndex < questions.length - 1) {
        setCurrentIndex(p => p + 1);
        setSelectedAnswer(null);
      } else {
        setGameState("result");
      }
    }, 1500);
  };

  const currentQ = questions[currentIndex];

  return (
    <div className="verb-quiz-container">
      <div className="verb-quiz-header">
        <div className="verb-quiz-header-left">
          <button onClick={onBack} className="verb-quiz-back-btn">
            <ArrowLeft style={{ width: "1.25rem", height: "1.25rem" }} />
          </button>
          <h1 className="verb-quiz-title">
            {gameState === "config" && title}
            {gameState === "playing" && ("Câu " + (currentIndex + 1) + "/" + questions.length)}
            {gameState === "result" && "Kết Quả"}
          </h1>
        </div>
        {gameState === "playing" && (
          <div className="verb-quiz-timer">
            <Timer style={{ width: "1rem", height: "1rem" }} />
            <span>{Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, "0")}</span>
          </div>
        )}
      </div>

      <div className="verb-quiz-content">
        {gameState === "config" && (
          <div className="verb-quiz-config-card">
            <h2 className="verb-quiz-config-title">Tùy Chọn Bài Test</h2>
            <div className="verb-quiz-config-section">
              <label className="verb-quiz-config-label">Số câu (tối đa {items.length})</label>
              <div className="verb-quiz-btn-group">
                {[10, 20, 30].filter(n => n <= items.length).concat(items.length > 30 ? [items.length] : []).filter((v, i, a) => a.indexOf(v) === i).map(n => (
                  <button key={n} onClick={() => setCount(n)} className={"verb-quiz-option-btn " + (count === n ? "active" : "")}>
                    {n === items.length ? "Tất cả (" + items.length + ")" : n + " câu"}
                  </button>
                ))}
              </div>
            </div>
            <div className="verb-quiz-config-section">
              <label className="verb-quiz-config-label">Chế độ</label>
              <div className="verb-quiz-btn-group">
                <button onClick={() => setQuizMode("word_to_meaning")} className={"verb-quiz-option-btn " + (quizMode === "word_to_meaning" ? "active-green" : "")}>
                  Nhật ➔ Việt
                </button>
                <button onClick={() => setQuizMode("meaning_to_word")} className={"verb-quiz-option-btn " + (quizMode === "meaning_to_word" ? "active-green" : "")}>
                  Việt ➔ Nhật
                </button>
              </div>
            </div>
            <div style={{ paddingTop: "1.5rem" }}>
              <button onClick={startGame} className="verb-quiz-start-btn" disabled={items.length < 4}>
                <Play style={{ width: "1.25rem", height: "1.25rem", fill: "currentColor" }} />
                Bắt Đầu Test
              </button>
              {items.length < 4 && <p style={{ marginTop: 12, color: "#ef4444", fontSize: 13, textAlign: "center" }}>Cần ít nhất 4 từ để tạo câu hỏi.</p>}
            </div>
          </div>
        )}

        {gameState === "playing" && currentQ && (
          <div className="verb-quiz-play-container">
            <div className="verb-quiz-progress-bg">
              <div className="verb-quiz-progress-fill" style={{ width: (((currentIndex + 1) / questions.length) * 100) + "%" }} />
            </div>
            <div className="verb-quiz-question-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: (currentQ.hintKana || currentQ.hintHanViet) ? '12px' : '32px', flexWrap: 'wrap' }}>
                <h3 className="verb-quiz-question-text" style={{ marginBottom: 0 }}>{currentQ.questionText}</h3>
                
                <div style={{ display: 'flex', gap: '4px' }}>
                  {quizMode === "word_to_meaning" && (
                    <button 
                      onClick={() => {
                        import('../services/speechService').then(({ speechService }) => {
                          speechService.speakJapanese(currentQ.questionText);
                        });
                      }}
                      style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', color: '#475569', padding: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      title="Nghe phát âm"
                    >
                      <Volume2 size={20} />
                    </button>
                  )}
                  <button 
                    onClick={handleTranslate}
                    style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', color: '#475569', padding: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    title="Dịch câu hỏi"
                  >
                    <Languages size={20} />
                  </button>
                </div>
              </div>

              {translationText && (
                <div style={{ textAlign: "center", color: "#4f46e5", fontSize: 15, fontWeight: 600, marginTop: -8, marginBottom: 16, background: '#e0e7ff', padding: '6px 12px', borderRadius: '8px', display: 'inline-block', alignSelf: 'center' }}>
                  {translationText}
                </div>
              )}

              {currentQ.hint && <p style={{ textAlign: "center", color: "#64748b", fontSize: 14, marginTop: -8, marginBottom: 16 }}>({currentQ.hint})</p>}
              
              {(currentQ.hintKana || currentQ.hintHanViet) && (
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginBottom: '24px', flexWrap: 'wrap' }}>
                  {currentQ.hintKana && <HiddenHint label="Hiragana/Katakana" content={currentQ.hintKana} />}
                  {currentQ.hintHanViet && <HiddenHint label="Âm Hán Việt" content={currentQ.hintHanViet} />}
                </div>
              )}

              <div className="verb-quiz-choices-grid">
                {currentQ.choices.map((choice, idx) => {
                  let btnClass = "verb-quiz-choice-btn";
                  if (selectedAnswer !== null) {
                    if (idx === currentQ.correctIndex) btnClass += " correct";
                    else if (idx === selectedAnswer) btnClass += " incorrect";
                  }
                  return (
                    <button key={idx} onClick={() => handleSelectAnswer(idx)} disabled={selectedAnswer !== null} className={btnClass}>
                      {choice}
                      {selectedAnswer !== null && idx === currentQ.correctIndex && <CheckCircle2 className="verb-quiz-choice-icon correct" />}
                      {selectedAnswer !== null && idx === selectedAnswer && idx !== currentQ.correctIndex && <XCircle className="verb-quiz-choice-icon incorrect" />}
                    </button>
                  );
                })}
              </div>
            </div>
            {selectedAnswer !== null && (
              <div className="verb-quiz-explanation">
                <div className="verb-quiz-explanation-icon"><Award style={{ width: "1.25rem", height: "1.25rem" }} /></div>
                <div className="verb-quiz-explanation-content">
                  <h4>Giai thich</h4>
                  <p>{currentQ.explanation}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {gameState === "result" && (
          <div className="verb-quiz-result-card">
            <div className="verb-quiz-result-icon-wrapper"><Award style={{ width: "3rem", height: "3rem" }} /></div>
            <h2 className="verb-quiz-result-title">Hoan thanh!</h2>
            <p className="verb-quiz-result-subtitle">
              {score / 10 >= questions.length * 0.8 ? "Xuat sac! Ban nam rat chac kien thuc!" : score / 10 >= questions.length * 0.5 ? "Tot lam! Hay on lai nhung tu sai." : "Can on tap them! Dung nan long nhe."}
            </p>
            <div className="verb-quiz-score-box">
              <div className="verb-quiz-score-number">{score} <span>diem</span></div>
              <p className="verb-quiz-score-text">Dung {score / 10}/{questions.length} cau ({Math.round((score / 10 / questions.length) * 100)}%)</p>
            </div>
            {wrongAnswers.length > 0 && (
              <div style={{ marginTop: 24, width: "100%", maxWidth: 480, textAlign: "left" }}>
                <h4 style={{ fontWeight: 700, color: "#ef4444", marginBottom: 12 }}>Cau tra loi sai ({wrongAnswers.length}):</h4>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {wrongAnswers.map((q, i) => (
                    <div key={i} style={{ padding: "10px 14px", background: "#fff1f2", borderRadius: 10, border: "1px solid #fca5a5", fontSize: 14 }}>
                      <span style={{ fontWeight: 700 }}>{q.questionText}</span>
                      <span style={{ color: "#64748b", marginLeft: 8 }}>- {q.choices[q.correctIndex]}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="verb-quiz-result-actions">
              <button onClick={() => setGameState("config")} className="verb-quiz-action-btn-secondary">Cau Hinh Lai</button>
              <button onClick={startGame} className="verb-quiz-action-btn-primary">
                <RefreshCw style={{ width: "1.25rem", height: "1.25rem" }} />
                Lam Lai
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
