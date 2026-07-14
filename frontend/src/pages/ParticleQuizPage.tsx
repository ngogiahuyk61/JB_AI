import React, { useState, useEffect } from 'react';
import { ArrowLeft, Play, Timer, Award, RefreshCw, CheckCircle2, XCircle } from 'lucide-react';
import '../styles/VerbQuiz.css'; // Reuse VerbQuiz styling

interface ParticleQuizPageProps {
  onNavigate: (tab: string) => void;
}

const PARTICLE_QUESTIONS = [
  { q: "わたし ___ 学生です。", a: "は", choices: ["は", "が", "を", "に"], ex: "Trợ từ は (đọc là wa) dùng để đánh dấu chủ ngữ của câu." },
  { q: "りんご ___ 食べます。", a: "を", choices: ["が", "を", "に", "で"], ex: "Trợ từ を dùng để chỉ đối tượng tác động của ngoại động từ (như 食べる - ăn)." },
  { q: "学校 ___ 行きます。", a: "へ", choices: ["へ", "を", "が", "で"], ex: "Trợ từ へ (đọc là e) dùng để chỉ hướng di chuyển đến một địa điểm." },
  { q: "箸(はし) ___ ご飯を食べます。", a: "で", choices: ["に", "を", "で", "と"], ex: "Trợ từ で dùng để chỉ phương tiện, công cụ hoặc cách thức thực hiện hành động." },
  { q: "日曜日 ___ 映画を見ます。", a: "に", choices: ["で", "に", "は", "が"], ex: "Trợ từ に dùng để chỉ thời điểm cụ thể (có con số) mà hành động xảy ra." },
  { q: "山田さん ___ 一緒に行きます。", a: "と", choices: ["と", "に", "で", "を"], ex: "Trợ từ と dùng để chỉ đối tượng cùng thực hiện hành động (cùng với ai)." },
  { q: "机の上 ___ 本があります。", a: "に", choices: ["で", "へ", "を", "に"], ex: "Trợ từ に dùng để chỉ vị trí tồn tại của sự vật (đi với あります / います)." },
  { q: "あそこ ___ 猫がいます。", a: "に", choices: ["で", "に", "へ", "を"], ex: "Trợ từ に chỉ nơi tồn tại (đi với います)." },
  { q: "田中さん ___ 本をもらいました。", a: "に", choices: ["を", "に", "で", "が"], ex: "Trợ từ に (hoặc から) dùng để chỉ đối tượng mà mình nhận hành động từ họ." },
  { q: "これは私 ___ 傘です。", a: "の", choices: ["が", "に", "の", "を"], ex: "Trợ từ の dùng để nối 2 danh từ, biểu thị sở hữu hoặc tính chất." },
  { q: "公園 ___ 散歩します。", a: "を", choices: ["に", "で", "を", "へ"], ex: "Trợ từ を dùng với động từ di chuyển (散歩する, 飛ぶ) để chỉ không gian di chuyển xuyên qua." },
  { q: "駅 ___ 友達に会いました。", a: "で", choices: ["に", "で", "へ", "を"], ex: "Trợ từ で dùng để chỉ nơi xảy ra một hành động." },
  { q: "雨 ___ 降っています。", a: "が", choices: ["は", "が", "を", "で"], ex: "Trợ từ が dùng để miêu tả một hiện tượng tự nhiên khách quan." },
  { q: "私は日本語 ___ 分かります。", a: "が", choices: ["を", "は", "が", "に"], ex: "Trợ từ が dùng với động từ chỉ khả năng, trạng thái (分かる, できる, 好き)." },
  { q: "日本 ___ 来ました。", a: "へ", choices: ["で", "を", "へ", "は"], ex: "Trợ từ へ chỉ hướng di chuyển đến." }
];

