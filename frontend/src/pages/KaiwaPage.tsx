import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mic, MicOff, Volume2, ChevronRight, Minimize2, Maximize2,
  Loader2, Play, MessageSquare, ListOrdered, Shuffle, CheckCircle2,
  XCircle, Send, Languages
} from 'lucide-react';
import { kaiwaService, type KaiwaMode, type KaiwaQuestion } from '../services/kaiwaService';
import { speechService } from '../services/speechService';
import { KAIWA_TOPICS } from '../data/kaiwaTopics';
import type { KaiwaTopic } from '../data/kaiwaTopics';
import TopicPlayer from '../components/kaiwa/TopicPlayer';
import { BookOpen } from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────────
type ChatMessage = {
  id: string;
  type: 'bot_question' | 'user_answer' | 'reference_answer' | 'evaluation_result' | 'loading';
  text: string;
  isCorrect?: boolean;
  score?: number;
  grammarFeedback?: string;
};

type AppState = 'setup' | 'chat' | 'topic_play';
type SetupMode = KaiwaMode | 'topic';

// ── TTS helper ────────────────────────────────────────────────────────────────
// Now using speechService.speakJapanese from global service

// ── Main Component ────────────────────────────────────────────────────────────
export default function KaiwaPage() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [appState, setAppState] = useState<AppState>('setup');
  const [mode, setMode] = useState<SetupMode>('lesson');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<KaiwaQuestion | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<KaiwaTopic | null>(null);
  
  const [isRecording, setIsRecording] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [error, setError] = useState('');
  const [sessionExcludeIds, setSessionExcludeIds] = useState<number[]>([]);
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const updateViewportHeight = () => {
      const nextHeight = window.visualViewport?.height ?? window.innerHeight;
      document.documentElement.style.setProperty('--app-viewport-height', `${nextHeight}px`);
    };

    updateViewportHeight();
    const viewport = window.visualViewport;
    viewport?.addEventListener('resize', updateViewportHeight);
    window.addEventListener('resize', updateViewportHeight);

    return () => {
      viewport?.removeEventListener('resize', updateViewportHeight);
      window.removeEventListener('resize', updateViewportHeight);
    };
  }, []);

  const addMessage = (msg: Omit<ChatMessage, 'id'>) => {
    const id = Math.random().toString(36).substring(7);
    setMessages(prev => [...prev, { ...msg, id }]);
  };

  const loadNextQuestion = useCallback(async (m: KaiwaMode, exclude: number[] = sessionExcludeIds) => {
    setError('');
    try {
      const q = await kaiwaService.getNextQuestion({
        // If lesson mode, just do random from lesson 1-25? Wait, user wants "Tuần tự (Bài 1 -> 25)".
        // Since we don't have a UI for selecting lessons anymore, we'll just use 'random' for all N5 questions,
        // or 'lesson' passing lessonId=1 and incrementing. 
        // For simplicity, let's just use random for both, but exclude already answered.
        // If mode is 'lesson', maybe we can just query the whole db sequentially.
        mode: m === 'lesson' ? 'lesson' : 'random',
        excludeIds: exclude,
      });

      if (!q) {
        addMessage({ type: 'bot_question', text: '🎉 Bạn đã hoàn thành tất cả câu hỏi!' });
        return;
      }
      setCurrentQuestion(q);
      
      // Auto speak
      setTimeout(() => speechService.speakJapanese(q.japaneseText), 600);
      
      addMessage({
        type: 'bot_question',
        text: `「${q.japaneseText}」`
      });

    } catch (e) {
      setError('Lỗi tải câu hỏi. Thử lại sau.');
      console.error(e);
    }
  }, [sessionExcludeIds]);

  const handleStart = async () => {
    if (mode === 'topic') {
      // Show topic selection? Actually, we can show topics right in the setup screen or when pressing start
      // For simplicity, let's just make 'Start' show the topics if mode === 'topic'
      // Wait, let's just render the topic list right there or transition.
      // Let's transition to topic_play and set a default topic, or render a selection screen.
    } else {
      setAppState('chat');
      setMessages([]);
      setSessionExcludeIds([]);
      await loadNextQuestion(mode as KaiwaMode, []);
    }
  };

  const handleNext = async () => {
    if (!currentQuestion) return;
    const newExclude = [...sessionExcludeIds, currentQuestion.id];
    setSessionExcludeIds(newExclude);
    await loadNextQuestion(mode as KaiwaMode, newExclude);
  };

  const handleTranslate = async (id: string, text: string) => {
    if (translations[id] && translations[id] !== '(Lỗi dịch)') return;
    setTranslations(prev => ({ ...prev, [id]: 'Đang dịch...' }));
    try {
      // Strip brackets before translating
      const cleanText = text.replace(/[「」]/g, '');
      const result = await kaiwaService.translate(cleanText);
      setTranslations(prev => ({ ...prev, [id]: result }));
    } catch (e) {
      setTranslations(prev => ({ ...prev, [id]: '(Lỗi dịch)' }));
    }
  };

  // ── Speech Recognition (Whisper API) ──────────────────────────────────────
  const getSupportedAudioMimeType = () => {
    if (typeof MediaRecorder === 'undefined') return '';
    const preferredTypes = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus', 'audio/wav'];
    return preferredTypes.find(type => MediaRecorder.isTypeSupported(type)) || '';
  };

  const startRecording = async () => {
    console.log('[Kaiwa] startRecording invoked', { hasMediaDevices: !!navigator.mediaDevices, hasGetUserMedia: !!navigator.mediaDevices?.getUserMedia, isSecureContext: window.isSecureContext });
    window.speechSynthesis.cancel();

    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setError('Mic chỉ hoạt động khi trang mở bằng HTTPS hoặc localhost. Hãy mở bằng URL bảo mật trên điện thoại.');
      return;
    }

    if (typeof MediaRecorder === 'undefined') {
      setError('Thiết bị này không hỗ trợ thu âm trực tiếp. Hãy thử Chrome/Edge mới hơn.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('[Kaiwa] microphone granted', stream.getAudioTracks().length);
      const mimeType = getSupportedAudioMimeType();
      const mediaRecorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onerror = () => {
        setError('Ghi âm bị lỗi. Hãy thử lại sau.');
        setIsRecording(false);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.onstop = async () => {
        const blobType = mediaRecorder.mimeType || mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: blobType });

        stream.getTracks().forEach(track => track.stop());
        setIsRecording(false);

        const loadingId = Math.random().toString(36).substring(7);
        setMessages(prev => [...prev, { id: loadingId, type: 'loading', text: 'Đang nhận diện giọng nói (Groq) ⚡...' }]);

        try {
          const transcript = await kaiwaService.transcribeAudio(audioBlob);
          setMessages(prev => prev.filter(m => m.id !== loadingId));

          if (!transcript || transcript.trim() === '') {
            setError('Không nghe rõ bạn nói gì, vui lòng thử lại.');
          } else {
            submitAnswer(transcript);
          }
        } catch (err: any) {
          setMessages(prev => prev.filter(m => m.id !== loadingId));
          let errorMsg = 'Lỗi kết nối tới Whisper API.';
          if (err instanceof Error) {
            try {
              // Extract the JSON message from the HTTP error string if possible
              const match = err.message.match(/HTTP \d+: (.*)/);
              if (match) {
                const parsed = JSON.parse(match[1]);
                errorMsg = parsed.message || errorMsg;
              } else {
                errorMsg = err.message;
              }
            } catch {
              errorMsg = err.message;
            }
          }
          setError(`Lỗi: ${errorMsg}`);
          console.error(err);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setError('');
    } catch (err) {
      console.error('[Kaiwa] Error accessing microphone:', err);
      setError('Không thể truy cập Microphone. Vui lòng cấp quyền trong trình duyệt.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  const submitAnswer = async (answerText: string) => {
    if (!currentQuestion || !answerText.trim()) return;
    const ans = answerText.trim();
    setTextInput('');
    setIsRecording(false);
    
    // 1. Add User Message
    addMessage({ type: 'user_answer', text: ans });

    try {
      // 2. Fetch expected answer instantly
      const ref = await kaiwaService.getReferenceAnswer(currentQuestion.id);
      addMessage({ type: 'reference_answer', text: ref.expectedAnswer });
      speechService.speakJapanese(ref.expectedAnswer);

      // 3. Show Loading
      const loadingId = Math.random().toString(36).substring(7);
      setMessages(prev => [...prev, { id: loadingId, type: 'loading', text: 'Đang phân tích ngữ pháp ⏳...' }]);

      // 4. Evaluate (Fast Qwen3)
      const evalRes = await kaiwaService.evaluate(currentQuestion.id, ans);
      
      // Remove loading and show result
      setMessages(prev => prev.filter(m => m.id !== loadingId));
      addMessage({
        type: 'evaluation_result',
        text: evalRes.feedback,
        isCorrect: evalRes.passThreshold,
        score: evalRes.grammarScore,
        grammarFeedback: evalRes.grammarExplanation
      });

    } catch (err) {
      setMessages(prev => prev.filter(m => m.type !== 'loading'));
      setError('Lỗi khi chấm điểm.');
      console.error(err);
    }
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitAnswer(textInput);
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  const containerStyle: React.CSSProperties = isExpanded
    ? { position: 'fixed', inset: 0, zIndex: 50, background: '#111827', height: 'var(--app-viewport-height, 100dvh)' }
    : { minHeight: 'var(--app-viewport-height, 100dvh)', background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)', padding: '20px 16px' };

  return (
    <div style={{ ...containerStyle, display: 'flex', flexDirection: 'column', fontFamily: "'Inter', sans-serif" }}>
      
      {/* ── CHAT MODE BAR ─────────────────────────────────────── */}
      <div className="chat-mode-bar" style={{
        background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(255,255,255,0.1)', padding: '12px 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)', padding: 8, borderRadius: 12 }}>
            <MessageSquare size={20} color="white" />
          </div>
          <div>
            <h1 style={{ color: 'white', fontSize: 18, fontWeight: 700, margin: 0 }}>Kaiwa Tutor</h1>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, margin: 0 }}>Trợ lý luyện hội thoại N5</p>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: 8 }}>
          {appState === 'chat' && (
            <button onClick={() => setAppState('setup')} style={{
              background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8,
              padding: '8px 12px', color: 'white', cursor: 'pointer', fontSize: 13, fontWeight: 600
            }}>
              Đổi chế độ
            </button>
          )}
          <button 
            onClick={() => setIsExpanded(!isExpanded)} 
            style={{
              background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8,
              padding: '8px', color: 'white', cursor: 'pointer', display: 'flex'
            }}
            title={isExpanded ? "Thu gọn" : "Phóng to"}
          >
            {isExpanded ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px', maxWidth: 800, margin: '0 auto', width: '100%', position: 'relative' }}>
        
        {error && (
          <div style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: 12, padding: '12px', color: '#fca5a5', fontSize: 14, marginBottom: 16 }}>
            ⚠️ {error}
          </div>
        )}

        {/* ── SETUP SCREEN ──────────────────────────────────────── */}
        {appState === 'setup' && (
          <div style={{ animation: 'fadeIn 0.3s ease', maxWidth: 500, margin: '40px auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 32 }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🎌</div>
              <h2 style={{ color: 'white', margin: 0, fontSize: 24 }}>Chọn chế độ học</h2>
              <p style={{ color: 'rgba(255,255,255,0.6)' }}>Luyện tập phản xạ hội thoại N5</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
              <ModeButton 
                active={mode === 'lesson'} 
                onClick={() => setMode('lesson')}
                icon={<ListOrdered size={20} />} 
                title="Tuần tự (Bài 1 → 25)" 
                subtitle="Học theo thứ tự giáo trình Minna No Nihongo" 
              />
              <ModeButton 
                active={mode === 'random'} 
                onClick={() => setMode('random')}
                icon={<Shuffle size={20} />} 
                title="Ngẫu nhiên (500 câu)" 
                subtitle="Thử thách phản xạ ngẫu nhiên" 
              />
              <ModeButton 
                active={mode === 'topic'} 
                onClick={() => setMode('topic')}
                icon={<BookOpen size={20} />} 
                title="Theo Chủ đề (Hội thoại mẫu)" 
                subtitle="Đóng vai luyện tập N5" 
              />
            </div>

            {mode === 'topic' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <h3 style={{ color: 'white', marginTop: 16, marginBottom: 8, fontSize: 16 }}>Chọn Chủ Đề:</h3>
                {KAIWA_TOPICS.map(t => (
                  <button
                    key={t.id}
                    onClick={() => {
                      setSelectedTopic(t);
                      setAppState('topic_play');
                    }}
                    style={{
                      background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: 16, padding: '16px', display: 'flex', alignItems: 'center', gap: 16,
                      cursor: 'pointer', textAlign: 'left', transition: 'transform 0.2s'
                    }}
                    onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-2px)')}
                    onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
                  >
                    <img src={t.image} alt={t.title} style={{ width: 64, height: 64, borderRadius: 8, objectFit: 'cover' }} />
                    <div>
                      <div style={{ color: 'white', fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{t.title}</div>
                      <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{t.context}</div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <button
                onClick={handleStart}
                style={{
                  width: '100%', background: 'linear-gradient(135deg, #43e97b, #38f9d7)',
                  border: 'none', borderRadius: 16, padding: '18px',
                  color: '#064e3b', fontSize: 18, fontWeight: 800, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                  boxShadow: '0 8px 32px rgba(67,233,123,0.3)', transition: 'transform 0.2s'
                }}
                onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-2px)')}
                onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
              >
                <Play size={24} fill="currentColor" /> 🔰 Hajimete (Bắt đầu)
              </button>
            )}
          </div>
        )}

        {/* ── TOPIC PLAY SCREEN ───────────────────────────────────────── */}
        {appState === 'topic_play' && selectedTopic && (
          <div style={{ position: 'absolute', inset: 0, zIndex: 20 }}>
            <TopicPlayer topic={selectedTopic} onBack={() => setAppState('setup')} />
          </div>
        )}

        {/* ── CHAT SCREEN ───────────────────────────────────────── */}
        {appState === 'chat' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: 100 }}>
            <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: 12, marginBottom: 8 }}>
              {mode === 'lesson' ? 'Chế độ Tuần tự' : 'Chế độ Ngẫu nhiên'}
            </div>
            
            {messages.map((msg, idx) => (
              <div key={msg.id} style={{ 
                display: 'flex', 
                flexDirection: 'column',
                alignItems: msg.type === 'user_answer' ? 'flex-end' : 'flex-start',
                animation: 'fadeIn 0.3s ease'
              }}>
                {/* BOT QUESTION */}
                {msg.type === 'bot_question' && (
                  <div style={{ 
                    background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '16px 16px 16px 4px', padding: '16px 20px', maxWidth: '85%' 
                  }}>
                    <div style={{ color: '#a5b4fc', fontSize: 11, fontWeight: 700, marginBottom: 8 }}>🤖 CHATBOT</div>
                    <div style={{ color: 'white', fontSize: 18, fontWeight: 600, lineHeight: 1.5 }}>
                      {msg.text}
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                      <button
                        onClick={() => speechService.speakJapanese(msg.text.replace(/[「」]/g, ''))}
                        style={{
                          background: 'rgba(102,126,234,0.2)', border: 'none',
                          borderRadius: 8, padding: '6px 12px', cursor: 'pointer', color: '#c4b5fd',
                          fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600
                        }}
                      >
                        <Volume2 size={14} /> Phát âm
                      </button>
                      <button
                        onClick={() => handleTranslate(msg.id, msg.text)}
                        style={{
                          background: 'rgba(16,185,129,0.2)', border: 'none',
                          borderRadius: 8, padding: '6px 12px', cursor: 'pointer', color: '#6ee7b7',
                          fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600
                        }}
                      >
                        <Languages size={14} /> Dịch
                      </button>
                    </div>
                    {translations[msg.id] && (
                      <div style={{ marginTop: 12, color: '#a7f3d0', fontSize: 14, fontStyle: 'italic', borderTop: '1px dashed rgba(255,255,255,0.2)', paddingTop: 8 }}>
                        {translations[msg.id]}
                      </div>
                    )}
                  </div>
                )}

                {/* USER ANSWER */}
                {msg.type === 'user_answer' && (
                  <div style={{ 
                    background: 'linear-gradient(135deg, #667eea, #764ba2)', 
                    borderRadius: '16px 16px 4px 16px', padding: '14px 20px', maxWidth: '85%',
                    color: 'white', fontSize: 16, boxShadow: '0 4px 12px rgba(102,126,234,0.3)'
                  }}>
                    {msg.text}
                  </div>
                )}

                {/* REFERENCE ANSWER */}
                {msg.type === 'reference_answer' && (
                  <div style={{ 
                    background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.3)',
                    borderRadius: '16px 16px 16px 4px', padding: '14px 20px', maxWidth: '85%', marginTop: 8
                  }}>
                    <div style={{ color: '#34d399', fontSize: 12, fontWeight: 700, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                      💡 CÂU TRẢ LỜI THAM KHẢO
                    </div>
                    <div style={{ color: 'white', fontSize: 16, fontWeight: 600 }}>
                      「{msg.text}」
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                      <button
                        onClick={() => speechService.speakJapanese(msg.text.replace(/[「」]/g, ''))}
                        style={{
                          background: 'rgba(52,211,153,0.2)', border: 'none',
                          borderRadius: 8, padding: '6px 12px', cursor: 'pointer', color: '#a7f3d0',
                          fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600
                        }}
                      >
                        <Volume2 size={14} /> Phát âm
                      </button>
                      <button
                        onClick={() => handleTranslate(msg.id, msg.text)}
                        style={{
                          background: 'rgba(16,185,129,0.2)', border: 'none',
                          borderRadius: 8, padding: '6px 12px', cursor: 'pointer', color: '#6ee7b7',
                          fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600
                        }}
                      >
                        <Languages size={14} /> Dịch
                      </button>
                    </div>
                    {translations[msg.id] && (
                      <div style={{ marginTop: 12, color: '#a7f3d0', fontSize: 14, fontStyle: 'italic', borderTop: '1px dashed rgba(255,255,255,0.2)', paddingTop: 8 }}>
                        {translations[msg.id]}
                      </div>
                    )}
                  </div>
                )}

                {/* LOADING */}
                {msg.type === 'loading' && (
                  <div style={{ 
                    background: 'transparent', padding: '12px 16px', color: 'rgba(255,255,255,0.5)', 
                    fontSize: 13, display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 
                  }}>
                    <Loader2 size={16} className="animate-spin" /> {msg.text}
                  </div>
                )}

                {/* EVALUATION RESULT */}
                {msg.type === 'evaluation_result' && (
                  <div style={{ 
                    background: msg.isCorrect ? 'rgba(52,211,153,0.1)' : 'rgba(248,113,113,0.1)', 
                    border: msg.isCorrect ? '1px solid rgba(52,211,153,0.3)' : '1px solid rgba(248,113,113,0.3)',
                    borderRadius: '16px 16px 16px 4px', padding: '16px 20px', maxWidth: '85%', marginTop: 8
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      {msg.isCorrect ? <CheckCircle2 size={18} color="#34d399" /> : <XCircle size={18} color="#f87171" />}
                      <span style={{ color: 'white', fontWeight: 700 }}>Điểm ngữ pháp: {msg.score}/100</span>
                    </div>
                    <div style={{ color: 'rgba(255,255,255,0.9)', fontSize: 14, lineHeight: 1.5 }}>
                      📝 <b>Sửa lỗi:</b> {msg.grammarFeedback || msg.text}
                    </div>

                    {/* Show Next Question button only on the last evaluation message */}
                    {idx === messages.length - 1 && (
                      <button
                        onClick={handleNext}
                        style={{
                          marginTop: 16, width: '100%',
                          background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8,
                          padding: '12px', color: 'white', fontWeight: 700, cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                          transition: 'background 0.2s'
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.25)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.15)')}
                      >
                        Câu tiếp theo <ChevronRight size={18} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* ── INPUT BAR ─────────────────────────────────────────── */}
      {appState === 'chat' && (
        <div style={{
          position: 'sticky', bottom: 0, padding: '16px 16px calc(16px + env(safe-area-inset-bottom))',
          background: 'rgba(17, 24, 39, 0.8)', backdropFilter: 'blur(20px)',
          borderTop: '1px solid rgba(255,255,255,0.1)', zIndex: 10
        }}>
          <div style={{ maxWidth: 800, margin: '0 auto', display: 'flex', gap: 12 }}>
            <button
              type="button"
              onClick={() => {
                console.log('[Kaiwa] mic button clicked', { isRecording });
                if (isRecording) {
                  stopRecording();
                } else {
                  startRecording();
                }
              }}
              style={{
                flexShrink: 0, width: 50, height: 50, borderRadius: 25, border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white',
                background: isRecording ? '#ef4444' : 'rgba(255,255,255,0.1)',
                boxShadow: isRecording ? '0 0 20px rgba(239,68,68,0.6)' : 'none',
                transition: 'all 0.2s', animation: isRecording ? 'pulse 1.5s infinite' : 'none'
              }}
            >
              {isRecording ? <MicOff size={22} /> : <Mic size={22} />}
            </button>
            <form onSubmit={handleTextSubmit} style={{ flex: 1, display: 'flex', gap: 8 }}>
              <input 
                type="text"
                value={textInput}
                onChange={e => setTextInput(e.target.value)}
                placeholder={isRecording ? 'Đang ghi âm...' : 'Nhập câu trả lời tiếng Nhật...'}
                disabled={isRecording}
                style={{
                  flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: 25, padding: '0 20px', color: 'white', fontSize: 15, outline: 'none'
                }}
              />
              <button 
                type="submit"
                disabled={!textInput.trim() || isRecording}
                style={{
                  flexShrink: 0, width: 50, height: 50, borderRadius: 25, border: 'none',
                  background: textInput.trim() ? '#667eea' : 'rgba(255,255,255,0.1)',
                  color: 'white', cursor: textInput.trim() ? 'pointer' : 'not-allowed',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s'
                }}
              >
                <Send size={20} style={{ marginLeft: 2 }} />
              </button>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.7); }
          50% { box-shadow: 0 0 0 10px rgba(239,68,68,0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function ModeButton({ active, icon, title, subtitle, onClick }: { active: boolean, icon: React.ReactNode, title: string, subtitle: string, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: active ? 'rgba(102,126,234,0.2)' : 'rgba(255,255,255,0.05)',
        border: active ? '1px solid #667eea' : '1px solid rgba(255,255,255,0.1)',
        borderRadius: 16, padding: '16px 20px', cursor: 'pointer', textAlign: 'left',
        display: 'flex', alignItems: 'center', gap: 16, transition: 'all 0.2s'
      }}
    >
      <div style={{
        width: 48, height: 48, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: active ? 'linear-gradient(135deg, #667eea, #764ba2)' : 'rgba(255,255,255,0.1)',
        color: active ? 'white' : 'rgba(255,255,255,0.5)'
      }}>
        {icon}
      </div>
      <div>
        <div style={{ color: active ? 'white' : 'rgba(255,255,255,0.8)', fontWeight: 700, fontSize: 16, marginBottom: 4 }}>
          {title}
        </div>
        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>
          {subtitle}
        </div>
      </div>
      {active && <CheckCircle2 size={24} color="#667eea" style={{ marginLeft: 'auto' }} />}
    </button>
  );
}
