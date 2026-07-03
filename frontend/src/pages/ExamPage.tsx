import React, { useState } from 'react';
import { UploadCloud, FileType, Loader2, CheckCircle, XCircle, RotateCcw, ChevronRight } from 'lucide-react';
import { geminiService } from '../services/geminiService';
import { apiService } from '../services/apiService';
import { ALL_VOCAB, type VocabEntry } from '../constants/jlptData';
import type { QuizQuestion } from '../types';

type Phase = 'upload' | 'exam' | 'result';

export default function ExamPage() {
  const [phase, setPhase] = useState<Phase>('upload');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const generateExam = async () => {
    setLoading(true);
    try {
      // Lấy từ vựng thực tế từ API (hoặc fallback về offline data)
      let vocabSource: VocabEntry[] = [];
      try {
        const isOnline = apiService.isOnline();
        if (isOnline) {
          vocabSource = await apiService.getVocabulary({ level: 'N5', limit: 100 });
        }
      } catch (e) {
        console.warn("Failed to fetch vocabulary from API for exam generator, falling back to local database", e);
      }

      if (!vocabSource || vocabSource.length === 0) {
        vocabSource = ALL_VOCAB.filter(v => v.level === 'N5');
      }

      // Trộn ngẫu nhiên và chọn ra 10 từ làm nguyên liệu sinh đề
      const shuffled = [...vocabSource].sort(() => Math.random() - 0.5);
      const selectedVocab = shuffled.slice(0, 10).map(v => ({
        kanji: v.kanji,
        kana: v.kana,
        vietnamese: v.vietnamese
      }));

      let qs: QuizQuestion[];
      if (geminiService.isAvailable()) {
        const raw = await geminiService.generateQuizFromVocab(selectedVocab, 5);
        qs = raw.map((q, i) => ({
          id: `q${i}`,
          question: q.question,
          options: q.options,
          correctAnswer: q.correctAnswer,
          explanationVi: q.explanation,
          type: 'fill-blank' as const,
        }));
      } else {
        const mock = geminiService.getMockQuizQuestions();
        qs = mock.map((q, i) => ({
          id: `q${i}`,
          question: q.question,
          options: q.options,
          correctAnswer: q.correctAnswer,
          explanationVi: q.explanation,
          type: 'fill-blank' as const,
        }));
      }

      setQuestions(qs);
      setAnswers({});
      setSubmitted(false);
      setPhase('exam');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (qId: string, optIdx: number) => {
    if (submitted) return;
    setAnswers(a => ({ ...a, [qId]: optIdx }));
  };

  const handleSubmit = () => {
    if (Object.keys(answers).length < questions.length) return;
    setSubmitted(true);
    setPhase('result');
  };

  const score = questions.filter(q => answers[q.id] === q.correctAnswer).length;

  // ── Upload Phase ──
  if (phase === 'upload') return (
    <div className="page-inner">
      <div style={{ maxWidth: 640, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div className="upload-zone">
          <div style={{ fontSize: 56, marginBottom: 12 }}>📄</div>
          <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Thi thử AI – JLPT</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: 24, maxWidth: 360, margin: '0 auto 24px' }}>
            AI sẽ sinh đề thi từ bộ từ vựng của bạn hoặc từ database JLPT N5/N4
          </p>
          <button className="btn btn-primary btn-lg" onClick={generateExam} disabled={loading}>
            {loading ? <Loader2 size={20} className="animate-spin" /> : <UploadCloud size={20} />}
            {loading ? 'AI đang tạo đề...' : 'Sinh đề thi mẫu'}
          </button>
        </div>

        {/* Thông báo tính năng nâng cao */}
        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 16, padding: 20 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <span style={{ fontSize: 24 }}>🚧</span>
            <div>
              <p style={{ fontWeight: 700, marginBottom: 4 }}>Tính năng đang phát triển</p>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                Upload PDF giáo trình → OCR → AI sinh đề tự động sẽ được ra mắt ở phiên bản tiếp theo.
                Hiện tại hệ thống sinh đề từ database từ vựng JLPT.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // ── Result Phase ──
  if (phase === 'result') return (
    <div className="page-inner">
      <div style={{ maxWidth: 700, margin: '0 auto' }}>
        {/* Score card */}
        <div style={{
          background: score >= questions.length * 0.8
            ? 'linear-gradient(135deg,#10b981,#059669)'
            : score >= questions.length * 0.5
              ? 'linear-gradient(135deg,#f59e0b,#d97706)'
              : 'linear-gradient(135deg,#ef4444,#dc2626)',
          borderRadius: 24, padding: '32px', color: 'white', textAlign: 'center', marginBottom: 24
        }}>
          <div style={{ fontSize: 64, fontWeight: 900 }}>{score}/{questions.length}</div>
          <div style={{ fontSize: 22, fontWeight: 700, marginTop: 8 }}>
            {score >= questions.length * 0.8 ? '🎉 Xuất sắc!' : score >= questions.length * 0.5 ? '👍 Khá tốt!' : '💪 Cần cố gắng thêm!'}
          </div>
          <div style={{ opacity: .85, marginTop: 8 }}>Tỉ lệ đúng: {Math.round(score / questions.length * 100)}%</div>
        </div>

        {/* Review */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {questions.map((q, i) => {
            const userAns = answers[q.id] ?? -1;
            const correct = userAns === q.correctAnswer;
            return (
              <div key={q.id} className="card card-p" style={{ borderLeft: `4px solid ${correct ? 'var(--success)' : 'var(--danger)'}` }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 12 }}>
                  {correct ? <CheckCircle size={18} style={{ color: 'var(--success)', flexShrink: 0, marginTop: 2 }} />
                    : <XCircle size={18} style={{ color: 'var(--danger)', flexShrink: 0, marginTop: 2 }} />}
                  <p style={{ fontWeight: 700, fontSize: 16 }}>{i + 1}. {q.question}</p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
                  {q.options.map((opt, oi) => (
                    <div key={oi} style={{
                      padding: '8px 14px', borderRadius: 10, fontSize: 14,
                      background: oi === q.correctAnswer ? '#f0fdf4' : oi === userAns && !correct ? '#fef2f2' : '#f8fafc',
                      border: `1px solid ${oi === q.correctAnswer ? '#86efac' : oi === userAns && !correct ? '#fca5a5' : 'var(--border)'}`,
                      color: oi === q.correctAnswer ? '#166534' : oi === userAns && !correct ? '#991b1b' : 'inherit',
                      fontWeight: oi === q.correctAnswer ? 700 : 400
                    }}>
                      {String.fromCharCode(65 + oi)}. {opt}
                      {oi === q.correctAnswer && ' ✓'}
                      {oi === userAns && !correct && ' ✗'}
                    </div>
                  ))}
                </div>
                {q.explanationVi && (
                  <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 10, padding: '8px 12px', fontSize: 13, color: '#0369a1' }}>
                    💡 {q.explanationVi}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
          <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setPhase('upload')}>
            <RotateCcw size={16} /> Tạo đề mới
          </button>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={generateExam}>
            <ChevronRight size={16} /> Làm lại
          </button>
        </div>
      </div>
    </div>
  );

  // ── Exam Phase ──
  const answered = Object.keys(answers).length;
  return (
    <div className="page-inner">
      <div style={{ maxWidth: 700, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Header */}
        <div className="card card-p" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontWeight: 800, fontSize: 18 }}>📝 Đề thi AI – JLPT N5</h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
              {answered}/{questions.length} câu đã trả lời
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="progress-bar" style={{ width: 120, height: 6, marginBottom: 6 }}>
              <div className="progress-fill" style={{ width: `${answered / questions.length * 100}%` }} />
            </div>
          </div>
        </div>

        {/* Questions */}
        {questions.map((q, i) => (
          <div key={q.id} className="card card-p">
            <p style={{ fontWeight: 700, fontSize: 17, marginBottom: 16, lineHeight: 1.5 }}>
              {i + 1}. {q.question}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {q.options.map((opt, oi) => (
                <button key={oi}
                  className={`quiz-option ${answers[q.id] === oi ? 'selected' : ''}`}
                  style={{
                    background: answers[q.id] === oi ? 'var(--primary-50)' : 'white',
                    borderColor: answers[q.id] === oi ? 'var(--primary)' : 'var(--border)',
                  }}
                  onClick={() => handleAnswer(q.id, oi)}>
                  <span className="quiz-option-label"
                    style={{ background: answers[q.id] === oi ? 'var(--primary)' : 'var(--border)', color: answers[q.id] === oi ? 'white' : 'inherit' }}>
                    {String.fromCharCode(65 + oi)}
                  </span>
                  <span className="text-ja" style={{ fontSize: 16 }}>{opt}</span>
                </button>
              ))}
            </div>
          </div>
        ))}

        <button className="btn btn-primary btn-lg w-full"
          onClick={handleSubmit}
          disabled={answered < questions.length}>
          {answered < questions.length ? `Trả lời thêm ${questions.length - answered} câu` : '📤 Nộp bài'}
        </button>
      </div>
    </div>
  );
}
