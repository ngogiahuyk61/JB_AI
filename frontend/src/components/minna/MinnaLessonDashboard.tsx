// Force IDE refresh
import { useState } from 'react';
import { ArrowLeft, BookOpen, Volume2, Ear, PenTool, BrainCircuit } from 'lucide-react';
import MinnaTestView from './MinnaTestView';
import MinnaVocabView from './MinnaVocabView';
import MinnaKanjiView from './MinnaKanjiView';
import MinnaReadingView from './MinnaReadingView';
import MinnaListeningView from './MinnaListeningView';

interface MinnaLessonDashboardProps {
  lesson: number;
  onBack: () => void;
}

type SkillType = 'vocab' | 'kanji' | 'grammar' | 'reading' | 'listening' | null;

export default function MinnaLessonDashboard({ lesson, onBack }: MinnaLessonDashboardProps) {
  const [activeSkill, setActiveSkill] = useState<SkillType>(null);

  if (activeSkill === 'vocab') {
    return <MinnaVocabView lesson={lesson} onBack={() => setActiveSkill(null)} />;
  }
  if (activeSkill === 'kanji') {
    return <MinnaKanjiView lesson={lesson} onBack={() => setActiveSkill(null)} />;
  }
  if (activeSkill === 'grammar') {
    return <MinnaTestView lesson={lesson} onBack={() => setActiveSkill(null)} />;
  }
  if (activeSkill === 'reading') {
    return <MinnaReadingView lesson={lesson} onBack={() => setActiveSkill(null)} />;
  }
  if (activeSkill === 'listening') {
    return <MinnaListeningView lesson={lesson} onBack={() => setActiveSkill(null)} />;
  }

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '24px 16px', minHeight: '100vh', background: '#f8fafc' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 40 }}>
        <button 
          onClick={onBack}
          style={{ 
            background: 'white', border: '1.5px solid #e2e8f0', width: 44, height: 44, borderRadius: 12, 
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#475569',
            boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
          }}
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: '#0f172a', margin: 0 }}>Hệ sinh thái Bài {lesson}</h1>
          <p style={{ fontSize: 14, color: '#64748b', margin: '4px 0 0 0' }}>Lựa chọn kỹ năng bạn muốn kiểm tra</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
        
        {/* Vocab */}
        <div 
          className="hover-card"
          onClick={() => setActiveSkill('vocab')}
          style={{ background: 'white', borderRadius: 20, padding: 32, cursor: 'pointer', border: '1.5px solid #e2e8f0', position: 'relative', overflow: 'hidden' }}
        >
          <div style={{ position: 'absolute', top: -20, right: -20, opacity: 0.05 }}><Volume2 size={120} /></div>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d97706', marginBottom: 20 }}>
            <Volume2 size={28} />
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>Từ vựng (Vocabulary)</h2>
          <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.5, marginBottom: 0 }}>Luyện tập 10 từ vựng. Nghe, đoán nghĩa và gõ lại Hiragana trong thời gian giới hạn.</p>
        </div>

        {/* Kanji */}
        <div 
          className="hover-card"
          onClick={() => setActiveSkill('kanji')}
          style={{ background: 'white', borderRadius: 20, padding: 32, cursor: 'pointer', border: '1.5px solid #e2e8f0', position: 'relative', overflow: 'hidden' }}
        >
          <div style={{ position: 'absolute', top: -20, right: -20, opacity: 0.05 }}><PenTool size={120} /></div>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#dc2626', marginBottom: 20 }}>
            <PenTool size={28} />
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>Hán tự (Kanji)</h2>
          <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.5, marginBottom: 0 }}>Kiểm tra nhận diện Kanji, cách đọc Hiragana và điền cách đọc trong câu.</p>
        </div>

        {/* Grammar */}
        <div 
          className="hover-card"
          onClick={() => setActiveSkill('grammar')}
          style={{ background: 'white', borderRadius: 20, padding: 32, cursor: 'pointer', border: '1.5px solid #e2e8f0', position: 'relative', overflow: 'hidden' }}
        >
          <div style={{ position: 'absolute', top: -20, right: -20, opacity: 0.05 }}><BrainCircuit size={120} /></div>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: '#e0e7ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4f46e5', marginBottom: 20 }}>
            <BrainCircuit size={28} />
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>Ngữ pháp (Grammar)</h2>
          <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.5, marginBottom: 0 }}>Chia thể động từ, điền trợ từ, dấu sao và đọc hiểu cơ bản.</p>
        </div>

        {/* Reading */}
        <div 
          className="hover-card"
          onClick={() => setActiveSkill('reading')}
          style={{ background: 'white', borderRadius: 20, padding: 32, cursor: 'pointer', border: '1.5px solid #e2e8f0', position: 'relative', overflow: 'hidden' }}
        >
          <div style={{ position: 'absolute', top: -20, right: -20, opacity: 0.05 }}><BookOpen size={120} /></div>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a', marginBottom: 20 }}>
            <BookOpen size={28} />
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>Đọc hiểu (Reading)</h2>
          <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.5, marginBottom: 0 }}>Đọc đoạn văn theo format JLPT và trả lời trắc nghiệm.</p>
        </div>

        {/* Listening */}
        <div 
          className="hover-card"
          onClick={() => setActiveSkill('listening')}
          style={{ background: 'white', borderRadius: 20, padding: 32, cursor: 'pointer', border: '1.5px solid #e2e8f0', position: 'relative', overflow: 'hidden' }}
        >
          <div style={{ position: 'absolute', top: -20, right: -20, opacity: 0.05 }}><Ear size={120} /></div>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: '#f3e8ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9333ea', marginBottom: 20 }}>
            <Ear size={28} />
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>Nghe hiểu (Listening)</h2>
          <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.5, marginBottom: 0 }}>Luyện kỹ năng choukai. Nghe đoạn văn AI đọc và trả lời 5 câu hỏi.</p>
        </div>

      </div>
    </div>
  );
}
