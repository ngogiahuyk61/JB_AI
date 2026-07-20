import { useState, useRef } from 'react';
import { Play, Pause, Disc, ChevronDown, ChevronRight, Headphones } from 'lucide-react';

interface ChoukaiLesson {
  lessonNum: number;
  title: string;
  tracks: number[];
}

const n5Lessons: ChoukaiLesson[] = [
  { lessonNum: 1, title: 'Bài 1', tracks: [1, 2, 3, 4, 5, 6] },
  { lessonNum: 2, title: 'Bài 2', tracks: [7, 8, 9, 10] },
  { lessonNum: 3, title: 'Bài 3', tracks: [11, 12] },
  { lessonNum: 4, title: 'Bài 4', tracks: [13, 14] },
  { lessonNum: 5, title: 'Bài 5', tracks: [15, 16] },
  { lessonNum: 6, title: 'Bài 6', tracks: [17, 18] },
  { lessonNum: 7, title: 'Bài 7', tracks: [19, 20] },
  { lessonNum: 8, title: 'Bài 8', tracks: [21, 22] },
  { lessonNum: 9, title: 'Bài 9', tracks: [23, 24] },
  { lessonNum: 10, title: 'Bài 10', tracks: [25, 26] },
  { lessonNum: 11, title: 'Bài 11', tracks: [27, 28] },
  { lessonNum: 12, title: 'Bài 12', tracks: [29, 30] },
  { lessonNum: 13, title: 'Bài 13', tracks: [31, 32] },
  { lessonNum: 14, title: 'Bài 14', tracks: [33, 34] },
  { lessonNum: 15, title: 'Bài 15', tracks: [35, 36] },
  { lessonNum: 16, title: 'Bài 16', tracks: [37, 38] },
  { lessonNum: 17, title: 'Bài 17', tracks: [39, 40] },
  { lessonNum: 18, title: 'Bài 18', tracks: [41, 42] },
  { lessonNum: 19, title: 'Bài 19', tracks: [43, 44] },
  { lessonNum: 20, title: 'Bài 20', tracks: [45, 46] },
  { lessonNum: 21, title: 'Bài 21', tracks: [47, 48] },
  { lessonNum: 22, title: 'Bài 22', tracks: [49, 50] },
  { lessonNum: 23, title: 'Bài 23', tracks: [51, 52] },
  { lessonNum: 24, title: 'Bài 24', tracks: [53] },
  { lessonNum: 25, title: 'Bài 25', tracks: [54] },
];

