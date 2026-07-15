import { useState, useEffect, useCallback } from "react";
import { ArrowLeft, Play, Award, RefreshCw, CheckCircle2, XCircle, Timer, Loader2, BookOpen, Headphones, Edit3, BookMarked } from "lucide-react";
import "../styles/VerbQuiz.css";
import { geminiService } from "../services/geminiService";
import { speechService } from "../services/speechService";

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
  passage?: string;
  translation?: string;
  audioTranscript?: string;
}

interface JLPTExamViewProps {
  level: number; // 1 to 5
  onBack: () => void;
}

type SkillType = "vocabulary" | "grammar" | "reading" | "listening";

function shuffleArr<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

export default function JLPTExamView({ level, onBack }: JLPTExamViewProps) {
  const [gameState, setGameState] = useState<"select_skill" | "loading" | "ready" | "playing" | "result">("select_skill");
  const [skill, setSkill] = useState<SkillType | null>(null);
  
  const [words, setWords] = useState<JLPTWord[]>([]);
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [wrongAnswers, setWrongAnswers] = useState<ExamQuestion[]>([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [error, setError] = useState("");

  const loadExam = useCallback(async (selectedSkill: SkillType) => {
    setSkill(selectedSkill);
    setGameState("loading");
    setError("");
    try {
      if (selectedSkill === "vocabulary") {
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
      } else if (selectedSkill === "grammar") {
        if (!geminiService.isAvailable()) throw new Error("Cần cấu hình Gemini API để sinh đề Ngữ pháp");
        const generated = await geminiService.generateJLPTGrammarQuestions(level, 10);
        setQuestions(generated);
      } else if (selectedSkill === "reading") {
        if (!geminiService.isAvailable()) throw new Error("Cần cấu hình Gemini API để sinh đề Đọc hiểu");
        const generated = await geminiService.generateJLPTReadingQuestions(level);
        // The generator returns { passage, translation, questions: [...] }
        const formattedQs = generated.questions.map((q: any) => ({
          ...q,
          passage: generated.passage,
          translation: generated.translation
        }));
        setQuestions(formattedQs);
      } else if (selectedSkill === "listening") {
        if (!geminiService.isAvailable()) throw new Error("Cần cấu hình Gemini API để sinh đề Nghe hiểu");
        const generated = await geminiService.generateJLPTListeningQuestions(level);
        // The generator returns { audioTranscript, translation, questionText, correctAnswer, choices, explanation }
        setQuestions([generated]);
      }

      setGameState("ready");
    } catch (err: any) {
      setError(err.message || "Lỗi tải đề thi");
      setGameState("ready");
    }
  }, [level]);

  const startExam = () => {
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setScore(0);
    setWrongAnswers([]);
    
    // Time logic
    let totalSeconds = 600; // default 10 mins
    if (skill === "grammar") totalSeconds = 300; // 5 mins
    else if (skill === "reading") totalSeconds = 600; // 10 mins for reading
    else if (skill === "listening") totalSeconds = 300;
    
    setTimeLeft(totalSeconds);
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
    
    // score calculation
    const pointsPerQuestion = 100 / questions.length;
    
    if (q.choices[idx] === q.correctAnswer) {
      setScore(p => p + pointsPerQuestion);
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
    }, 2500);
  };

  const currentQ = questions[currentIndex];

  const renderSkillSelection = () => (
    <div className="verb-quiz-config-card" style={{ textAlign: "center" }}>
      <h2 className="verb-quiz-config-title">Chọn Kỹ Năng Thi N{level}</h2>
      <p style={{ color: "#64748b", marginBottom: 24, fontSize: 14 }}>Hệ thống sẽ tạo đề thi ngẫu nhiên cho bạn.</p>
      
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <button onClick={() => loadExam("vocabulary")} className="verb-quiz-option-btn" style={{ padding: "20px", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
          <BookMarked size={28} />
          <span>Từ vựng & Chữ Hán</span>
        </button>
        <button onClick={() => loadExam("grammar")} className="verb-quiz-option-btn" style={{ padding: "20px", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
          <Edit3 size={28} />
          <span>Ngữ pháp</span>
        </button>
        <button onClick={() => loadExam("reading")} className="verb-quiz-option-btn" style={{ padding: "20px", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
          <BookOpen size={28} />
          <span>Đọc hiểu</span>
        </button>
        <button onClick={() => loadExam("listening")} className="verb-quiz-option-btn" style={{ padding: "20px", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
          <Headphones size={28} />
          <span>Nghe hiểu</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="verb-quiz-container">
      <div className="verb-quiz-header">
        <div className="verb-quiz-header-left">
          <button onClick={() => {
            if (gameState === "select_skill") onBack();
            else setGameState("select_skill");
          }} className="verb-quiz-back-btn">
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
        {gameState === "select_skill" && renderSkillSelection()}

        {gameState === "loading" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "4rem 0" }}>
            <Loader2 className="animate-spin" style={{ width: "3rem", height: "3rem", color: "#4f46e5", marginBottom: "1rem" }} />
            <p style={{ color: "#64748b", fontWeight: 600 }}>Đang khởi tạo đề thi bằng AI...</p>
          </div>
        )}

        {gameState === "ready" && (
          <div className="verb-quiz-config-card" style={{ textAlign: "center" }}>
            <h2 className="verb-quiz-config-title">Đề Thi {skill === 'vocabulary' ? 'Từ vựng' : skill === 'grammar' ? 'Ngữ pháp' : skill === 'reading' ? 'Đọc hiểu' : 'Nghe hiểu'} N{level}</h2>
            {error ? (
              <div style={{ color: "#ef4444", marginBottom: 20 }}>
                <p>{error}</p>
                <button onClick={() => loadExam(skill!)} className="btn btn-outline" style={{ marginTop: 12 }}>Thử lại</button>
              </div>
            ) : (
              <div style={{ margin: "20px 0", color: "#475569" }}>
                <p><strong>Số lượng:</strong> {questions.length} câu hỏi</p>
                <p style={{ fontSize: 13, color: "#64748b", fontStyle: "italic", marginTop: 8 }}>* Đề thi được sinh ngẫu nhiên bởi AI</p>
              </div>
            )}
            <button onClick={startExam} className="verb-quiz-start-btn" disabled={!!error || questions.length === 0}>
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
            
            {/* Reading Passage */}
            {currentQ.passage && (
              <div style={{ background: "white", padding: 24, borderRadius: 16, marginBottom: 20, border: "1px solid #e2e8f0", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)" }}>
                <h4 style={{ fontSize: 13, textTransform: "uppercase", color: "#64748b", fontWeight: 700, marginBottom: 12 }}>Đoạn văn đọc hiểu</h4>
                <p style={{ fontSize: 16, lineHeight: 1.8, whiteSpace: "pre-wrap", color: "#1e293b" }}>{currentQ.passage}</p>
              </div>
            )}

            {/* Listening Audio */}
            {currentQ.audioTranscript && (
              <div style={{ background: "white", padding: 24, borderRadius: 16, marginBottom: 20, border: "1px solid #e2e8f0", textAlign: "center", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)" }}>
                <h4 style={{ fontSize: 13, textTransform: "uppercase", color: "#64748b", fontWeight: 700, marginBottom: 12 }}>Audio Nghe Hiểu</h4>
                <button 
                  onClick={() => speechService.speakJapanese(currentQ.audioTranscript!)}
                  className="btn btn-primary btn-lg" style={{ borderRadius: 99, padding: "12px 32px" }}>
                  <Headphones size={20} /> Nghe Audio (Click để phát)
                </button>
              </div>
            )}

            <div className="verb-quiz-question-card">
              <span style={{ fontSize: 13, background: "#e0e7ff", color: "#4338ca", padding: "4px 10px", borderRadius: 6, fontWeight: 700, alignSelf: "center", marginBottom: 12 }}>
                Câu {currentIndex + 1} / {questions.length}
              </span>
              <h3 className="verb-quiz-question-text" style={{ fontSize: "1.2rem", marginTop: 12, lineHeight: 1.6 }}>{currentQ.questionText}</h3>
              <div className="verb-quiz-choices-grid">
                {currentQ.choices.map((choice, idx) => {
                  let btnClass = "verb-quiz-choice-btn";
                  const isCorrect = choice === currentQ.correctAnswer;
                  if (selectedAnswer !== null) {
                    if (isCorrect) btnClass += " correct";
                    else if (idx === selectedAnswer) btnClass += " incorrect";
                  }
                  return (
                    <button key={idx} onClick={() => handleSelectAnswer(idx)} disabled={selectedAnswer !== null} className={btnClass} style={{ textAlign: "left" }}>
                      {choice}
                      {selectedAnswer !== null && isCorrect && <CheckCircle2 className="verb-quiz-choice-icon correct" />}
                      {selectedAnswer !== null && idx === selectedAnswer && !isCorrect && <XCircle className="verb-quiz-choice-icon incorrect" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {selectedAnswer !== null && (
              <div className="verb-quiz-explanation" style={{ flexDirection: "column", alignItems: "flex-start" }}>
                <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 8 }}>
                  <div className="verb-quiz-explanation-icon"><Award style={{ width: "1.25rem", height: "1.25rem" }} /></div>
                  <h4 style={{ margin: 0 }}>Giải thích đáp án</h4>
                </div>
                <div className="verb-quiz-explanation-content" style={{ paddingLeft: 32 }}>
                  <p style={{ margin: 0 }}>{currentQ.explanation}</p>
                  
                  {/* Translation for Reading/Listening */}
                  {currentQ.translation && (
                    <div style={{ marginTop: 12, padding: 12, background: "#f8fafc", borderRadius: 8, borderLeft: "4px solid #94a3b8" }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: "#64748b", marginBottom: 4 }}>Bản dịch:</p>
                      <p style={{ fontSize: 14, color: "#475569" }}>{currentQ.translation}</p>
                    </div>
                  )}

                  {/* Transcript for Listening */}
                  {currentQ.audioTranscript && (
                    <div style={{ marginTop: 12, padding: 12, background: "#f8fafc", borderRadius: 8, borderLeft: "4px solid #94a3b8" }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: "#64748b", marginBottom: 4 }}>Script (Lời thoại tiếng Nhật):</p>
                      <p style={{ fontSize: 14, color: "#475569" }}>{currentQ.audioTranscript}</p>
                    </div>
                  )}
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
              <div className="verb-quiz-score-number">{Math.round(score)} <span>/ 100 điểm</span></div>
              <p className="verb-quiz-score-text">Hoàn thành {questions.length} câu hỏi kỹ năng {skill}</p>
            </div>
            {wrongAnswers.length > 0 && (
              <div style={{ marginTop: 24, width: "100%", maxWidth: 600, textAlign: "left" }}>
                <h4 style={{ fontWeight: 700, color: "#ef4444", marginBottom: 12 }}>Các câu trả lời sai ({wrongAnswers.length}):</h4>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {wrongAnswers.slice(0, 8).map((q, i) => (
                    <div key={i} style={{ padding: "10px 14px", background: "#fff1f2", borderRadius: 10, border: "1px solid #fca5a5", fontSize: 13 }}>
                      <span style={{ fontWeight: 700, display: "block", marginBottom: 4 }}>{q.questionText}</span>
                      <span style={{ color: "#64748b" }}>Đáp án đúng: <strong style={{ color: "#059669" }}>{q.correctAnswer}</strong></span>
                    </div>
                  ))}
                  {wrongAnswers.length > 8 && <p style={{ color: "#64748b", fontSize: 12, textAlign: "center", marginTop: 4 }}>và {wrongAnswers.length - 8} câu sai khác...</p>}
                </div>
              </div>
            )}
            <div className="verb-quiz-result-actions">
              <button onClick={() => setGameState("select_skill")} className="verb-quiz-action-btn-secondary">Chọn kỹ năng khác</button>
              <button onClick={() => loadExam(skill!)} className="verb-quiz-action-btn-primary">
                <RefreshCw style={{ width: "1.25rem", height: "1.25rem" }} />
                Thi Lại Kỹ Năng Này
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
