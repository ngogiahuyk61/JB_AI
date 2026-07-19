import { useState, useEffect } from 'react';
import { Loader2, AlertCircle, Users, BrainCircuit, RefreshCw, CheckCircle2, XCircle } from 'lucide-react';

interface Character {
  name: string;
  jpName: string;
  nationality: string;
  description: string;
}

type QuestionType = 1 | 2 | 3 | 4;

interface QuizQuestion {
  type: QuestionType;
  questionText: string;
  options: string[];
  correctAnswer: string;
}

export default function NhanVatTab() {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'list' | 'quiz'>('list');

  // Quiz state
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isQuizFinished, setIsQuizFinished] = useState(false);

  useEffect(() => {
    const fetchFile = async () => {
      setIsLoading(true);
      try {
        const res = await fetch('/chopchep/nhanvat.txt');
        if (!res.ok) throw new Error('Không tìm thấy dữ liệu nhanvat.txt');
        const text = await res.text();
        const splitLines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l);
        
        const chars: Character[] = [];
        
        for (const line of splitLines) {
          if (line.startsWith('*')) {
            const match = line.match(/^\*\s+(.+?)\s+\((.+?)\):\s+([^,]+),\s+(.+)$/);
            if (match) {
              chars.push({
                name: match[1].trim(),
                jpName: match[2].trim(),
                nationality: match[3].trim(),
                description: match[4].replace(/\.$/, '').trim()
              });
            }
          }
        }
        setCharacters(chars);
      } catch (err: any) {
        setError(err.message || 'Lỗi khi tải dữ liệu nhân vật');
      } finally {
        setIsLoading(false);
      }
    };
    fetchFile();
  }, []);

  const generateQuiz = () => {
    if (characters.length < 4) return;
    
    const newQuestions: QuizQuestion[] = [];
    const numQuestions = 10;
    
    for (let i = 0; i < numQuestions; i++) {
      const correctChar = characters[Math.floor(Math.random() * characters.length)];
      const wrongChars = characters
        .filter(c => c.name !== correctChar.name)
        .sort(() => 0.5 - Math.random())
        .slice(0, 3);
        
      const optionsChars = [correctChar, ...wrongChars].sort(() => 0.5 - Math.random());
      const qType = Math.floor(Math.random() * 4) + 1 as QuestionType;
      
      let questionText = '';
      let correctAnswer = '';
      let options: string[] = [];
      
      switch (qType) {
        case 1:
          questionText = `Tên tiếng Nhật (Katakana) của "${correctChar.name}" là gì?`;
          correctAnswer = correctChar.jpName;
          options = optionsChars.map(c => c.jpName);
          break;
        case 2:
          questionText = `Nhân vật "${correctChar.jpName}" mang quốc tịch nào?`;
          correctAnswer = correctChar.nationality;
          options = Array.from(new Set(optionsChars.map(c => c.nationality)));
          while (options.length < 4) {
            const extra = characters[Math.floor(Math.random() * characters.length)].nationality;
            if (!options.includes(extra)) options.push(extra);
          }
          options = options.sort(() => 0.5 - Math.random());
          break;
        case 3:
          questionText = `Nghề nghiệp / Mô tả của "${correctChar.name}" là gì?`;
          correctAnswer = correctChar.description;
          options = optionsChars.map(c => c.description);
          break;
        case 4:
          questionText = `Ai là: "${correctChar.description}"?`;
          correctAnswer = correctChar.name;
          options = optionsChars.map(c => c.name);
          break;
      }
      
      newQuestions.push({ type: qType, questionText, options, correctAnswer });
    }
    
    setQuestions(newQuestions);
    setCurrentQIndex(0);
    setScore(0);
    setSelectedAnswer(null);
    setIsQuizFinished(false);
  };

  const startQuiz = () => {
    generateQuiz();
    setMode('quiz');
  };

  const handleAnswer = (ans: string) => {
    if (selectedAnswer !== null) return;
    setSelectedAnswer(ans);
    
    if (ans === questions[currentQIndex].correctAnswer) {
      setScore(s => s + 1);
    }
    
    setTimeout(() => {
      if (currentQIndex < questions.length - 1) {
        setCurrentQIndex(c => c + 1);
        setSelectedAnswer(null);
      } else {
        setIsQuizFinished(true);
      }
    }, 1500);
  };

  if (isLoading) {
    return (
      <div className="center-message">
        <Loader2 className="animate-spin" size={32} />
        <p>Đang tải dữ liệu nhân vật...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="center-message error">
        <AlertCircle size={48} />
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="nv-layout">
      {/* Top Bar */}
      <div className="nv-controls">
        <button
          onClick={() => setMode('list')}
          className={`nv-mode-btn ${mode === 'list' ? 'active list' : ''}`}
        >
          <Users size={18} />
          <span>Danh sách</span>
        </button>
        <button
          onClick={startQuiz}
          className={`nv-mode-btn ${mode === 'quiz' ? 'active quiz' : ''}`}
        >
          <BrainCircuit size={18} />
          <span>Trắc nghiệm</span>
        </button>
      </div>

      {/* Content Area */}
      <div className="nv-content">
        {mode === 'list' && (
          <div className="nv-grid">
            {characters.map((char, idx) => (
              <div key={idx} className="nv-card">
                <div className="nv-card-header">
                  <div>
                    <h3 className="nv-name">{char.name}</h3>
                    <p className="nv-jp-name">{char.jpName}</p>
                  </div>
                  <span className="nv-badge">{char.nationality}</span>
                </div>
                <div className="nv-desc">{char.description}</div>
              </div>
            ))}
          </div>
        )}

        {mode === 'quiz' && questions.length > 0 && !isQuizFinished && (
          <div className="quiz-container">
            <div className="quiz-header">
              <div>
                <div className="quiz-progress">Câu hỏi {currentQIndex + 1} / {questions.length}</div>
                <h2 className="quiz-question">{questions[currentQIndex].questionText}</h2>
              </div>
              <div className="quiz-score">
                Điểm: <span>{score}</span>
              </div>
            </div>

            <div className="quiz-options">
              {questions[currentQIndex].options.map((opt, idx) => {
                const isSelected = selectedAnswer === opt;
                const isCorrect = opt === questions[currentQIndex].correctAnswer;
                
                let btnClass = '';
                if (selectedAnswer !== null) {
                  if (isCorrect) btnClass = 'correct';
                  else if (isSelected) btnClass = 'wrong';
                }

                return (
                  <button
                    key={idx}
                    onClick={() => handleAnswer(opt)}
                    disabled={selectedAnswer !== null}
                    className={`quiz-option ${btnClass}`}
                  >
                    <span>{opt}</span>
                    {selectedAnswer !== null && isCorrect && <CheckCircle2 size={24} />}
                    {selectedAnswer !== null && isSelected && !isCorrect && <XCircle size={24} />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {mode === 'quiz' && isQuizFinished && (
          <div className="quiz-result">
            <div className="quiz-result-icon">
              <BrainCircuit size={40} />
            </div>
            <h2 className="quiz-result-title">Hoàn thành!</h2>
            <p className="quiz-result-desc">Bạn đã trả lời đúng {score} trên tổng số {questions.length} câu hỏi.</p>
            
            <div className="quiz-result-score">
              {Math.round((score / questions.length) * 100)}%
            </div>

            <button onClick={startQuiz} className="quiz-result-btn">
              <RefreshCw size={20} />
              Làm lại từ đầu
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
