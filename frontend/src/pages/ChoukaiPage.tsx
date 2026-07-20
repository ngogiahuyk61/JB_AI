import { useState, useRef } from 'react';
import { Play, Pause, Disc } from 'lucide-react';

export default function ChoukaiPage() {
  const [currentTrack, setCurrentTrack] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const tracks = Array.from({ length: 54 }, (_, i) => i + 1);

  const playTrack = (trackNum: number) => {
    if (currentTrack === trackNum) {
      if (isPlaying) {
        audioRef.current?.pause();
        setIsPlaying(false);
      } else {
        audioRef.current?.play();
        setIsPlaying(true);
      }
      return;
    }

    setCurrentTrack(trackNum);
    setIsPlaying(true);
    
    // Play new track
    setTimeout(() => {
      if (audioRef.current) {
        audioRef.current.play();
      }
    }, 50);
  };

  return (
    <div className="page-inner" style={{ paddingBottom: currentTrack ? '80px' : '20px' }}>
      <div className="card card-p">
        <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Disc style={{ color: '#4f46e5' }} /> 
          Luyện nghe Choukai (54 Bài)
        </h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>Chọn bài nghe tương ứng với sách Minna no Nihongo để luyện tập.</p>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '12px' }}>
          {tracks.map(num => {
            const isActive = currentTrack === num;
            return (
              <button
                key={num}
                onClick={() => playTrack(num)}
                style={{
                  padding: '12px 8px',
                  borderRadius: '12px',
                  border: `2px solid ${isActive ? '#4f46e5' : '#e2e8f0'}`,
                  background: isActive ? '#e0e7ff' : '#f8fafc',
                  color: isActive ? '#4338ca' : '#475569',
                  fontWeight: 700,
                  fontSize: '14px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  transition: 'all 0.2s ease',
                  boxShadow: isActive ? '0 4px 12px rgba(79, 70, 229, 0.15)' : 'none'
                }}
              >
                {isActive && isPlaying ? <Pause size={16} /> : <Play size={16} />}
                Bài {num}
              </button>
            )
          })}
        </div>
      </div>

      {currentTrack && (
        <div style={{
          position: 'fixed',
          bottom: 'var(--nav-height, 0px)', left: 0, right: 0,
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
          borderTop: '1px solid #e2e8f0',
          padding: '12px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 20,
          boxShadow: '0 -4px 20px rgba(0,0,0,0.05)',
          zIndex: 90
        }}>
          <div style={{ fontWeight: 800, color: '#1e293b', fontSize: 16 }}>Bài {currentTrack}</div>
          <audio
            ref={audioRef}
            src={`/listen/${currentTrack.toString().padStart(2, '0')} A-${currentTrack}.mp3`}
            controls
            autoPlay
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={() => setIsPlaying(false)}
            style={{ height: 40, width: '100%', maxWidth: 400 }}
          />
        </div>
      )}
    </div>
  );
}
