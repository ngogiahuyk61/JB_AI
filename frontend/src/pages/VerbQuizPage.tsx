import React, { useState, useEffect } from 'react';
import { ArrowLeft, Play, Timer, Award, RefreshCw, CheckCircle2, XCircle } from 'lucide-react';
import '../styles/VerbQuiz.css';

interface VerbQuizPageProps {
  onNavigate: (tab: string) => void;
}

export default function VerbQuizPage({ onNavigate }: VerbQuizPageProps) {
  const [gameState, setGameState] = useState<'config' | 'playing' | 'result'>('config');
  const [config, setConfig] = useState({
    jlptLevel: 'N5',
    verbGroups: ['All'],
    forms: ['All'],
    count: 10,
    mode: 'mixed'
  });

  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [wrongAnswers, setWrongAnswers] = useState<any[]>([]);

  // Fetch API Generate
  const startGame = async () => {
    try {
      // In a real app, use the API URL from environment variables
      const apiUrl = import.meta.env.VITE_API_BASE || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/VerbQuiz/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jlptLevel: config.jlptLevel,
          verbGroups: config.verbGroups.includes('All') ? [] : config.verbGroups,
          forms: config.forms.includes('All') ? [] : config.forms,
          count: config.count,
          mode: config.mode
        })
      });

      if (!response.ok) {
        throw new Error('Không thể tải câu hỏi.');
      }

      const data = await response.json();
      setQuestions(data);
      setCurrentIndex(0);
      setSelectedAnswer(null);
      setScore(0);
      setWrongAnswers([]);
      setTimeLeft(config.count * 15); // 15 seconds per question
      setGameState('playing');
    } catch (err) {
      alert('Lỗi tải câu hỏi: ' + (err as Error).message);
    }
  };

  // Timer logic
  useEffect(() => {
    if (gameState === 'playing' && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(prev => prev - 1), 1000);
      return () => clearTimeout(timer);
    } else if (gameState === 'playing' && timeLeft === 0) {
      handleNext();
    }
  }, [gameState, timeLeft]);

  const handleSelectAnswer = (index: number) => {
    if (selectedAnswer !== null) return; // Prevent multiple clicks
    setSelectedAnswer(index);
    
    const currentQ = questions[currentIndex];
    if (index === currentQ.correctIndex) {
      setScore(prev => prev + 10);
    } else {
      setWrongAnswers(prev => [...prev, currentQ]);
    }

    // Auto next after 2s
    setTimeout(() => {
      handleNext();
    }, 2000);
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
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
        <div className="verb-quiz-header-left">
          <button 
            onClick={() => onNavigate('lesson')}
            className="verb-quiz-back-btn"
          >
            <ArrowLeft style={{ width: '1.25rem', height: '1.25rem' }} />
          </button>
          <h1 className="verb-quiz-title">
            {gameState === 'config' && 'Cấu Hình Bài Test'}
            {gameState === 'playing' && `Câu ${currentIndex + 1}/${questions.length}`}
            {gameState === 'result' && 'Kết Quả'}
          </h1>
        </div>
        {gameState === 'playing' && (
          <div className="verb-quiz-timer">
            <Timer style={{ width: '1rem', height: '1rem' }} />
            <span>{Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}</span>
          </div>
        )}
      </div>

      <div className="verb-quiz-content">
        {/* State 1: Config */}
        {gameState === 'config' && (
          <div className="verb-quiz-config-card">
            <h2 className="verb-quiz-config-title">Tùy chọn ôn tập</h2>
            
            <div>
              <div className="verb-quiz-config-section">
                <label className="verb-quiz-config-label">Số lượng câu hỏi</label>
                <div className="verb-quiz-btn-group">
                  {[10, 20, 50].map(n => (
                    <button
                      key={n}
                      onClick={() => setConfig({...config, count: n})}
                      className={`verb-quiz-option-btn ${config.count === n ? 'active' : ''}`}
                    >
                      {n} câu
                    </button>
                  ))}
                </div>
              </div>

              <div className="verb-quiz-config-section">
                <label className="verb-quiz-config-label">Nhóm động từ</label>
                <div className="verb-quiz-btn-group">
                  {['All', 'I', 'II', 'III'].map(g => (
                    <button
                      key={g}
                      onClick={() => setConfig({...config, verbGroups: [g]})}
                      className={`verb-quiz-option-btn ${config.verbGroups.includes(g) ? 'active-green' : ''}`}
                    >
                      {g === 'All' ? 'Tất cả' : `Nhóm ${g}`}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ paddingTop: '1.5rem' }}>
                <button 
                  onClick={startGame}
                  className="verb-quiz-start-btn"
                >
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
            {/* Progress Bar */}
            <div className="verb-quiz-progress-bg">
              <div 
                className="verb-quiz-progress-fill" 
                style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
              />
            </div>

            <div className="verb-quiz-question-card">
              <h3 className="verb-quiz-question-text">
                {currentQ.question}
              </h3>

              <div className="verb-quiz-choices-grid">
                {currentQ.choices.map((choice: string, idx: number) => {
                  let btnClass = 'verb-quiz-choice-btn';
                  if (selectedAnswer !== null) {
                    if (idx === currentQ.correctIndex) btnClass += ' correct';
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
                      {selectedAnswer !== null && idx === currentQ.correctIndex && (
                        <CheckCircle2 className="verb-quiz-choice-icon correct" />
                      )}
                      {selectedAnswer !== null && idx === selectedAnswer && idx !== currentQ.correctIndex && (
                        <XCircle className="verb-quiz-choice-icon incorrect" />
                      )}
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
                  <p>{currentQ.explanation}</p>
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
            <p className="verb-quiz-result-subtitle">Bạn đã xuất sắc vượt qua bài test</p>

            <div className="verb-quiz-score-box">
              <div className="verb-quiz-score-number">
                {score} <span>điểm</span>
              </div>
              <p className="verb-quiz-score-text">
                Đúng {score / 10}/{questions.length} câu
              </p>
            </div>

            <div className="verb-quiz-result-actions">
              <button 
                onClick={() => setGameState('config')}
                className="verb-quiz-action-btn-secondary"
              >
                Cấu Hình Lại
              </button>
              <button 
                onClick={startGame}
                className="verb-quiz-action-btn-primary"
              >
                <RefreshCw style={{ width: '1.25rem', height: '1.25rem' }} />
                Làm Lại
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
