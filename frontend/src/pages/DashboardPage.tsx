import { BookOpen, Flame, CheckCircle, TrendingUp } from 'lucide-react';
import type { UserStats } from '../types';

const MOCK_STATS: UserStats = {
  wordsLearned: 450,
  streak: 12,
  jlptLevel: 'N4',
  progress: 65,
  totalCards: 800,
  knownCards: 450,
  learningCards: 120,
  todayStudied: 30,
  weeklyData: [15, 28, 22, 35, 30, 45, 30],
};

interface DashboardProps {
  onNavigate?: (tab: string) => void;
}

export default function DashboardPage({ onNavigate }: DashboardProps) {
  const s = MOCK_STATS;
  const days = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
  const maxVal = Math.max(...s.weeklyData);

  return (
    <div className="page-inner" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Hero Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #4f46e5 0%, #06b6d4 100%)',
        borderRadius: 24, padding: '24px', color: 'white',
        display: 'flex', flexDirection: 'column', gap: 16
      }}>
        <div>
          <p style={{ opacity: .8, fontSize: 13, marginBottom: 4 }}>Chào mừng trở lại! 👋</p>
          <h2 style={{ fontSize: 22, fontWeight: 900, marginBottom: 8, lineHeight: 1.2 }}>
            Hôm nay học thêm 30 từ nhé?
          </h2>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', opacity: .9, fontSize: 12 }}>
            <span>🔥 Streak {s.streak} ngày</span>
            <span>🎯 Mục tiêu: {s.jlptLevel}</span>
            <span>📖 {s.todayStudied} từ hôm nay</span>
          </div>
        </div>
        <div style={{
          background: 'rgba(255,255,255,.15)', backdropFilter: 'blur(10px)',
          borderRadius: 16, padding: '12px 20px', textAlign: 'center', alignSelf: 'flex-start'
        }}>
          <div style={{ fontSize: 28, fontWeight: 900 }}>{s.progress}%</div>
          <div style={{ fontSize: 11, opacity: .8 }}>Tiến độ {s.jlptLevel}</div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
        <StatCard icon={<BookOpen size={20} />} iconBg="#ede9fe" iconColor="#7c3aed"
          label="Từ đã học" value={s.wordsLearned.toLocaleString()} />
        <StatCard icon={<Flame size={20} />} iconBg="#fff7ed" iconColor="#ea580c"
          label="Streak" value={`${s.streak} ngày`} />
        <StatCard icon={<CheckCircle size={20} />} iconBg="#f0fdf4" iconColor="#16a34a"
          label="Đã thuộc" value={s.knownCards.toLocaleString()} />
        <StatCard icon={<TrendingUp size={20} />} iconBg="#f0f9ff" iconColor="#0284c7"
          label="Đang học" value={s.learningCards.toLocaleString()} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Progress */}
        <div className="card card-p" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontWeight: 700, fontSize: 15 }}>Tiến độ {s.jlptLevel}</h3>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.knownCards}/{s.totalCards}</span>
          </div>
          <div className="progress-bar" style={{ height: 8, marginBottom: 12 }}>
            <div className="progress-fill" style={{ width: `${s.progress}%` }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)' }}>
            <span>🟢 Thuộc: {s.knownCards}</span>
            <span>🟡 Học: {s.learningCards}</span>
            <span>⚪ Mới: {s.totalCards - s.knownCards - s.learningCards}</span>
          </div>
        </div>

        {/* Weekly Chart */}
        <div className="card card-p" style={{ padding: 20 }}>
          <h3 style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>📅 Hoạt động 7 ngày</h3>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', height: 80 }}>
            {s.weeklyData.map((v, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{
                  width: '100%',
                  height: `${(v / maxVal) * 64}px`,
                  background: i === 6
                    ? 'linear-gradient(180deg,#4f46e5,#06b6d4)'
                    : 'linear-gradient(180deg,#c7d2fe,#e0e7ff)',
                  borderRadius: 6,
                  transition: 'height 600ms ease'
                }} />
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{days[i]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card card-p" style={{ padding: 20 }}>
        <h3 style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>🚀 Bắt đầu nhanh</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
          <QuickAction icon="🃏" title="Flashcard" sub="450 từ" color="#4f46e5" onClick={() => onNavigate?.('flashcard')} />
          <QuickAction icon="📝" title="Thi thử" sub="JLPT N5" color="#06b6d4" onClick={() => onNavigate?.('exam')} />
          <QuickAction icon="📚" title="Từ vựng" sub="Học từ mới" color="#7c3aed" onClick={() => onNavigate?.('vocabulary')} />
          <QuickAction icon="🎓" title="Bài học" sub="Ngữ pháp" color="#f59e0b" onClick={() => onNavigate?.('lesson')} />
          <QuickAction icon="💬" title="Kaiwa" sub="Giao tiếp N5" color="#ec4899" onClick={() => onNavigate?.('kaiwa')} />
          <QuickAction icon="⚙️" title="Cài đặt" sub="Tùy chỉnh" color="#64748b" onClick={() => onNavigate?.('settings')} />
        </div>
      </div>

      {/* JLPT Roadmap */}
      <div className="card card-p" style={{ padding: 20 }}>
        <h3 style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>🗺️ Lộ trình JLPT</h3>
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 8 }}>
          {['N5', 'N4', 'N3', 'N2', 'N1'].map((level, i) => (
            <div key={level} style={{
              minWidth: 90, padding: '12px', borderRadius: 14, textAlign: 'center',
              background: i < 2 ? 'linear-gradient(135deg,#4f46e5,#06b6d4)' : '#f8fafc',
              color: i < 2 ? 'white' : 'var(--text-muted)',
              border: i === 1 ? '2px solid transparent' : '1px solid var(--border)',
              position: 'relative'
            }}>
              <div style={{ fontSize: 18, fontWeight: 900 }}>{level}</div>
              <div style={{ fontSize: 10, marginTop: 4 }}>
                {i === 0 ? '✅ Xong' : i === 1 ? '🔥 Học' : '🔒 Khóa'}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, iconBg, iconColor, label, value }: {
  icon: React.ReactNode; iconBg: string; iconColor: string; label: string; value: string;
}) {
  return (
    <div className="stat-card" style={{ padding: 14, gap: 10 }}>
      <div className="stat-icon" style={{ background: iconBg, color: iconColor, width: 40, height: 40 }}>{icon}</div>
      <div>
        <div className="stat-label" style={{ fontSize: 11 }}>{label}</div>
        <div className="stat-value" style={{ fontSize: 18 }}>{value}</div>
      </div>
    </div>
  );
}

function QuickAction({ icon, title, sub, color, onClick }: { icon: string; title: string; sub: string; color: string; onClick?: () => void }) {
  return (
    <div style={{
      padding: '12px', borderRadius: 12,
      background: `linear-gradient(135deg,${color}15,${color}08)`,
      border: `1px solid ${color}25`,
      cursor: 'pointer', transition: 'transform 150ms ease',
    }}
      onClick={onClick}
      onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-2px)')}
      onMouseLeave={e => (e.currentTarget.style.transform = '')}
    >
      <div style={{ fontSize: 20, marginBottom: 4 }}>{icon}</div>
      <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>{title}</div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{sub}</div>
    </div>
  );
}
