import { useState, useRef } from 'react';
import { Play, Pause, Disc, ChevronDown, ChevronRight, Headphones } from 'lucide-react';
import '../styles/choukai.css';

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
    <div className={`page-inner choukai-page ${currentTrack ? 'has-player' : ''}`}>
      
      {/* Levels Header */}
      <div className="choukai-levels-wrapper">
        {levels.map(level => (
          <button
            key={level}
            onClick={() => setActiveLevel(level)}
            className={`choukai-level-btn ${activeLevel === level ? 'active' : ''}`}
          >
            {level}
          </button>
        ))}
      </div>

      <div className="card card-p">
        <h2 className="choukai-header">
          <Headphones style={{ color: '#4f46e5' }} /> 
          Luyện nghe Choukai - {activeLevel}
        </h2>
        <p className="choukai-subtitle">
          {activeLevel === 'N5' 
            ? 'Các bài nghe Choukai tương ứng với giáo trình Minna no Nihongo N5 (Bài 1 - 25).'
            : `Dữ liệu luyện nghe ${activeLevel} đang được cập nhật.`}
        </p>

        {activeLevel === 'N5' && (
          <div className="choukai-lessons-list">
            {n5Lessons.map((lesson) => {
              const isExpanded = expandedLesson === lesson.lessonNum;
              const isPlayingInLesson = currentTrack !== null && lesson.tracks.includes(currentTrack);

              return (
                <div key={lesson.lessonNum} className={`choukai-lesson-card ${isExpanded ? 'expanded' : ''}`}>
                  {/* Accordion Header */}
                  <button
                    onClick={() => toggleLesson(lesson.lessonNum)}
                    className="choukai-lesson-header"
                  >
                    <div className="choukai-lesson-info">
                      <div className={`choukai-lesson-icon ${isPlayingInLesson ? 'playing' : ''}`}>
                        {isPlayingInLesson && isPlaying ? <Disc size={22} className="animate-spin" /> : <Disc size={22} />}
                      </div>
                      <div>
                        <div className={`choukai-lesson-title ${isPlayingInLesson ? 'playing' : ''}`}>
                          {lesson.title}
                        </div>
                        <div className="choukai-lesson-meta">
                          {lesson.tracks.length} file nghe
                        </div>
                      </div>
                    </div>
                    <div>
                      {isExpanded ? <ChevronDown size={22} color={isPlayingInLesson ? '#4f46e5' : '#64748b'} /> : <ChevronRight size={22} color="#64748b" />}
                    </div>
                  </button>

                  {/* Accordion Content */}
                  {isExpanded && (
                    <div className="choukai-tracks-grid">
                      {lesson.tracks.map(trackNum => {
                        const isActive = currentTrack === trackNum;
                        const trackName = `A-${trackNum}`;
                        return (
                          <button
                            key={trackNum}
                            onClick={() => playTrack(trackNum)}
                            className={`choukai-track-btn ${isActive ? 'active' : ''}`}
                          >
                            {isActive && isPlaying ? <Pause size={18} /> : <Play size={18} />}
                            {trackName}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {activeLevel !== 'N5' && (
          <div className="choukai-empty">
            <Headphones size={48} color="#cbd5e1" style={{ margin: '0 auto 16px' }} />
            <h3>Chưa có dữ liệu</h3>
            <p>Phần luyện nghe cho {activeLevel} sẽ được cập nhật trong tương lai.</p>
          </div>
        )}
      </div>

      {currentTrack && (
        <div className="choukai-player-bar">
          <div className="choukai-player-info">
            {isPlaying && <Disc size={20} className="animate-spin" />}
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
            className="choukai-audio-element"
          />
        </div>
      )}
    </div>
  );
}
