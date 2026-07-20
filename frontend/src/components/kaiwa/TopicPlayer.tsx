import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Play, Pause, RefreshCw, Volume2, Languages, Type } from 'lucide-react';
import { speechService } from '../../services/speechService';
import type { KaiwaTopic, TopicProhibition } from '../../data/kaiwaTopics';

// ── Prohibition Card (interactive, tap to reveal grammar) ────────────────
function ProhibitionCard({ prohibition }: { prohibition: TopicProhibition }) {
  const [revealed, setRevealed] = useState(false);
  return (
    <button
      onClick={() => setRevealed(r => !r)}
      style={{
        background: revealed ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.07)',
        border: `1px solid ${revealed ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.12)'}`,
        borderRadius: 14,
        padding: revealed ? '14px 16px' : '12px 16px',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'all 0.3s ease',
        minWidth: 130,
        flex: '1 1 130px',
        maxWidth: 240,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 22 }}>{prohibition.icon}</span>
        <div>
          <div style={{ color: revealed ? '#fca5a5' : '#f87171', fontWeight: 800, fontSize: 14 }}>
            {prohibition.japanese}
          </div>
          {!revealed && (
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 2 }}>Bấm để xem câu cấm</div>
          )}
        </div>
      </div>
      {revealed && (
        <div style={{ marginTop: 10, borderTop: '1px dashed rgba(255,255,255,0.1)', paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ color: 'white', fontWeight: 700, fontSize: 14, lineHeight: 1.4 }}>
            {prohibition.sentence}
          </div>
          <div style={{ color: '#94a3b8', fontSize: 12, fontStyle: 'italic' }}>{prohibition.romaji}</div>
          <div style={{ color: '#fde68a', fontSize: 13, fontWeight: 600, marginTop: 2 }}>→ {prohibition.vietnamese}</div>
        </div>
      )}
    </button>
  );
}

interface TopicPlayerProps {
  topic: KaiwaTopic;
  onBack: () => void;
}

