import { useState, useEffect, useCallback } from 'react';
import BottomNav from './components/layout/BottomNav';
import SidebarNav from './components/layout/SidebarNav';
import Topbar from './components/layout/Topbar';
import DashboardPage from './pages/DashboardPage';
import FlashcardPage from './pages/FlashcardPage';
import ExamPage from './pages/ExamPage';
import VocabularyPage from './pages/VocabularyPage';
import LessonPage from './pages/LessonPage';
import KaiwaPage from './pages/KaiwaPage';
import VerbQuizPage from './pages/VerbQuizPage';
import ParticleQuizPage from './pages/ParticleQuizPage';
import FloatingChat from './components/chat/FloatingChat';
import { MessageCircle } from 'lucide-react';
import { useAppLayout } from './hooks/useAppLayout';
import type { AppTab } from './constants/navItems';
import './styles/index.css';

export default function App() {
  const [activeTab, setActiveTab] = useState<AppTab>('dashboard');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const layout = useAppLayout();
  const isDesktop = layout === 'desktop';

  // Handle browser back button and URL hash navigation
  useEffect(() => {
    const hash = window.location.hash.replace('#', '') as AppTab;
    if (hash) setActiveTab(hash);

    const handlePopState = () => {
      const currentHash = window.location.hash.replace('#', '') as AppTab;
      setActiveTab(currentHash || 'dashboard');
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleTabChange = useCallback((tab: AppTab) => {
    if (activeTab !== tab) {
      window.history.pushState(null, '', `#${tab}`);
      setActiveTab(tab);
    }
  }, [activeTab]);

  const renderPage = () => {
    switch (activeTab) {
      case 'dashboard': return <DashboardPage onNavigate={(tab) => handleTabChange(tab as AppTab)} />;
      case 'flashcard': return <FlashcardPage />;
      case 'exam': return <ExamPage />;
      case 'vocabulary': return <VocabularyPage onNavigate={(tab) => handleTabChange(tab as AppTab)} />;
      case 'lesson': return <LessonPage onNavigate={(tab) => handleTabChange(tab as AppTab)} />;
      case 'kaiwa': return <KaiwaPage />;
      case 'settings': return <SettingsPage />;
      case 'verbquiz': return <VerbQuizPage onNavigate={(tab) => handleTabChange(tab as AppTab)} />;
      case 'particlequiz': return <ParticleQuizPage onNavigate={(tab) => handleTabChange(tab as AppTab)} />;
      default: return <DashboardPage onNavigate={(tab) => handleTabChange(tab as AppTab)} />;
    }
  };

  return (
    <div className={`app-layout ${isDesktop ? 'app-layout--desktop' : 'app-layout--mobile'}`}>
      {isDesktop && (
        <SidebarNav activeTab={activeTab} onTabChange={handleTabChange} />
      )}

      <div className="main-content">
        <Topbar activeTab={activeTab} />
        <div className="page-content">
          {renderPage()}
        </div>
      </div>

      {!isDesktop && (
        <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />
      )}

      <FloatingChat isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />

      {!isChatOpen && (
        <button className="fab-chat" onClick={() => setIsChatOpen(true)} aria-label="Mở chat AI">
          <MessageCircle size={26} />
        </button>
      )}
    </div>
  );
}

// ── Settings Page (inline, nhỏ) ─────────────────────────────
function SettingsPage() {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('gemini_api_key') || '');
  const [groqApiKey, setGroqApiKey] = useState(() => localStorage.getItem('groq_api_key') || '');
  const [saved, setSaved] = useState(false);

  const save = () => {
    localStorage.setItem('gemini_api_key', apiKey);
    localStorage.setItem('groq_api_key', groqApiKey);
    // Note: env vars can't be set at runtime, but we'll handle via localStorage in services
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    // Reload to apply
    if (apiKey || groqApiKey) setTimeout(() => window.location.reload(), 500);
  };

  return (
    <div className="page-inner">
      <div style={{ maxWidth: 600, display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div className="card card-p">
          <h3 style={{ fontWeight: 800, fontSize: 18, marginBottom: 4 }}>⚙️ Cài đặt API</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 20 }}>
            Cấu hình các API keys để kích hoạt tính năng AI
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontWeight: 700, fontSize: 14, marginBottom: 6 }}>
                🤖 Google Gemini API Key (Free)
              </label>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
                Lấy tại: <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" style={{ color: 'var(--primary)' }}>aistudio.google.com</a> → Hoàn toàn miễn phí!
              </p>
              <input
                type="password"
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                placeholder="AIza..."
                style={{ width: '100%', padding: '10px 14px', border: '1.5px solid var(--border)', borderRadius: 12, fontSize: 14, outline: 'none', fontFamily: 'monospace' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: 700, fontSize: 14, marginBottom: 6 }}>
                ⚡ Groq API Key (Cho phần Kaiwa - Whisper/Qwen3)
              </label>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
                Lấy tại: <a href="https://console.groq.com/keys" target="_blank" rel="noreferrer" style={{ color: 'var(--primary)' }}>console.groq.com</a> → Cần thiết để chấm điểm giao tiếp và nhận diện giọng nói.
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="password"
                  value={groqApiKey}
                  onChange={e => setGroqApiKey(e.target.value)}
                  placeholder="gsk_..."
                  style={{ flex: 1, padding: '10px 14px', border: '1.5px solid var(--border)', borderRadius: 12, fontSize: 14, outline: 'none', fontFamily: 'monospace' }}
                />
                <button className="btn btn-primary" onClick={save}>
                  {saved ? '✅ Đã lưu' : 'Lưu'}
                </button>
              </div>
            </div>

            <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 12, padding: 16 }}>
              <p style={{ fontWeight: 700, fontSize: 14, color: '#166534', marginBottom: 4 }}>✅ Tính năng khi có API Key:</p>
              <ul style={{ fontSize: 13, color: '#15803d', paddingLeft: 20, lineHeight: 2 }}>
                <li>Chat với Sensei AI thông minh</li>
                <li>Tự động sinh câu ví dụ cho Flashcard</li>
                <li>Sinh đề thi từ từ vựng của bạn</li>
                <li>Phân tích và sửa phát âm</li>
              </ul>
            </div>

            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12, padding: 16 }}>
              <p style={{ fontWeight: 700, fontSize: 14, color: '#92400e', marginBottom: 4 }}>⚡ Không có API Key:</p>
              <ul style={{ fontSize: 13, color: '#b45309', paddingLeft: 20, lineHeight: 2 }}>
                <li>Vẫn dùng được Flashcard Excel</li>
                <li>Phân tích Kanji offline (103 Kanji N5)</li>
                <li>Text-to-Speech Nhật + Việt (miễn phí)</li>
                <li>Chat/Quiz dùng câu trả lời mẫu</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="card card-p">
          <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 12 }}>🎯 Mục tiêu JLPT</h3>
          <div style={{ display: 'flex', gap: 8 }}>
            {['N5', 'N4', 'N3', 'N2', 'N1'].map(level => (
              <button key={level}
                style={{
                  flex: 1, padding: '10px', border: '1.5px solid var(--border)', borderRadius: 12,
                  cursor: 'pointer', fontWeight: 700, background: level === 'N4' ? 'var(--primary)' : 'white',
                  color: level === 'N4' ? 'white' : 'var(--text-secondary)'
                }}>
                {level}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
