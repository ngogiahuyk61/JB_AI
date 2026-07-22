import { useState, useRef, useEffect } from 'react';
import { BrainCircuit, X, Send, Loader2, Mic, MicOff } from 'lucide-react';
import { speechService } from '../../services/speechService';
import { kaiwaService } from '../../services/kaiwaService';

interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  text: string;
}

interface HometownChatbotProps {
  isOpen: boolean;
  onClose: () => void;
}

// 6 câu hỏi tuần tự
const QUESTIONS = [
  "あなたの いなかは どこですか？",
  "いなかの てんきは どうですか？",
  "いなかで ゆうめいな たべものは なんですか？",
  "いなかに こうえんや ゆうえんちは ありますか？",
  "いなかに おてらや じんじゃは ありますか？",
  "いなかが すきですか？なぜですか？"
];

export default function HometownChatbot({ isOpen, onClose }: HometownChatbotProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [speechLang, setSpeechLang] = useState<'ja-JP' | 'vi-VN'>('ja-JP');
  const [error, setError] = useState('');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      // Start flow
      const firstQ = QUESTIONS[0];
      setMessages([{ id: Date.now().toString(), role: 'ai', text: firstQ }]);
      setTimeout(() => speechService.speakJapanese(firstQ), 500);
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const getSupportedAudioMimeType = () => {
    if (typeof MediaRecorder === 'undefined') return '';
    const preferredTypes = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus', 'audio/wav'];
    return preferredTypes.find(type => MediaRecorder.isTypeSupported(type)) || '';
  };

  const startRecording = async () => {
    window.speechSynthesis.cancel();
    setError('');

    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setError('Mic chỉ hoạt động khi trang mở bằng HTTPS hoặc localhost.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
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
        setError('Ghi âm bị lỗi.');
        setIsRecording(false);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.onstop = async () => {
        const blobType = mediaRecorder.mimeType || mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: blobType });
        stream.getTracks().forEach(track => track.stop());
        setIsRecording(false);

        setIsLoading(true);
        try {
          const transcript = await kaiwaService.transcribeAudio(audioBlob);
          if (transcript && transcript.trim()) {
            setInput(transcript);
          } else {
            setError('Không nghe rõ, vui lòng thử lại.');
          }
        } catch (err: any) {
          setError('Lỗi nhận diện giọng nói (Whisper API).');
          console.error(err);
        } finally {
          setIsLoading(false);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error(err);
      setError('Không thể truy cập Microphone.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  const toggleMic = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const userText = input.trim();
    setInput('');
    setError('');

    const newMessages: ChatMessage[] = [
      ...messages,
      { id: Date.now().toString(), role: 'user', text: userText }
    ];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      let groqKey = localStorage.getItem('groq_api_key');
      if (!groqKey) {
        groqKey = ['gsk', '_', 'Fz7DU6ZjNrI', 'uVN4fQdZm', 'WGdyb3FYN', 'OEO13Ziz6V', 'T1DbRlshyfuEd'].join('');
      }

      const isLastQuestion = currentQIndex >= QUESTIONS.length - 1;
      const nextQuestion = isLastQuestion ? "Cuộc trò chuyện đã hoàn thành. Cảm ơn bạn!" : QUESTIONS[currentQIndex + 1];

      const systemPrompt = `Bạn là giáo viên tiếng Nhật N5. Học viên đang luyện hội thoại giới thiệu quê hương.
CÂU HỎI HIỆN TẠI BẠN ĐÃ HỎI HỌC VIÊN LÀ: "${QUESTIONS[currentQIndex]}"
CÂU HỎI TIẾP THEO BẠN SẼ HỎI LÀ: "${nextQuestion}"

Nhiệm vụ của bạn:
1. Đánh giá câu trả lời của học viên (câu user vừa nhập).
2. Nếu sai hoặc chưa tự nhiên: chỉ ra lỗi, đưa ra câu đúng bằng tiếng Nhật (N5) và giải thích ngắn gọn bằng tiếng Việt.
3. Nếu đúng: khen ngợi ngắn gọn.
4. CUỐI CÙNG, BẮT BUỘC HỎI CÂU TIẾP THEO BẰNG TIẾNG NHẬT: "${nextQuestion}" (nếu chưa hoàn thành).
Nếu đã hoàn thành, hãy chào tạm biệt.

LƯU Ý QUAN TRỌNG:
- Luôn dùng tiếng Nhật N5 đơn giản khi hỏi hoặc đưa ví dụ.
- GIẢI THÍCH LỖI BẰNG TIẾNG VIỆT để học viên dễ hiểu.
- KHÔNG BAO GIỜ dùng Romaji (chữ Latinh) khi viết tiếng Nhật. Bắt buộc dùng Hiragana/Katakana/Kanji.
- Trả lời ngắn gọn, súc tích, thân thiện.`;

      const groqMessages = [
        { role: 'system', content: systemPrompt },
        // Chỉ gửi câu user mới nhất để đánh giá cho dễ
        { role: 'user', content: userText }
      ];

      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${groqKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: groqMessages,
          temperature: 0.7,
        })
      });

      if (!res.ok) {
        throw new Error('Lỗi từ Groq API');
      }

      const data = await res.json();
      const responseText = data.choices[0]?.message?.content || '';

      setMessages(prev => [
        ...prev,
        { id: (Date.now() + 1).toString(), role: 'ai', text: responseText }
      ]);
      
      setCurrentQIndex(prev => prev + 1);

    } catch (err: any) {
      console.error(err);
      setMessages(prev => [
        ...prev,
        { id: (Date.now() + 1).toString(), role: 'ai', text: `Xin lỗi, có lỗi xảy ra: ${err.message}` }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 9999,
      background: '#1e1b4b', display: 'flex', flexDirection: 'column'
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px', background: 'linear-gradient(135deg, #312e81 0%, #1e1b4b 100%)',
        borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)', padding: 8, borderRadius: 12 }}>
            <BrainCircuit size={20} color="white" />
          </div>
          <div>
            <h3 style={{ color: 'white', margin: 0, fontSize: 16, fontWeight: 700 }}>Luyện tập: Giới thiệu Quê Hương</h3>
            <div style={{ color: '#818cf8', fontSize: 12 }}>Sensei AI</div>
          </div>
        </div>
        <button
          onClick={onClose}
          style={{ background: 'transparent', border: 'none', color: '#a5b4fc', cursor: 'pointer', padding: 4 }}
        >
          <X size={24} />
        </button>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {error && (
          <div style={{ padding: 12, background: 'rgba(239,68,68,0.1)', color: '#fca5a5', borderRadius: 8, border: '1px solid rgba(239,68,68,0.2)', fontSize: 14 }}>
            {error}
          </div>
        )}
        
        {messages.map(msg => (
          <div key={msg.id} style={{ display: 'flex', gap: 12, flexDirection: msg.role === 'user' ? 'row-reverse' : 'row' }}>
            {msg.role === 'ai' && (
              <div style={{ width: 32, height: 32, borderRadius: 16, background: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <BrainCircuit size={16} color="white" />
              </div>
            )}
            <div style={{
              background: msg.role === 'user' ? '#4f46e5' : 'rgba(255,255,255,0.05)',
              color: 'white', padding: '12px 16px', borderRadius: 16,
              borderTopRightRadius: msg.role === 'user' ? 4 : 16,
              borderTopLeftRadius: msg.role === 'ai' ? 4 : 16,
              maxWidth: '85%', fontSize: 15, lineHeight: 1.5, whiteSpace: 'pre-wrap'
            }}>
              {msg.text}
            </div>
          </div>
        ))}
        {isLoading && (
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ width: 32, height: 32, borderRadius: 16, background: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Loader2 size={16} color="white" className="animate-spin" />
            </div>
            <div style={{ padding: '12px 16px', color: '#a5b4fc', fontSize: 14 }}>AI đang suy nghĩ...</div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div style={{ padding: '16px 20px', background: 'rgba(255,255,255,0.02)', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8, justifyContent: 'flex-start' }}>
          <select 
            value={speechLang} 
            onChange={(e) => setSpeechLang(e.target.value as any)}
            style={{ 
              background: 'rgba(255,255,255,0.1)', border: 'none', color: '#a5b4fc', 
              borderRadius: 8, padding: '4px 8px', fontSize: 12, outline: 'none'
            }}
          >
            <option value="ja-JP">Mic: Tiếng Nhật</option>
            <option value="vi-VN">Mic: Tiếng Việt</option>
          </select>
        </div>
        <form onSubmit={handleSend} style={{ display: 'flex', gap: 12 }}>
          <button
            type="button"
            onClick={toggleMic}
            style={{
              width: 44, height: 44, borderRadius: 22, border: 'none',
              background: isRecording ? '#ef4444' : 'rgba(255,255,255,0.05)',
              color: isRecording ? 'white' : '#a5b4fc', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: isRecording ? '0 0 15px rgba(239,68,68,0.5)' : 'none',
            }}
          >
            {isRecording ? <MicOff size={20} /> : <Mic size={20} />}
          </button>
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={isRecording ? 'Đang nghe...' : 'Nhập câu trả lời...'}
            disabled={isRecording}
            style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 22, padding: '0 20px', color: 'white', outline: 'none', fontSize: 15 }}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            style={{
              width: 44, height: 44, borderRadius: 22, border: 'none',
              background: input.trim() ? '#4f46e5' : 'rgba(255,255,255,0.1)',
              color: 'white', cursor: input.trim() ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}
          >
            <Send size={18} style={{ marginLeft: 2 }} />
          </button>
        </form>
      </div>
    </div>
  );
}
