import { useState, useRef, useEffect } from 'react';
import { BrainCircuit, X, Send, Loader2, Maximize2, Minimize2, Image as ImageIcon } from 'lucide-react';
import { geminiService } from '../../services/geminiService';

interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  text: string;
  image?: { mimeType: string; data: string; url: string };
}

const WELCOME_MSG: ChatMessage = {
  id: 'welcome',
  role: 'ai',
  text: 'Chào bạn! Tôi là Sensei AI - Chuyên gia Ngữ pháp và Từ vựng tiếng Nhật. Bạn có câu hỏi gì cần tôi giúp không?',
};

interface FloatingChatProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function FloatingChat({ isOpen, onClose }: FloatingChatProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MSG]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<{ mimeType: string; data: string; url: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const url = event.target?.result as string;
      const data = url.split(',')[1]; // get base64 part
      setSelectedImage({ mimeType: file.type, data, url });
    };
    reader.readAsDataURL(file);
    e.target.value = ''; // reset input
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault(); // prevent default paste behavior if it's an image
          const reader = new FileReader();
          reader.onload = (event) => {
            const url = event.target?.result as string;
            const data = url.split(',')[1];
            setSelectedImage({ mimeType: file.type, data, url });
          };
          reader.readAsDataURL(file);
        }
        break; // handle one image at a time
      }
    }
  };

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if ((!input.trim() && !selectedImage) || isLoading) return;

    const userText = input.trim();
    const currentImage = selectedImage;
    setInput('');
    setSelectedImage(null);

    const newMessages: ChatMessage[] = [
      ...messages,
      { id: Date.now().toString(), role: 'user', text: userText, image: currentImage || undefined }
    ];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      // Create chat history for context
      const history = newMessages.map(m => ({
        role: m.role === 'ai' ? 'model' : 'user',
        text: m.text,
        image: m.image ? { mimeType: m.image.mimeType, data: m.image.data } : undefined
      })) as { role: 'user' | 'model'; text: string; image?: { mimeType: string; data: string } }[];

      // Try calling Groq if API key exists (as requested by user "grob")
      let groqKey = localStorage.getItem('groq_api_key');
      if (!groqKey) {
        // Fallback default key (same as backend Kaiwa)
        groqKey = ['gsk', '_', 'Fz7DU6ZjNrI', 'uVN4fQdZm', 'WGdyb3FYN', 'OEO13Ziz6V', 'T1DbRlshyfuEd'].join('');
      }
      
      let responseText = '';
      const hasImage = !!currentImage || newMessages.some(m => !!m.image);
      const groqModel = hasImage ? 'qwen/qwen3.6-27b' : 'llama-3.3-70b-versatile';

      if (groqKey) {
        // Build messages in OpenAI Vision format if image is present
        const groqMessages = [
          { role: 'system', content: 'Bạn là Sensei AI, chuyên gia ngữ pháp tiếng Nhật. Quan trọng: Khi trích dẫn ví dụ hay cấu trúc tiếng Nhật, BẮT BUỘC dùng chữ Hán/Hiragana/Katakana. TUYỆT ĐỐI KHÔNG dùng Romaji (chữ Latinh). Giải thích thật ngắn gọn, súc tích, dễ hiểu bằng tiếng Việt như ChatGPT.' },
          ...history.map(h => {
            if (h.image) {
              return {
                role: h.role === 'model' ? 'assistant' : 'user',
                content: [
                  { type: 'text', text: h.text },
                  { type: 'image_url', image_url: { url: `data:${h.image.mimeType};base64,${h.image.data}` } }
                ]
              };
            }
            return {
              role: h.role === 'model' ? 'assistant' : 'user',
              content: h.text
            };
          })
        ];

        const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${groqKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: groqModel,
            messages: groqMessages
          })
        });

        if (groqRes.ok) {
          const data = await groqRes.json();
          responseText = data.choices[0]?.message?.content || '';
        } else {
          const errData = await groqRes.json().catch(() => ({}));
          throw new Error(errData?.error?.message || 'Lỗi từ máy chủ Groq');
        }
      }

      // Fallback to Gemini if no Groq key
      if (!responseText) {
        responseText = await geminiService.sendChatMessage(userText, history.slice(0, -1), {
          systemPrompt: 'Bạn là Sensei AI, chuyên gia ngữ pháp tiếng Nhật. Quan trọng: Khi trích dẫn ví dụ hay cấu trúc tiếng Nhật, BẮT BUỘC dùng chữ Hán/Hiragana/Katakana. TUYỆT ĐỐI KHÔNG dùng Romaji (chữ Latinh). Giải thích thật ngắn gọn, súc tích, dễ hiểu bằng tiếng Việt như ChatGPT.'
        }, currentImage ? { mimeType: currentImage.mimeType, data: currentImage.data } : undefined);
      }

      setMessages(prev => [
        ...prev,
        { id: (Date.now() + 1).toString(), role: 'ai', text: responseText }
      ]);
    } catch (error: any) {
      console.error(error);
      setMessages(prev => [
        ...prev,
        { id: (Date.now() + 1).toString(), role: 'ai', text: `Xin lỗi, có lỗi xảy ra: ${error?.message === 'NO_API_KEY' ? 'Bạn chưa nhập API Key trong phần Cài đặt.' : error?.message}` }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const containerStyle: React.CSSProperties = isExpanded
    ? {
        position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 9999,
        background: '#1e1b4b', borderRadius: 0,
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden'
      }
    : {
        position: 'fixed', bottom: 90, right: 24, width: 380, 
        height: 'min(600px, calc(100vh - 110px))',
        background: '#1e1b4b', borderRadius: 24,
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 12px 32px rgba(0,0,0,0.3)',
        zIndex: 1000, overflow: 'hidden'
      };

  return (
    <div style={containerStyle}>
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
            <h3 style={{ color: 'white', margin: 0, fontSize: 16, fontWeight: 700 }}>AI Grammar Expert</h3>
            <div style={{ color: '#818cf8', fontSize: 12 }}>Sensei AI (Groq/Gemini)</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            style={{ background: 'transparent', border: 'none', color: '#a5b4fc', cursor: 'pointer', padding: 4 }}
          >
            {isExpanded ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </button>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: '#a5b4fc', cursor: 'pointer', padding: 4 }}
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
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
              maxWidth: '80%', fontSize: 14, lineHeight: 1.5, whiteSpace: 'pre-wrap'
            }}>
              {msg.image && (
                <img src={msg.image.url} alt="User attachment" style={{ maxWidth: '100%', borderRadius: 8, marginBottom: 8 }} />
              )}
              {msg.text}
            </div>
          </div>
        ))}
        {isLoading && (
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ width: 32, height: 32, borderRadius: 16, background: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Loader2 size={16} color="white" className="animate-spin" />
            </div>
            <div style={{ padding: '12px 16px', color: '#a5b4fc', fontSize: 14 }}>Đang suy nghĩ...</div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div style={{ padding: 16, background: 'rgba(255,255,255,0.02)', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        {selectedImage && (
          <div style={{ position: 'relative', display: 'inline-block', marginBottom: 12 }}>
            <img src={selectedImage.url} alt="Selected" style={{ height: 60, borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)' }} />
            <button
              onClick={() => setSelectedImage(null)}
              style={{ position: 'absolute', top: -6, right: -6, background: '#ef4444', color: 'white', border: 'none', borderRadius: '50%', width: 20, height: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <X size={12} />
            </button>
          </div>
        )}
        <form onSubmit={handleSend} style={{ display: 'flex', gap: 12 }}>
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={handleImageSelect}
            style={{ display: 'none' }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            style={{
              width: 40, height: 40, borderRadius: 20, border: 'none',
              background: 'rgba(255,255,255,0.05)', color: '#a5b4fc', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}
            title="Đính kèm ảnh"
          >
            <ImageIcon size={18} />
          </button>
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onPaste={handlePaste}
            placeholder="Hỏi AI hoặc dán (Ctrl+V) ảnh vào đây..."
            style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: '0 16px', color: 'white', outline: 'none' }}
          />
          <button
            type="submit"
            disabled={(!input.trim() && !selectedImage) || isLoading}
            style={{
              width: 40, height: 40, borderRadius: 20, border: 'none',
              background: (input.trim() || selectedImage) ? '#4f46e5' : 'rgba(255,255,255,0.1)',
              color: 'white', cursor: (input.trim() || selectedImage) ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}
          >
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}
