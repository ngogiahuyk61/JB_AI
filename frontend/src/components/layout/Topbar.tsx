import React from 'react';
import { Menu } from 'lucide-react';

const PAGE_TITLES: Record<string, string> = {
  dashboard: '📊 Tổng quan học tập',
  flashcard: '🃏 Flashcard Thông Minh',
  exam: '📝 Thi thử AI',
  vocabulary: '📚 Từ vựng JLPT',
  lesson: '🎓 Bài học',
  ranking: '🏆 Bảng xếp hạng',
  settings: '⚙️ Cài đặt',
};

interface TopbarProps {
  activeTab: string;
  onMenuClick: () => void;
}

export default function Topbar({ activeTab, onMenuClick }: TopbarProps) {
  return (
    <header className="topbar">
      <button className="menu-btn" onClick={onMenuClick} aria-label="Toggle menu">
        <Menu size={22} />
      </button>
      <span className="topbar-title">{PAGE_TITLES[activeTab] || 'Sensei.AI'}</span>
    </header>
  );
}
