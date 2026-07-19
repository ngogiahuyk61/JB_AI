import { useState, useEffect, useMemo } from 'react';
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
            // Regex to parse: "* Name (JpName): Nationality, Description"
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
      // Pick a random correct character
      const correctChar = characters[Math.floor(Math.random() * characters.length)];
      
      // Pick 3 wrong characters
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
          // Ensure unique options for nationality if possible, else just use the 4 we picked
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
      
      newQuestions.push({
        type: qType,
        questionText,
        options,
        correctAnswer
      });
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
    if (selectedAnswer !== null) return; // already answered
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
      <div className="flex-1 flex flex-col items-center justify-center bg-[#0a0a0a] text-white/50">
        <Loader2 className="w-8 h-8 animate-spin mb-4" />
        <p>Đang tải dữ liệu nhân vật...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#0a0a0a] text-red-400">
        <AlertCircle className="w-12 h-12 mb-4 opacity-50" />
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0a0a0a] overflow-hidden">
      {/* Top Bar */}
      <div className="flex-none p-4 bg-[#111111] border-b border-white/5 shadow-md flex items-center justify-center gap-4 z-10">
        <button
          onClick={() => setMode('list')}
          className={`px-6 py-2 rounded-xl font-medium transition-all ${
            mode === 'list' 
              ? 'bg-indigo-600 text-white shadow-lg' 
              : 'bg-white/5 text-white/60 hover:bg-white/10'
          }`}
        >
          <div className="flex items-center gap-2">
            <Users size={18} />
            Danh sách nhân vật
          </div>
        </button>
        <button
          onClick={startQuiz}
          className={`px-6 py-2 rounded-xl font-medium transition-all ${
            mode === 'quiz' 
              ? 'bg-amber-600 text-white shadow-lg' 
              : 'bg-white/5 text-white/60 hover:bg-white/10'
          }`}
        >
          <div className="flex items-center gap-2">
            <BrainCircuit size={18} />
            Trắc nghiệm
          </div>
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          {mode === 'list' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-24">
              {characters.map((char, idx) => (
                <div key={idx} className="bg-[#1a1a1a] border border-white/5 rounded-2xl p-6 hover:border-indigo-500/50 transition-all hover:-translate-y-1 hover:shadow-[0_8px_30px_rgb(0,0,0,0.5)]">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-white">{char.name}</h3>
                      <p className="text-lg font-medium text-indigo-400">{char.jpName}</p>
                    </div>
                    <span className="px-3 py-1 bg-white/5 rounded-full text-sm font-medium text-white/60 border border-white/10">
                      {char.nationality}
                    </span>
                  </div>
                  <div className="text-white/70 bg-black/20 p-3 rounded-xl border border-white/5">
                    {char.description}
                  </div>
                </div>
              ))}
            </div>
          )}

          {mode === 'quiz' && questions.length > 0 && !isQuizFinished && (
            <div className="max-w-2xl mx-auto mt-8">
              <div className="mb-8 flex justify-between items-end">
                <div>
                  <div className="text-sm font-medium text-amber-500 mb-2">Câu hỏi {currentQIndex + 1} / {questions.length}</div>
                  <h2 className="text-2xl font-bold text-white">{questions[currentQIndex].questionText}</h2>
                </div>
                <div className="text-xl font-bold text-white/40">
                  Điểm: <span className="text-indigo-400">{score}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {questions[currentQIndex].options.map((opt, idx) => {
                  const isSelected = selectedAnswer === opt;
                  const isCorrect = opt === questions[currentQIndex].correctAnswer;
                  
                  let btnClass = 'bg-[#1a1a1a] border-white/10 text-white hover:bg-white/10';
                  
                  if (selectedAnswer !== null) {
                    if (isCorrect) {
                      btnClass = 'bg-emerald-500/20 border-emerald-500 text-emerald-400';
                    } else if (isSelected) {
                      btnClass = 'bg-red-500/20 border-red-500 text-red-400';
                    } else {
                      btnClass = 'bg-[#1a1a1a] border-white/5 text-white/30 opacity-50';
                    }
                  }

                  return (
                    <button
                      key={idx}
                      onClick={() => handleAnswer(opt)}
                      disabled={selectedAnswer !== null}
                      className={`text-left p-4 rounded-xl border-2 transition-all font-medium flex items-center justify-between ${btnClass}`}
                    >
                      <span>{opt}</span>
                      {selectedAnswer !== null && isCorrect && <CheckCircle2 size={20} className="text-emerald-500" />}
                      {selectedAnswer !== null && isSelected && !isCorrect && <XCircle size={20} className="text-red-500" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {mode === 'quiz' && isQuizFinished && (
            <div className="max-w-lg mx-auto mt-12 bg-[#1a1a1a] border border-white/10 rounded-3xl p-8 text-center shadow-2xl">
              <div className="w-24 h-24 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_40px_rgba(99,102,241,0.4)]">
                <BrainCircuit size={40} className="text-white" />
              </div>
              <h2 className="text-3xl font-bold text-white mb-2">Hoàn thành trắc nghiệm!</h2>
              <p className="text-white/60 mb-8">Bạn đã trả lời đúng {score} trên tổng số {questions.length} câu hỏi.</p>
              
              <div className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500 mb-8">
                {Math.round((score / questions.length) * 100)}%
              </div>

              <button
                onClick={startQuiz}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all hover:shadow-[0_0_20px_rgba(79,70,229,0.4)]"
              >
                <RefreshCw size={20} />
                Làm lại từ đầu
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
