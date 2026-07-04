import React from 'react';
import { BrainCircuit } from 'lucide-react';

const PAGE_TITLES: Record<string, string> = {
  dashboard: 'Sensei.AI',
  flashcard: 'Flashcard',
  exam: 'Thi thử AI',
  vocabulary: 'Từ vựng JLPT',
  lesson: 'Bài học',
  settings: 'Cài đặt',
};

interface TopbarProps {
  activeTab: string;
}

export default function Topbar({ activeTab }: TopbarProps) {
  return (
    <header className="topbar">
      {activeTab === 'dashboard' && <BrainCircuit size={24} style={{ color: '#a5b4fc' }} />}
      <h1 className="topbar-title">{PAGE_TITLES[activeTab] || 'Sensei.AI'}</h1>
    </header>
  );
}
