import { useState, useEffect, useCallback } from "react";
import { ArrowLeft, Play, Award, RefreshCw, CheckCircle2, XCircle, Timer, Loader2 } from "lucide-react";
import "../styles/VerbQuiz.css";

interface JLPTWord {
  word: string;
  meaning: string;
  furigana: string;
  romaji: string;
  level: number;
}

interface ExamQuestion {
  questionText: string;
  correctAnswer: string;
  choices: string[];
  explanation: string;
}

interface JLPTExamViewProps {
  level: number; // 1 to 5
  onBack: () => void;
}

function shuffleArr<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

export default function JLPTExamView({ level, onBack }: JLPTExamViewProps) {
  const [gameState, setGameState] = useState<"loading" | "ready" | "playing" | "result">("loading");
  const [words, setWords] = useState<JLPTWord[]>([]);
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [wrongAnswers, setWrongAnswers] = useState<ExamQuestion[]>([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [error, setError] = useState("");

  const loadExam = useCallback(async () => {
    setGameState("loading");
    setError("");
    try {
      // Fetch 150 words from API to have enough distractors
      const res = await fetch(`https://jlpt-vocab-api.vercel.app/api/words?level=${level}&limit=120`);
      if (!res.ok) throw new Error("Không thể kết nối đến máy chủ JLPT API");
      const data = await res.json();
      const loadedWords: JLPTWord[] = data.words || [];
      if (loadedWords.length < 10) {
        throw new Error("Không đủ dữ liệu từ vựng để tạo đề thi");
      }

      setWords(loadedWords);

      // Generate 20 random questions
      const shuffled = shuffleArr(loadedWords);
      const selected = shuffled.slice(0, 20);

      const generated: ExamQuestion[] = selected.map(item => {
        // 50% chance: Ask for Furigana (reading), 50% chance: Ask for Meaning (English)
        const askReading = Math.random() > 0.5 && !!item.furigana && item.furigana !== item.word;
        
        let questionText = "";
        let correctAnswer = "";
        let explanation = "";
        let distractorPool: string[] = [];

        if (askReading) {
          questionText = `Cách đọc (Furigana) của từ "${item.word}" là gì?`;
          correctAnswer = item.furigana;
          explanation = `Từ "${item.word}" đọc là "${item.furigana}" (${item.meaning})`;
          distractorPool = loadedWords.map(w => w.furigana).filter(f => f && f !== correctAnswer);
        } else {
          questionText = `Nghĩa của từ "${item.word}" (${item.furigana || ""}) là gì?`;
          correctAnswer = item.meaning;
          explanation = `Từ "${item.word}" có nghĩa là "${item.meaning}"`;
          distractorPool = loadedWords.map(w => w.meaning).filter(m => m && m !== correctAnswer);
        }

        const wrongs = shuffleArr(Array.from(new Set(distractorPool))).slice(0, 3);
        const choices = shuffleArr([correctAnswer, ...wrongs]);

        return {
          questionText,
          correctAnswer,
          choices,
          explanation
        };
      });

      setQuestions(generated);
      setGameState("ready");
    } catch (err: any) {
      setError(err.message || "Lỗi tải đề thi");
      setGameState("ready");
    }
  }, [level]);

  useEffect(() => {
    loadExam();
  }, [loadExam]);

  const startExam = () => {
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setScore(0);
    setWrongAnswers([]);
    setTimeLeft(20 * 30); // 30 seconds per question, total 10 minutes
    setGameState("playing");
  };

  useEffect(() => {
    if (gameState === "playing" && timeLeft > 0) {
      const t = setTimeout(() => setTimeLeft(p => p - 1), 1000);
      return () => clearTimeout(t);
    } else if (gameState === "playing" && timeLeft === 0) {
      setGameState("result");
    }
  }, [gameState, timeLeft]);

  const handleSelectAnswer = (idx: number) => {
    if (selectedAnswer !== null) return;
    setSelectedAnswer(idx);
    const q = questions[currentIndex];
    if (q.choices[idx] === q.correctAnswer) {
      setScore(p => p + 5); // 5 points per question, max 100 points
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
    }, 2000);
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
            Đề Thi JLPT N{level}
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
        {gameState === "loading" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "4rem 0" }}>
            <Loader2 className="animate-spin" style={{ width: "3rem", height: "3rem", color: "#4f46e5", marginBottom: "1rem" }} />
            <p style={{ color: "#64748b", fontWeight: 600 }}>Đang tải đề thi từ hệ thống JLPT API...</p>
          </div>
        )}

        {gameState === "ready" && (
          <div className="verb-quiz-config-card" style={{ textAlign: "center" }}>
            <h2 className="verb-quiz-config-title">Đề Thi Thử JLPT N{level}</h2>
            {error ? (
              <div style={{ color: "#ef4444", marginBottom: 20 }}>
                <p>{error}</p>
                <button onClick={loadExam} className="btn btn-outline" style={{ marginTop: 12 }}>Thử lại</button>
              </div>
            ) : (
              <div style={{ margin: "20px 0", color: "#475569" }}>
                <p><strong>Cấu trúc đề thi:</strong> 20 câu hỏi Trắc nghiệm Từ vựng & Chữ Hán</p>
                <p><strong>Thời gian:</strong> 10 phút</p>
                <p style={{ fontSize: 13, color: "#64748b", fontStyle: "italic", marginTop: 8 }}>* Đề thi được sinh ngẫu nhiên thời gian thực từ kho từ vựng chuẩn JLPT</p>
              </div>
            )}
            <button onClick={startExam} className="verb-quiz-start-btn" disabled={!!error || words.length === 0}>
              <Play style={{ width: "1.25rem", height: "1.25rem", fill: "currentColor" }} />
              Bắt Đầu Làm Bài
            </button>
          </div>
        )}

        {gameState === "playing" && currentQ && (
          <div className="verb-quiz-play-container">
            <div className="verb-quiz-progress-bg">
              <div className="verb-quiz-progress-fill" style={{ width: (((currentIndex + 1) / questions.length) * 100) + "%" }} />
            </div>
            <div className="verb-quiz-question-card">
              <span style={{ fontSize: 13, background: "#e0e7ff", color: "#4338ca", padding: "4px 10px", borderRadius: 6, fontWeight: 700, alignSelf: "center", marginBottom: 12 }}>
                Câu {currentIndex + 1} / {questions.length}
              </span>
              <h3 className="verb-quiz-question-text" style={{ fontSize: "1.5rem", marginTop: 12 }}>{currentQ.questionText}</h3>
              <div className="verb-quiz-choices-grid">
                {currentQ.choices.map((choice, idx) => {
                  let btnClass = "verb-quiz-choice-btn";
                  const isCorrect = choice === currentQ.correctAnswer;
                  if (selectedAnswer !== null) {
                    if (isCorrect) btnClass += " correct";
                    else if (idx === selectedAnswer) btnClass += " incorrect";
                  }
                  return (
                    <button key={idx} onClick={() => handleSelectAnswer(idx)} disabled={selectedAnswer !== null} className={btnClass}>
                      {choice}
                      {selectedAnswer !== null && isCorrect && <CheckCircle2 className="verb-quiz-choice-icon correct" />}
                      {selectedAnswer !== null && idx === selectedAnswer && !isCorrect && <XCircle className="verb-quiz-choice-icon incorrect" />}
                    </button>
                  );
                })}
              </div>
            </div>
            {selectedAnswer !== null && (
              <div className="verb-quiz-explanation">
                <div className="verb-quiz-explanation-icon"><Award style={{ width: "1.25rem", height: "1.25rem" }} /></div>
                <div className="verb-quiz-explanation-content">
                  <h4>Giải thích đáp án</h4>
                  <p>{currentQ.explanation}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {gameState === "result" && (
          <div className="verb-quiz-result-card">
            <div className="verb-quiz-result-icon-wrapper"><Award style={{ width: "3rem", height: "3rem" }} /></div>
            <h2 className="verb-quiz-result-title">Hoàn thành bài thi!</h2>
            <p className="verb-quiz-result-subtitle">
              {score >= 80 ? "Chúc mừng! Bạn đã đỗ với điểm số xuất sắc!" : score >= 50 ? "Chúc mừng! Bạn đã vượt qua bài thi." : "Điểm chưa đạt. Hãy ôn tập lại nhé!"}
            </p>
            <div className="verb-quiz-score-box">
              <div className="verb-quiz-score-number">{score} <span>/ 100 điểm</span></div>
              <p className="verb-quiz-score-text">Đúng {score / 5} / {questions.length} câu</p>
            </div>
            {wrongAnswers.length > 0 && (
              <div style={{ marginTop: 24, width: "100%", maxWidth: 480, textAlign: "left" }}>
                <h4 style={{ fontWeight: 700, color: "#ef4444", marginBottom: 12 }}>Các câu trả lời sai ({wrongAnswers.length}):</h4>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {wrongAnswers.slice(0, 8).map((q, i) => (
                    <div key={i} style={{ padding: "10px 14px", background: "#fff1f2", borderRadius: 10, border: "1px solid #fca5a5", fontSize: 13 }}>
                      <span style={{ fontWeight: 700 }}>{q.questionText}</span>
                      <span style={{ color: "#64748b", marginLeft: 8 }}>- Đáp án đúng: {q.correctAnswer}</span>
                    </div>
                  ))}
                  {wrongAnswers.length > 8 && <p style={{ color: "#64748b", fontSize: 12, textAlign: "center", marginTop: 4 }}>và {wrongAnswers.length - 8} câu sai khác...</p>}
                </div>
              </div>
            )}
            <div className="verb-quiz-result-actions">
              <button onClick={onBack} className="verb-quiz-action-btn-secondary">Thoát</button>
              <button onClick={startExam} className="verb-quiz-action-btn-primary">
                <RefreshCw style={{ width: "1.25rem", height: "1.25rem" }} />
                Thi Lại
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
