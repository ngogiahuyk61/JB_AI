import React from 'react';
import { BookOpen, Flame, CheckCircle, TrendingUp, Target, Calendar } from 'lucide-react';
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

export default function DashboardPage() {
  const s = MOCK_STATS;
  const days = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
  const maxVal = Math.max(...s.weeklyData);

  return (
    <div className="page-inner" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Hero Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #4f46e5 0%, #06b6d4 100%)',
        borderRadius: 24, padding: '28px 32px', color: 'white',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16
      }}>
        <div>
          <p style={{ opacity: .8, fontSize: 14, marginBottom: 6 }}>Chào mừng trở lại! 👋</p>
          <h2 style={{ fontSize: 'clamp(20px,4vw,28px)', fontWeight: 900, marginBottom: 8 }}>
            Hôm nay học thêm 30 từ nhé?
          </h2>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', opacity: .9 }}>
            <span>🔥 Streak {s.streak} ngày</span>
            <span>🎯 Mục tiêu: {s.jlptLevel}</span>
            <span>📖 {s.todayStudied} từ hôm nay</span>
          </div>
        </div>
        <div style={{
          background: 'rgba(255,255,255,.15)', backdropFilter: 'blur(10px)',
          borderRadius: 16, padding: '16px 24px', textAlign: 'center', minWidth: 120
        }}>
          <div style={{ fontSize: 36, fontWeight: 900 }}>{s.progress}%</div>
          <div style={{ fontSize: 12, opacity: .8 }}>Tiến độ {s.jlptLevel}</div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="stat-grid">
        <StatCard icon={<BookOpen size={22} />} iconBg="#ede9fe" iconColor="#7c3aed"
          label="Từ đã học" value={s.wordsLearned.toLocaleString()} />
        <StatCard icon={<Flame size={22} />} iconBg="#fff7ed" iconColor="#ea580c"
          label="Streak" value={`${s.streak} ngày`} />
        <StatCard icon={<CheckCircle size={22} />} iconBg="#f0fdf4" iconColor="#16a34a"
          label="Đã thuộc" value={s.knownCards.toLocaleString()} />
        <StatCard icon={<TrendingUp size={22} />} iconBg="#f0f9ff" iconColor="#0284c7"
          label="Đang học" value={s.learningCards.toLocaleString()} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 20 }}>
        {/* Progress */}
        <div className="card card-p">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontWeight: 700, fontSize: 16 }}>Tiến độ {s.jlptLevel}</h3>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{s.knownCards}/{s.totalCards}</span>
          </div>
          <div className="progress-bar" style={{ height: 10, marginBottom: 12 }}>
            <div className="progress-fill" style={{ width: `${s.progress}%` }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)' }}>
            <span>🟢 Thuộc: {s.knownCards}</span>
            <span>🟡 Học: {s.learningCards}</span>
            <span>⚪ Mới: {s.totalCards - s.knownCards - s.learningCards}</span>
          </div>
        </div>

        {/* Weekly Chart */}
        <div className="card card-p">
          <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 16 }}>📅 Hoạt động 7 ngày</h3>
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
      <div className="card card-p">
        <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 16 }}>🚀 Bắt đầu nhanh</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 12 }}>
          <QuickAction icon="🃏" title="Ôn Flashcard N5" sub="450 từ đang chờ" color="#4f46e5" />
          <QuickAction icon="📝" title="Làm đề thi thử" sub="JLPT N5 Tháng 7" color="#06b6d4" />
          <QuickAction icon="🎤" title="Luyện hội thoại" sub="AI sửa phát âm" color="#7c3aed" />
          <QuickAction icon="📊" title="Xem thống kê" sub="Tiến độ tuần này" color="#f59e0b" />
        </div>
      </div>

      {/* JLPT Roadmap */}
      <div className="card card-p">
        <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 16 }}>🗺️ Lộ trình JLPT</h3>
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 8 }}>
          {['N5', 'N4', 'N3', 'N2', 'N1'].map((level, i) => (
            <div key={level} style={{
              minWidth: 100, padding: '14px 16px', borderRadius: 16, textAlign: 'center',
              background: i < 2 ? 'linear-gradient(135deg,#4f46e5,#06b6d4)' : '#f8fafc',
              color: i < 2 ? 'white' : 'var(--text-muted)',
              border: i === 1 ? '2px solid transparent' : '1px solid var(--border)',
              position: 'relative'
            }}>
              <div style={{ fontSize: 20, fontWeight: 900 }}>{level}</div>
              <div style={{ fontSize: 11, marginTop: 4 }}>
                {i === 0 ? '✅ Hoàn thành' : i === 1 ? '🔥 Đang học' : '🔒 Chưa mở'}
              </div>
              {i < 4 && <div style={{ position: 'absolute', right: -14, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: 18 }}>›</div>}
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
    <div className="stat-card">
      <div className="stat-icon" style={{ background: iconBg, color: iconColor }}>{icon}</div>
      <div>
        <div className="stat-label">{label}</div>
        <div className="stat-value">{value}</div>
      </div>
    </div>
  );
}

function QuickAction({ icon, title, sub, color }: { icon: string; title: string; sub: string; color: string }) {
  return (
    <div style={{
      padding: '14px 16px', borderRadius: 14,
      background: `linear-gradient(135deg,${color}15,${color}08)`,
      border: `1px solid ${color}25`,
      cursor: 'pointer', transition: 'transform 150ms ease',
    }}
      onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-2px)')}
      onMouseLeave={e => (e.currentTarget.style.transform = '')}
    >
      <div style={{ fontSize: 24, marginBottom: 6 }}>{icon}</div>
      <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>{title}</div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{sub}</div>
    </div>
  );
}