export default function TopicPlayer({ topic, onBack }: TopicPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState<number>(-1);
  const [showRomaji, setShowRomaji] = useState<Set<number>>(new Set());
  const [showMeaning, setShowMeaning] = useState<Set<number>>(new Set());
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const isPlayingRef = useRef(false);
  const abortCtrlRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Scroll to the active line
    if (currentIndex >= 0 && scrollRef.current) {
      const activeElement = scrollRef.current.querySelector(`[data-index="${currentIndex}"]`);
      if (activeElement) {
        activeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [currentIndex]);

  // Clean up speech when unmounting or going back
  useEffect(() => {
    return () => {
      speechService.cancel();
      isPlayingRef.current = false;
      if (abortCtrlRef.current) {
        abortCtrlRef.current.abort();
      }
    };
  }, []);

  const toggleRomaji = (index: number) => {
    setShowRomaji(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const toggleMeaning = (index: number) => {
    setShowMeaning(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const playTopic = async () => {
    if (isPlaying) return;
    
    setIsPlaying(true);
    isPlayingRef.current = true;
    
    const abortCtrl = new AbortController();
    abortCtrlRef.current = abortCtrl;

    const startIdx = currentIndex >= 0 && currentIndex < topic.dialogues.length - 1 ? currentIndex + 1 : 0;
    
    await speechService.unlockAudio(); // Important for Android

    for (let i = startIdx; i < topic.dialogues.length; i++) {
      if (!isPlayingRef.current || abortCtrl.signal.aborted) break;
      
      setCurrentIndex(i);
      
      const dialogue = topic.dialogues[i];
      // Clean up brackets for TTS
      const cleanText = dialogue.japanese.replace(/[「」\[\]]/g, '');
      
      try {
        await speechService.speak(cleanText, { lang: 'ja-JP', rate: 0.85 });
      } catch (e) {
        console.error('Speech error', e);
      }
      
      // Add a small pause between dialogues
      await new Promise(res => setTimeout(res, 500));
    }
    
    setIsPlaying(false);
    isPlayingRef.current = false;
    
    if (!abortCtrl.signal.aborted) {
      // Reached the end naturally
      setCurrentIndex(-1);
    }
  };

  const pauseTopic = () => {
    speechService.cancel();
    setIsPlaying(false);
    isPlayingRef.current = false;
    if (abortCtrlRef.current) {
      abortCtrlRef.current.abort();
    }
  };

  const restartTopic = () => {
    pauseTopic();
    setCurrentIndex(-1);
    setTimeout(() => {
      playTopic();
    }, 100);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#0f172a' }}>
      {/* Header */}
      <div style={{
        background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(255,255,255,0.1)', padding: '12px 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={onBack} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', padding: 4 }}>
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 style={{ color: 'white', fontSize: 16, fontWeight: 700, margin: 0 }}>{topic.title}</h1>
          </div>
        </div>
      </div>

      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '20px 16px', maxWidth: 800, margin: '0 auto', width: '100%' }}>
        
        {/* Context & Image */}
        <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 16, overflow: 'hidden', marginBottom: 24, border: '1px solid rgba(255,255,255,0.1)' }}>
          <img src={topic.image} alt={topic.title} style={{ width: '100%', height: 200, objectFit: 'cover' }} />
          <div style={{ padding: 16 }}>
            <h3 style={{ color: '#a5b4fc', fontSize: 13, textTransform: 'uppercase', fontWeight: 800, margin: '0 0 8px 0' }}>Bối cảnh</h3>
            <p style={{ color: 'white', fontSize: 15, lineHeight: 1.5, margin: 0 }}>
              {topic.context}
            </p>
          </div>
        </div>

        {/* Prohibition Cards */}
        {topic.prohibitions && topic.prohibitions.length > 0 && (
          <div style={{ marginBottom: 28 }}>
            <h3 style={{ color: '#fbbf24', fontSize: 13, textTransform: 'uppercase', fontWeight: 800, margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>🚫</span> Nội quy — Bấm để xem nghĩa
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {topic.prohibitions.map((p, i) => (
                <ProhibitionCard key={i} prohibition={p} />
              ))}
            </div>
            <div style={{ marginTop: 10, padding: '10px 14px', background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 10, color: '#fde68a', fontSize: 13, lineHeight: 1.5 }}>
              <strong>📚 Cấu trúc ngữ pháp:</strong> 「～て<span style={{ color: '#fbbf24' }}>はいけません</span>」= Không được phép làm gì
            </div>
          </div>
        )}


        {/* Dialogues */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: 100 }}>
          {topic.dialogues.map((dlg, idx) => {
            const isActive = currentIndex === idx;
            const isStudent = dlg.speaker === 'S';
            
            return (
              <div key={idx} data-index={idx} style={{ 
                display: 'flex', 
                flexDirection: 'column',
                alignItems: isStudent ? 'flex-end' : 'flex-start',
                opacity: (currentIndex !== -1 && !isActive) ? 0.6 : 1,
                transition: 'all 0.3s ease'
              }}>
                <div style={{ 
                  background: isActive ? (isStudent ? '#4f46e5' : '#10b981') : (isStudent ? 'rgba(102,126,234,0.2)' : 'rgba(255,255,255,0.1)'),
                  border: isActive ? 'none' : '1px solid rgba(255,255,255,0.1)',
                  borderRadius: isStudent ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  padding: '16px 20px', 
                  maxWidth: '85%',
                  boxShadow: isActive ? '0 4px 20px rgba(0,0,0,0.3)' : 'none',
                  transform: isActive ? 'scale(1.02)' : 'scale(1)'
                }}>
                  <div style={{ color: isActive ? 'rgba(255,255,255,0.8)' : (isStudent ? '#a5b4fc' : '#a7f3d0'), fontSize: 11, fontWeight: 700, marginBottom: 8 }}>
                    {isStudent ? '🧑 HỌC SINH (S)' : '👩‍🏫 GIÁO VIÊN (T)'}
                  </div>
                  
                  <div style={{ color: 'white', fontSize: 18, fontWeight: 600, lineHeight: 1.5 }}>
                    {dlg.japanese}
                  </div>

                  {/* Toggles Display */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 12 }}>
                    {showRomaji.has(idx) && (
                      <div style={{ color: isActive ? 'rgba(255,255,255,0.9)' : '#cbd5e1', fontSize: 14, fontStyle: 'italic' }}>
                        {dlg.romaji}
                      </div>
                    )}
                    {showMeaning.has(idx) && (
                      <div style={{ color: isActive ? 'rgba(255,255,255,0.9)' : '#94a3b8', fontSize: 14, borderTop: '1px dashed rgba(255,255,255,0.2)', paddingTop: 6 }}>
                        {dlg.vietnamese}
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                    <button
                      onClick={() => toggleRomaji(idx)}
                      style={{
                        background: showRomaji.has(idx) ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)', 
                        border: 'none', borderRadius: 8, padding: '4px 10px', cursor: 'pointer', 
                        color: 'white', fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 600
                      }}
                    >
                      <Type size={12} /> {showRomaji.has(idx) ? 'Ẩn Romaji' : 'Romaji'}
                    </button>
                    <button
                      onClick={() => toggleMeaning(idx)}
                      style={{
                        background: showMeaning.has(idx) ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)', 
                        border: 'none', borderRadius: 8, padding: '4px 10px', cursor: 'pointer', 
                        color: 'white', fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 600
                      }}
                    >
                      <Languages size={12} /> {showMeaning.has(idx) ? 'Ẩn Dịch' : 'Dịch nghĩa'}
                    </button>
                    <button
                      onClick={() => speechService.speakJapanese(dlg.japanese.replace(/[「」\[\]]/g, ''))}
                      style={{
                        background: 'rgba(0,0,0,0.2)', 
                        border: 'none', borderRadius: 8, padding: '4px 10px', cursor: 'pointer', 
                        color: 'white', fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 600,
                        marginLeft: 'auto'
                      }}
                    >
                      <Volume2 size={12} /> Nghe
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Play Controls */}
      <div style={{
        position: 'sticky', bottom: 0, padding: '16px',
        background: 'rgba(17, 24, 39, 0.9)', backdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(255,255,255,0.1)', zIndex: 10,
        display: 'flex', justifyContent: 'center', gap: 16
      }}>
        <button
          onClick={restartTopic}
          style={{
            width: 48, height: 48, borderRadius: 24, border: 'none',
            background: 'rgba(255,255,255,0.1)', color: 'white', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}
          title="Nghe lại từ đầu"
        >
          <RefreshCw size={20} />
        </button>
        
        <button
          onClick={isPlaying ? pauseTopic : playTopic}
          style={{
            width: 64, height: 64, borderRadius: 32, border: 'none',
            background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 20px rgba(16, 185, 129, 0.4)'
          }}
        >
          {isPlaying ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" style={{ marginLeft: 4 }} />}
        </button>
      </div>
    </div>
  );
}
