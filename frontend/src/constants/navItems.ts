import { Home, BookMarked, Layers, GraduationCap, Settings, MessageSquareMore } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type AppTab = 'dashboard' | 'flashcard' | 'exam' | 'vocabulary' | 'lesson' | 'settings' | 'kaiwa' | 'verbquiz';

export interface NavItem {
  id: AppTab;
  label: string;
  shortLabel?: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Tổng quan', shortLabel: 'Tổng quan', icon: Home },
  { id: 'vocabulary', label: 'Từ vựng', shortLabel: 'Từ vựng', icon: BookMarked },
  { id: 'flashcard', label: 'Flashcard', shortLabel: 'Flashcard', icon: Layers },
  { id: 'lesson', label: 'Bài học', shortLabel: 'Bài học', icon: GraduationCap },
  { id: 'kaiwa', label: 'Kaiwa N5', shortLabel: 'Kaiwa', icon: MessageSquareMore },
  { id: 'settings', label: 'Cài đặt', shortLabel: 'Cài đặt', icon: Settings },
];