export default function ChoukaiPage() {
  const [activeLevel, setActiveLevel] = useState<string>('N5');
  const [expandedLesson, setExpandedLesson] = useState<number | null>(1);
  const [currentTrack, setCurrentTrack] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const levels = ['N5', 'N4', 'N3', 'N2', 'N1'];

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

  const handleEnded = () => {
    // Optionally auto-play next track if we know what lesson we are in
    setIsPlaying(false);
  };

  const toggleLesson = (lessonNum: number) => {
    if (expandedLesson === lessonNum) {
      setExpandedLesson(null);
    } else {
      setExpandedLesson(lessonNum);
    }
  };

  return (
    <div className="page-inner" style={{ paddingBottom: currentTrack ? '100px' : '40px', maxWidth: 800, margin: '0 auto' }}>
      
      {/* Levels Header */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, overflowX: 'auto', paddingBottom: 8, whiteSpace: 'nowrap', msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
        {levels.map(level => (
          <button
            key={level}
            onClick={() => setActiveLevel(level)}
            style={{
              padding: '10px 24px',
              borderRadius: '99px',
              border: 'none',
              background: activeLevel === level ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : '#f1f5f9',
              color: activeLevel === level ? 'white' : '#475569',
              fontWeight: 800,
              fontSize: '15px',
              cursor: 'pointer',
              boxShadow: activeLevel === level ? '0 4px 12px rgba(79, 70, 229, 0.3)' : 'none',
              transition: 'all 0.2s ease',
              flex: '0 0 auto'
            }}
          >
            {level}
          </button>
        ))}
      </div>

      <div className="card card-p">
        <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Headphones style={{ color: '#4f46e5' }} /> 
          Luyện nghe Choukai - {activeLevel}
        </h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>
          {activeLevel === 'N5' 
            ? 'Các bài nghe Choukai tương ứng với giáo trình Minna no Nihongo N5 (Bài 1 - 25).'
            : `Dữ liệu luyện nghe ${activeLevel} đang được cập nhật.`}
        </p>

        {activeLevel === 'N5' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {n5Lessons.map((lesson) => {
              const isExpanded = expandedLesson === lesson.lessonNum;
              // Check if the current playing track is in this lesson
              const isPlayingInLesson = currentTrack !== null && lesson.tracks.includes(currentTrack);

              return (
                <div key={lesson.lessonNum} style={{
                  border: isExpanded ? '2px solid #6366f1' : '1px solid #e2e8f0',
                  borderRadius: 16,
                  overflow: 'hidden',
                  background: isExpanded ? '#f8fafc' : 'white',
                  transition: 'all 0.3s ease'
                }}>
                  {/* Accordion Header */}
                  <button
                    onClick={() => toggleLesson(lesson.lessonNum)}
                    style={{
                      width: '100%',
                      padding: '16px 20px',
                      background: 'transparent',
                      border: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ 
                        width: 40, height: 40, 
                        borderRadius: '50%', 
                        background: isPlayingInLesson ? '#e0e7ff' : '#f1f5f9',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: isPlayingInLesson ? '#4f46e5' : '#64748b'
                      }}>
                        {isPlayingInLesson && isPlaying ? <Disc size={20} className="animate-spin" /> : <Disc size={20} />}
                      </div>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 16, color: isPlayingInLesson ? '#4f46e5' : '#1e293b' }}>
                          {lesson.title}
                        </div>
                        <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
                          {lesson.tracks.length} file nghe
                        </div>
                      </div>
                    </div>
                    <div>
                      {isExpanded ? <ChevronDown size={20} color="#64748b" /> : <ChevronRight size={20} color="#64748b" />}
                    </div>
                  </button>

                  {/* Accordion Content */}
                  {isExpanded && (
                    <div style={{ padding: '0 20px 20px 20px' }}>
                      <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', 
                        gap: 12,
                        marginTop: 8
                      }}>
                        {lesson.tracks.map(trackNum => {
                          const isActive = currentTrack === trackNum;
                          const trackName = `A-${trackNum}`;
                          return (
                            <button
                              key={trackNum}
                              onClick={() => playTrack(trackNum)}
                              style={{
                                padding: '12px',
                                borderRadius: '12px',
                                border: `2px solid ${isActive ? '#4f46e5' : '#e2e8f0'}`,
                                background: isActive ? '#4f46e5' : 'white',
                                color: isActive ? 'white' : '#475569',
                                fontWeight: 700,
                                fontSize: '14px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                transition: 'all 0.2s ease',
                                boxShadow: isActive ? '0 4px 12px rgba(79, 70, 229, 0.25)' : 'none'
                              }}
                            >
                              {isActive && isPlaying ? <Pause size={16} /> : <Play size={16} />}
                              {trackName}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {activeLevel !== 'N5' && (
          <div style={{ textAlign: 'center', padding: '40px 20px', background: '#f8fafc', borderRadius: 16 }}>
            <Headphones size={48} color="#cbd5e1" style={{ margin: '0 auto 16px' }} />
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#475569', marginBottom: 8 }}>Chưa có dữ liệu</h3>
            <p style={{ color: '#64748b' }}>Phần luyện nghe cho {activeLevel} sẽ được cập nhật trong tương lai.</p>
          </div>
        )}
      </div>

      {currentTrack && (
        <div style={{
          position: 'fixed',
          bottom: 'var(--nav-height, 0px)', left: 0, right: 0,
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
          borderTop: '1px solid #e2e8f0',
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          boxShadow: '0 -4px 20px rgba(0,0,0,0.08)',
          zIndex: 90
        }}>
          <div style={{ fontWeight: 800, color: '#4f46e5', fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            {isPlaying && <Disc size={18} className="animate-spin" />}
            Đang phát: Track A-{currentTrack}
          </div>
          <audio
            ref={audioRef}
            src={`/listen/${currentTrack.toString().padStart(2, '0')} A-${currentTrack}.mp3`}
            controls
            autoPlay
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={handleEnded}
            style={{ height: 40, width: '100%', maxWidth: 500 }}
          />
        </div>
      )}
    </div>
  );
}