export default function ParticleQuizPage({ onNavigate }: ParticleQuizPageProps) {
  const [gameState, setGameState] = useState<'config' | 'playing' | 'result'>('config');
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [score, setScore] = useState(0);

  const startGame = () => {
    // Shuffle and pick 10 questions
    const shuffled = [...PARTICLE_QUESTIONS].sort(() => 0.5 - Math.random()).slice(0, 10);
    setQuestions(shuffled);
    setCurrentIndex(0);
    setScore(0);
    setSelectedAnswer(null);
    setGameState('playing');
  };

  const handleSelectAnswer = (idx: number) => {
    if (selectedAnswer !== null) return;
    setSelectedAnswer(idx);
    const currentQ = questions[currentIndex];
    if (currentQ.choices[idx] === currentQ.a) {
      setScore(s => s + 1);
    }
  };

  const nextQuestion = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(c => c + 1);
      setSelectedAnswer(null);
    } else {
      setGameState('result');
    }
  };

  const currentQ = questions[currentIndex];

  return (
    <div className="verb-quiz-container">
      {/* Header */}
      <div className="verb-quiz-header">
        <button className="verb-quiz-back-btn" onClick={() => onNavigate('lesson')}>
          <ArrowLeft size={20} />
          <span>Về Bài Học</span>
        </button>
        {gameState === 'playing' && (
          <div className="verb-quiz-score-badge">
            Điểm: {score}/{questions.length}
          </div>
        )}
      </div>

      <div className="verb-quiz-content">
        {/* State 1: Config */}
        {gameState === 'config' && (
          <div className="verb-quiz-config-card">
            <h2 className="verb-quiz-config-title">Quiz Trợ Từ (JLPT N5)</h2>
            <p style={{color: '#64748b', marginBottom: 24}}>Luyện tập phản xạ trợ từ với 10 câu hỏi ngẫu nhiên. Sau mỗi câu sẽ có giải thích chi tiết quy tắc sử dụng trợ từ đó.</p>
            <div>
              <div style={{ paddingTop: '1.5rem' }}>
                <button onClick={startGame} className="verb-quiz-start-btn">
                  <Play style={{ width: '1.25rem', height: '1.25rem', fill: 'currentColor' }} />
                  Bắt Đầu Test
                </button>
              </div>
            </div>
          </div>
        )}

        {/* State 2: Playing */}
        {gameState === 'playing' && currentQ && (
          <div className="verb-quiz-play-container">
            <div className="verb-quiz-progress-bg">
              <div className="verb-quiz-progress-fill" style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }} />
            </div>

            <div className="verb-quiz-question-card">
              <h3 className="verb-quiz-question-text" style={{ fontSize: 24, letterSpacing: 1 }}>
                {currentQ.q}
              </h3>

              <div className="verb-quiz-choices-grid">
                {currentQ.choices.map((choice: string, idx: number) => {
                  let btnClass = 'verb-quiz-choice-btn';
                  const isCorrectAnswer = choice === currentQ.a;
                  
                  if (selectedAnswer !== null) {
                    if (isCorrectAnswer) btnClass += ' correct';
                    else if (idx === selectedAnswer) btnClass += ' incorrect';
                  }

                  return (
                    <button
                      key={idx}
                      onClick={() => handleSelectAnswer(idx)}
                      disabled={selectedAnswer !== null}
                      className={btnClass}
                    >
                      {choice}
                      {selectedAnswer !== null && isCorrectAnswer && <CheckCircle2 className="verb-quiz-choice-icon correct" />}
                      {selectedAnswer !== null && idx === selectedAnswer && !isCorrectAnswer && <XCircle className="verb-quiz-choice-icon incorrect" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {selectedAnswer !== null && (
              <div className="verb-quiz-explanation">
                <div className="verb-quiz-explanation-icon">
                  <Award style={{ width: '1.25rem', height: '1.25rem' }} />
                </div>
                <div className="verb-quiz-explanation-content">
                  <h4>Giải thích</h4>
                  <p>{currentQ.ex}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* State 3: Result */}
        {gameState === 'result' && (
          <div className="verb-quiz-result-card">
            <div className="verb-quiz-result-icon-wrapper">
              <Award style={{ width: '3rem', height: '3rem' }} />
            </div>
            <h2 className="verb-quiz-result-title">Hoàn thành!</h2>
            <p className="verb-quiz-result-subtitle">Bạn đã trả lời đúng {score} trên tổng số {questions.length} câu hỏi.</p>
            
            <div className="verb-quiz-result-actions">
              <button onClick={() => setGameState('config')} className="verb-quiz-action-btn secondary">
                <RefreshCw size={18} />
                Làm lại
              </button>
              <button onClick={() => onNavigate('lesson')} className="verb-quiz-action-btn primary">
                <ArrowLeft size={18} />
                Về Bài Học
              </button>
            </div>
          </div>
        )}
      </div>

      {gameState === 'playing' && selectedAnswer !== null && (
        <div className="verb-quiz-footer-action">
          <button onClick={nextQuestion} className="verb-quiz-next-btn">
            {currentIndex === questions.length - 1 ? 'Hoàn thành' : 'Câu tiếp theo'}
            <ArrowLeft size={20} style={{ transform: 'rotate(180deg)' }} />
          </button>
        </div>
      )}
    </div>
  );
}
