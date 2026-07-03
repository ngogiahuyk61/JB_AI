import React, { useState, useEffect, useRef } from 'react';
import { BrainCircuit, X, Mic, MicOff, Send, Loader2, Volume2 } from 'lucide-react';
import type { ChatMessage } from '../../types';
import { geminiService, type ChatHistory } from '../../services/geminiService';
import { speechService, SpeechRecognizer } from '../../services/speechService';

const WELCOME_MSG: ChatMessage = {
  id: 'welcome',
  role: 'ai',
  text: 'こんにちは！🎌 Tôi là Sensei AI, giáo viên tiếng Nhật của bạn!\n\nBạn có thể:\n• Nhập text để luyện ngữ pháp\n• Dùng 🎤 Mic để luyện phát âm (Chrome)\n• Hỏi về từ vựng, ngữ pháp bất kỳ\n\nBắt đầu thôi nào! Hôm nay bạn muốn học gì? 😊',
  timestamp: new Date(),
};

interface FloatingChatProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function FloatingChat({ isOpen, onClose }: FloatingChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MSG]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [history, setHistory] = useState<ChatHistory[]>([]);
  const endRef = useRef<HTMLDivElement>(null);
  const recognizerRef = useRef<SpeechRecognizer | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    recognizerRef.current = new SpeechRecognizer('ja-JP');
  }, []);

  useEffect(() => {
    if (isOpen) {
      endRef.current?.scrollIntoView({ behavior: 'smooth' });
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [messages, isOpen, isThinking]);

  const addMessage = (role: 'user' | 'ai', text: string) => {
    const msg: ChatMessage = { id: Date.now().toString(), role, text, timestamp: new Date() };
    setMessages(prev => [...prev, msg]);
    return msg;
  };

  const handleSend = async (textOverride?: string) => {
    const text = (textOverride ?? input).trim();
    if (!text || isThinking) return;
    setInput('');

    addMessage('user', text);
    setIsThinking(true);

    // Add to history
    const newHistory: ChatHistory[] = [...history, { role: 'user', text }];

    try {
      let reply: string;
      if (geminiService.isAvailable()) {
        reply = await geminiService.sendChatMessage(text, history);
      } else {
        await new Promise(r => setTimeout(r, 800));
        reply = getMockReply(text);
      }

      addMessage('ai', reply);
      setHistory([...newHistory, { role: 'model', text: reply }]);

      // TTS: đọc response
      const hasJa = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(reply);
      if (hasJa) {
        speechService.speakJapanese(reply.slice(0, 200));
      } else {
        speechService.speakVietnamese(reply.slice(0, 200));
      }
    } catch {
      addMessage('ai', '😅 Xin lỗi, có lỗi xảy ra. Vui lòng thử lại!');
    } finally {
      setIsThinking(false);
    }
  };

  const toggleMic = async () => {
    if (!recognizerRef.current?.available) {
      alert('Trình duyệt không hỗ trợ nhận diện giọng nói. Hãy dùng Chrome!');
      return;
    }
    if (isListening) {
      recognizerRef.current.stop();
      setIsListening(false);
      return;
    }
    setIsListening(true);
    try {
      const transcript = await recognizerRef.current.listen();
      setIsListening(false);
      await handleSend(transcript);
    } catch {
      setIsListening(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="chat-overlay">
      {/* Header */}
      <div className="chat-header">
        <div style={{ width: 36, height: 36, background: 'rgba(99,102,241,.3)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <BrainCircuit size={18} style={{ color: '#c7d2fe' }} />
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontWeight: 800, fontSize: 14 }}>Sensei AI 🎌</p>
          <p style={{ fontSize: 11, opacity: .7, display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 6, height: 6, background: '#4ade80', borderRadius: '50%', display: 'inline-block', animation: 'pulse 2s ease infinite' }} />
            {geminiService.isAvailable() ? 'Gemini 1.5 Flash · Free' : 'Chế độ Demo'}
          </p>
        </div>
        <button onClick={onClose} style={{ background: 'rgba(255,255,255,.1)', border: 'none', color: 'white', width: 32, height: 32, borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <X size={16} />
        </button>
      </div>

      {/* Messages */}
      <div className="chat-messages">
        {messages.map(msg => (
          <div key={msg.id} className={`msg ${msg.role}`}>
            {msg.role === 'ai' && (
              <div style={{ width: 24, height: 24, background: 'linear-gradient(135deg,#4f46e5,#06b6d4)', borderRadius: '50%', marginBottom: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <BrainCircuit size={12} style={{ color: 'white' }} />
              </div>
            )}
            <div className="msg-bubble" style={{ whiteSpace: 'pre-wrap' }}>
              {msg.text}
            </div>
            {msg.role === 'ai' && msg.id !== 'welcome' && (
              <button onClick={() => {
                const hasJa = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(msg.text);
                hasJa ? speechService.speakJapanese(msg.text) : speechService.speakVietnamese(msg.text);
              }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, padding: '2px 4px' }}>
                <Volume2 size={12} /> Nghe lại
              </button>
            )}
          </div>
        ))}

        {isThinking && (
          <div className="msg ai">
            <div className="msg-bubble" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Loader2 size={14} className="animate-spin" style={{ color: 'var(--primary)' }} />
              <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Sensei đang soạn...</span>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Suggestion chips */}
      {messages.length === 1 && (
        <div style={{ padding: '0 12px 8px', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {['こんにちは！', 'N5 kanji là gì?', 'Tôi muốn học ngữ pháp て form', 'Sửa câu này: 私は食べるりんご'].map(s => (
            <button key={s} onClick={() => handleSend(s)}
              style={{ fontSize: 12, padding: '5px 10px', background: 'var(--primary-50)', border: '1px solid var(--primary-100)', borderRadius: 99, color: 'var(--primary)', cursor: 'pointer', fontWeight: 600 }}>
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="chat-input-row">
        <button onClick={toggleMic}
          style={{
            width: 40, height: 40, borderRadius: 10, border: 'none', cursor: 'pointer',
            background: isListening ? '#fee2e2' : 'var(--primary-50)',
            color: isListening ? 'var(--danger)' : 'var(--primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: isListening ? 'pulse 1s ease infinite' : 'none', flexShrink: 0
          }}>
          {isListening ? <MicOff size={16} /> : <Mic size={16} />}
        </button>

        <input
          ref={inputRef}
          className="chat-input"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
          placeholder={isListening ? '🎤 Đang nghe tiếng Nhật...' : 'Nhập text hoặc dùng Mic...'}
          disabled={isListening || isThinking}
        />

        <button onClick={() => handleSend()}
          disabled={!input.trim() || isThinking}
          style={{
            width: 40, height: 40, borderRadius: 10, border: 'none', cursor: 'pointer',
            background: 'var(--primary)', color: 'white',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            opacity: !input.trim() || isThinking ? 0.5 : 1, flexShrink: 0
          }}>
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}

function getMockReply(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes('こんにちは') || lower.includes('xin chào')) {
    return 'こんにちは！😊 Rất vui được gặp bạn!\nHôm nay bạn muốn luyện tập gì?\n• 📚 Từ vựng N5/N4\n• 📝 Ngữ pháp\n• 🗣️ Hội thoại';
  }
  if (lower.includes('n5') || lower.includes('kanji')) {
    return 'Kanji N5 có 103 chữ cơ bản! Một số ví dụ:\n• 日 (NHẬT) = mặt trời, ngày\n• 月 (NGUYỆT) = mặt trăng, tháng\n• 山 (SƠN) = núi\n• 川 (XUYÊN) = sông\n\nBạn muốn luyện chữ nào? 🎌';
  }
  if (lower.includes('て form') || lower.includes('te form')) {
    return 'Te-form (て形) là dạng liên kết động từ!\n\nQuy tắc:\n• Nhóm 1 (う→って): 買う→買って\n• Nhóm 2 (る→て): 食べる→食べて\n• Nhóm 3 bất quy tắc: する→して, くる→きて\n\nDùng để: nối câu, xin phép (〜てもいい), yêu cầu (〜てください)';
  }
  return `Sensei đã nghe: "${text}"\n\nRất tốt! Bạn đang tiến bộ. Hãy tiếp tục luyện tập nhé! 💪\n\n※ Cài VITE_GEMINI_API_KEY để nhận phản hồi thông minh hơn từ Gemini AI!`;
}
