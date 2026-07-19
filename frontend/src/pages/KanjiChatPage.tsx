import { useState, useEffect, useRef } from 'react';
import { Leaf, Send, Volume2, Search, Loader2 } from 'lucide-react';
import { parseKanjiData, searchKanji } from '../utils/kanjiParser';
import type { KanjiEntry, KanjiVocab } from '../utils/kanjiParser';
import { speechService } from '../services/speechService';
import '../styles/kanji-chat.css';

interface Message {
  id: string;
  type: 'user' | 'bot';
  text?: string;
  kanjiResults?: KanjiEntry[];
  exactVocabMatch?: KanjiVocab; // When they search "ruộng đồng" exactly
}

export default function KanjiChatPage() {
  const [data, setData] = useState<KanjiEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      type: 'bot',
      text: 'Chào bạn! Mình là Trợ lý Kanji N5 🌿. Bạn có thể gõ tiếng Việt, tiếng Nhật, hoặc âm Hán Việt để tra cứu nhé (VD: "ruộng đồng", "田", "điền").'
    }
  ]);
  const [input, setInput] = useState('');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const res = await fetch('/kanji/kanji_N5.txt');
        const text = await res.text();
        const parsed = parseKanjiData(text);
        setData(parsed);
      } catch (err) {
        console.error('Lỗi khi tải dữ liệu Kanji:', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    
    const query = input.trim();
    setInput('');
    
    const newUserMsg: Message = {
      id: Date.now().toString(),
      type: 'user',
      text: query
    };
    
    setMessages(prev => [...prev, newUserMsg]);

    // Perform Search
    const results = searchKanji(query, data);
    
    const botMsgId = (Date.now() + 1).toString();
    
    if (results.length === 0) {
      setMessages(prev => [...prev, {
        id: botMsgId,
        type: 'bot',
        text: `Xin lỗi, mình không tìm thấy kết quả nào cho "${query}" trong bộ Kanji N5.`
      }]);
      return;
    }

    // Check for exact vocab match based on user's specific request
    // e.g. "ruộng đồng" -> 田園: ĐIỀN-VIÊN (でんえん)
    const exactMatch = results.find(r => r.type === 'vocab_match' && r.score >= 80);
    if (exactMatch && exactMatch.matchedVocab && exactMatch.matchedVocab.length > 0) {
      // Find the specific vocab that matched
      const qLower = query.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const bestVocab = exactMatch.matchedVocab.find(v => 
        v.meaning.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(qLower) || 
        v.kanji === query
      ) || exactMatch.matchedVocab[0];

      // We render a specific text string as requested, but also show the card below it for more info.
      const textResponse = `${bestVocab.kanji}: ${bestVocab.hanViet} (${bestVocab.kana}) - ${bestVocab.meaning}`;
      
      setMessages(prev => [...prev, {
        id: botMsgId,
        type: 'bot',
        text: textResponse,
        kanjiResults: [exactMatch.kanjiEntry]
      }]);
      return;
    }

    // General match (e.g. searching a Kanji directly)
    setMessages(prev => [...prev, {
      id: botMsgId,
      type: 'bot',
      text: `Tìm thấy ${results.length} kết quả cho "${query}":`,
      kanjiResults: results.slice(0, 3).map(r => r.kanjiEntry) // Show top 3 max
    }]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const playVocab = (kana: string, vn: string) => {
    speechService.cancel();
    // Play kana first, then vietnamese
    speechService.speak(kana, { lang: 'ja-JP', rate: 0.9 })
      .then(() => {
        setTimeout(() => {
          speechService.speak(vn, { lang: 'vi-VN', rate: 1.0 });
        }, 300);
      })
      .catch(() => {});
  };

  return (
    <div className="kanji-chat-layout">
      <div className="kanji-chat-header">
        <Leaf size={28} color="#16a34a" />
        <div className="kanji-chat-title">Kanji N5 Chatbot</div>
      </div>

      <div className="kanji-chat-messages">
        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '100px', color: '#16a34a' }}>
            <Loader2 className="animate-spin" size={48} />
            <p style={{ marginTop: '16px', fontWeight: 600 }}>Đang khởi tạo từ điển Kanji N5...</p>
          </div>
        ) : (
          messages.map(msg => (
            <div key={msg.id} className={`kanji-chat-bubble ${msg.type}`}>
              <div className="bubble-content">
                {msg.text && <div style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</div>}
                
                {msg.kanjiResults && msg.kanjiResults.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '12px' }}>
                    {msg.kanjiResults.map(entry => (
                      <div key={entry.kanji} className="kanji-result-card">
                        <div className="kanji-result-header">
                          <div className="kanji-main-char">{entry.kanji}</div>
                          <div className="kanji-main-info">
                            <div className="kanji-hanviet">{entry.hanViet}</div>
                            <div className="kanji-onyomi">{entry.onyomiKunyomi}</div>
                            <div className="kanji-meaning">{entry.meaning}</div>
                          </div>
                        </div>
                        
                        <div className="kanji-vocab-list">
                          {entry.vocab.map((v, idx) => (
                            <div key={idx} className="kanji-vocab-item">
                              <div className="vocab-left">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span className="vocab-kanji">{v.kanji}</span>
                                  {v.hanViet && <span className="vocab-hanviet">[{v.hanViet}]</span>}
                                </div>
                                <span className="vocab-reading">{v.kana}</span>
                              </div>
                              
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <span className="vocab-meaning">{v.meaning}</span>
                                <button 
                                  className="play-btn"
                                  onClick={() => playVocab(v.kana, v.meaning)}
                                  title="Nghe phát âm"
                                >
                                  <Volume2 size={20} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="kanji-chat-input-area">
        <div className="kanji-input-wrapper">
          <Search color="#9ca3af" size={24} style={{ margin: 'auto 0 auto 12px' }} />
          <input
            type="text"
            className="kanji-chat-input"
            placeholder="Tra cứu Kanji, Hán Việt, Kana, hoặc nghĩa tiếng Việt..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            autoFocus
          />
          <button 
            className="kanji-chat-send"
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
