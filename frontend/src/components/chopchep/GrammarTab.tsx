import { useState, useEffect } from 'react';
import { BookOpen, Loader2, AlertCircle, Volume2, Trophy, ArrowRight, CheckCircle2, XCircle, RotateCcw } from 'lucide-react';
import { speechService } from '../../services/speechService';
import { parseGrammarLessons, generateQuizQuestions } from '../../utils/grammarParser';
import type { GrammarLesson, QuizQuestion } from '../../utils/grammarParser';
import '../../styles/grammar-tab.css';

export default function GrammarTab() {
  const [lessons, setLessons] = useState<Record<number, GrammarLesson>>({});
  const [selectedLesson, setSelectedLesson] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Quiz state
  const [isQuizMode, setIsQuizMode] = useState(false);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);

  useEffect(() => {
    const fetchFile = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch('/chopchep/chopchep.txt');
        if (!res.ok) throw new Error('Không tìm thấy dữ liệu');
        const text = await res.text();
        const parsed = parseGrammarLessons(text);
        setLessons(parsed);
      } catch (err: any) {
        setError(err.message || 'Lỗi khi tải dữ liệu bài học');
      } finally {
        setIsLoading(false);
      }
    };
    fetchFile();
  }, []);

  const playSentence = async (ja: string, vi: string) => {
    speechService.cancel();
    await speechService.speak(ja, { lang: 'ja-JP', rate: 0.9 });
    await new Promise(r => setTimeout(r, 200));
    await speechService.speak(vi, { lang: 'vi-VN', rate: 0.95 });
  };

  const startQuiz = (lessonNum?: number) => {
    const questions = generateQuizQuestions(lessons, lessonNum);
    if (questions.length === 0) {
      alert("Chưa có đủ dữ liệu để tạo quiz cho bài này!");
      return;
    }
    setQuizQuestions(questions);
    setCurrentQuestionIdx(0);
    setSelectedOption(null);
    setScore(0);
    setQuizFinished(false);
    setIsQuizMode(true);
  };

  const handleOptionSelect = (option: string) => {
    if (selectedOption) return; // already answered
    setSelectedOption(option);
    
    const currentQ = quizQuestions[currentQuestionIdx];
    if (option === currentQ.correctJa) {
      setScore(s => s + 1);
      // Play correct sound or just the sentence
      speechService.speak(option, { lang: 'ja-JP', rate: 0.9 });
    }
  };

  const nextQuestion = () => {
    if (currentQuestionIdx < quizQuestions.length - 1) {
      setCurrentQuestionIdx(idx => idx + 1);
      setSelectedOption(null);
    } else {
      setQuizFinished(true);
    }
  };

  if (isLoading) {
    return (
      <div className="center-message" style={{ height: '100%' }}>
        <Loader2 className="animate-spin" size={32} />
        <p>Đang tải dữ liệu ngữ pháp...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="center-message error" style={{ height: '100%' }}>
        <AlertCircle size={48} />
        <p>{error}</p>
      </div>
    );
  }

  // QUIZ MODE RENDER
  if (isQuizMode) {
    if (quizFinished) {
      return (
        <div className="grammar-layout" style={{ justifyContent: 'center', alignItems: 'center' }}>
          <div className="quiz-result-container">
            <Trophy size={64} color="var(--primary)" style={{ margin: '0 auto' }} />
            <h2 style={{ marginTop: '16px' }}>Hoàn thành bài kiểm tra!</h2>
            <div className="quiz-result-score">
              {score} / {quizQuestions.length}
            </div>
            <p style={{ color: 'var(--text-muted)', marginBottom: '32px' }}>
              Bạn đã trả lời đúng {Math.round((score / quizQuestions.length) * 100)}% câu hỏi.
            </p>
            <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
              <button className="grammar-btn-quiz secondary" onClick={() => setIsQuizMode(false)}>
                Trở lại
              </button>
              <button className="grammar-btn-quiz" onClick={() => startQuiz(selectedLesson || undefined)}>
                <RotateCcw size={18} />
                Làm lại
              </button>
            </div>
          </div>
        </div>
      );
    }

    const q = quizQuestions[currentQuestionIdx];
    const isAnswered = selectedOption !== null;
    const isCorrect = selectedOption === q.correctJa;

    return (
      <div className="grammar-layout">
        <div className="quiz-container">
          <div className="quiz-header">
            <button className="grammar-btn-quiz secondary" onClick={() => setIsQuizMode(false)} style={{ padding: '6px 12px', fontSize: '0.9rem' }}>
              Thoát
            </button>
            <div className="quiz-progress">
              Câu {currentQuestionIdx + 1} / {quizQuestions.length}
            </div>
          </div>

          <div className="quiz-question-card">
            <div className="quiz-question-text">{q.questionVi}</div>
            
            <div className="quiz-options">
              {q.options.map((opt, i) => {
                let btnClass = "quiz-option-btn";
                if (isAnswered) {
                  if (opt === q.correctJa) btnClass += " correct";
                  else if (opt === selectedOption) btnClass += " wrong";
                }

                return (
                  <button 
                    key={i} 
                    className={btnClass}
                    onClick={() => handleOptionSelect(opt)}
                    disabled={isAnswered}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>

            {isAnswered && (
              <>
                <div className={`quiz-feedback ${isCorrect ? 'success' : 'error'}`}>
                  {isCorrect ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
                  {isCorrect ? 'Chính xác!' : 'Sai rồi! Đáp án đúng được tô màu xanh.'}
                </div>
                <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'center' }}>
                  <button className="grammar-btn-quiz" onClick={nextQuestion}>
                    {currentQuestionIdx < quizQuestions.length - 1 ? 'Câu tiếp theo' : 'Xem kết quả'}
                    <ArrowRight size={18} />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // SELECTION MODE
  if (selectedLesson === null) {
    return (
      <div className="lesson-grid-container">
        <div style={{ width: '100%', maxWidth: '800px', margin: '0 auto 24px', textAlign: 'center' }}>
           <button className="grammar-btn-quiz" style={{ margin: '0 auto' }} onClick={() => startQuiz()}>
             <Trophy size={20} />
             Test Tổng Hợp Ngữ Pháp (Bài 1 - 15)
           </button>
        </div>
        <div className="lesson-grid">
          {Array.from({length: 25}, (_, i) => i + 1).map(num => (
            <button
              key={num}
              onClick={() => setSelectedLesson(num)}
              disabled={!lessons[num]}
              className="lesson-grid-btn"
              style={{ opacity: !lessons[num] ? 0.5 : 1, cursor: !lessons[num] ? 'not-allowed' : 'pointer' }}
            >
              {num}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // THEORY MODE
  const currentLessonData = lessons[selectedLesson];

  return (
    <div className="grammar-layout">
      {/* Sidebar for Lessons */}
      <div className="np-sidebar">
        <div className="np-sidebar-header">
          <BookOpen size={20} />
          Ngữ pháp
        </div>
        <div className="np-lesson-grid">
          {Array.from({length: 15}, (_, i) => i + 1).map(num => (
            <button
              key={num}
              onClick={() => setSelectedLesson(num)}
              className={`np-lesson-grid-btn ${selectedLesson === num ? 'active' : ''}`}
            >
              {num}
            </button>
          ))}
        </div>
      </div>

      <div className="grammar-content-area">
        <div className="grammar-header-actions">
          <button className="grammar-btn-quiz" onClick={() => startQuiz(selectedLesson)}>
             <Trophy size={18} />
             Kiểm tra Bài {selectedLesson}
          </button>
        </div>

        <div className="grammar-scroll-area">
          {currentLessonData?.grammar.map((item, idx) => (
            <div key={idx} className="grammar-card">
              <div className="grammar-card-header">
                <div className="grammar-part-id">{item.id}</div>
                <div className="grammar-structure">{item.structure}</div>
                <div className="grammar-meaning">{item.meaning}</div>
              </div>
              
              {item.examples.length > 0 && (
                <div className="grammar-examples">
                  {item.examples.map((ex, eIdx) => (
                    <div 
                      key={eIdx} 
                      className="grammar-example-item"
                      onClick={() => playSentence(ex.japanese, ex.vietnamese)}
                    >
                      <div className="grammar-example-icon">
                        <Volume2 size={18} />
                      </div>
                      <div className="grammar-example-text">
                        <div className="grammar-example-ja">{ex.japanese}</div>
                        <div className="grammar-example-vi">{ex.vietnamese}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          {!currentLessonData?.grammar.length && (
            <div className="center-message">
              <p>Chưa có dữ liệu ngữ pháp cho bài này.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
