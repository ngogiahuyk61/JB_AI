import React from 'react';
import {
  BookOpen, FileSpreadsheet, FileText, Mic,
  BrainCircuit, X, Settings, BookMarked,
  BarChart2, MessageSquare, GraduationCap
} from 'lucide-react';
import type { NavItemConfig } from '../../types';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onChatOpen: () => void;
  isOpen: boolean;
  onClose: () => void;
  jlptLevel?: string;
}

const NAV_ITEMS: NavItemConfig[] = [
  { icon: <BarChart2 size={18} />, label: 'Tổng quan', path: 'dashboard' },
  { icon: <FileSpreadsheet size={18} />, label: 'Flashcard', path: 'flashcard' },
  { icon: <FileText size={18} />, label: 'Thi thử AI', path: 'exam' },
  { icon: <BookMarked size={18} />, label: 'Từ vựng JLPT', path: 'vocabulary', badge: 'N5・N4', badgeColor: '#4f46e5' },
  { icon: <GraduationCap size={18} />, label: 'Bài học', path: 'lesson', badge: 'Sắp ra' },
  { icon: <BarChart2 size={18} />, label: 'Bảng xếp hạng', path: 'ranking', badge: 'Sắp ra' },
  { icon: <Settings size={18} />, label: 'Cài đặt', path: 'settings' },
];

export default function Sidebar({ activeTab, onTabChange, onChatOpen, isOpen, onClose, jlptLevel = 'N5' }: SidebarProps) {
  const handleNav = (path: string) => {
    if (path === 'chat') { onChatOpen(); }
    else { onTabChange(path); }
    if (window.innerWidth < 768) onClose();
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div className="sidebar-overlay" style={{ display: window.innerWidth < 768 && isOpen ? 'block' : 'none' }} onClick={onClose} />
      )}

      <aside className={`sidebar ${isOpen ? 'open' : ''} ${!isOpen && window.innerWidth >= 768 ? 'collapsed' : ''}`}>
        {/* Logo */}
        <div className="sidebar-logo">
          <BrainCircuit size={28} />
          <h1>Sensei.AI</h1>
          <button
            className="menu-btn"
            onClick={onClose}
            style={{ marginLeft: 'auto', display: window.innerWidth < 768 ? 'flex' : 'none' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav className="sidebar-nav">
          {NAV_ITEMS.map(item => (
            <button
              key={item.path}
              className={`nav-item ${activeTab === item.path ? 'active' : ''}`}
              onClick={() => handleNav(item.path)}
            >
              {item.icon}
              <span>{item.label}</span>
              {item.badge && (
                <span className="badge" style={item.badgeColor ? {
                  background: `${item.badgeColor}20`,
                  color: item.badgeColor,
                  border: `1px solid ${item.badgeColor}40`,
                } : {}}>
                  {item.badge}
                </span>
              )}
            </button>
          ))}

          <div style={{ marginTop: 8, borderTop: '1px solid var(--border)', paddingTop: 8 }}>
            <button
              className="nav-item"
              onClick={onChatOpen}
              style={{ background: 'linear-gradient(135deg,#0f172a,#1e1b4b)', color: 'white' }}
            >
              <MessageSquare size={18} />
              <span>Luyện nói AI</span>
              <span className="badge" style={{ background: 'rgba(99,102,241,.4)', color: '#c7d2fe' }}>Free</span>
            </button>
          </div>
        </nav>

        {/* User */}
        <div className="sidebar-footer">
          <div className="user-card">
            <div className="user-avatar">U</div>
            <div className="user-info">
              <p>Học viên</p>
              <span className="user-level">🎯 Mục tiêu: {jlptLevel}</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
