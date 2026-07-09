import { BrainCircuit } from 'lucide-react';
import { NAV_ITEMS, type AppTab } from '../../constants/navItems';

interface SidebarNavProps {
  activeTab: AppTab;
  onTabChange: (tab: AppTab) => void;
}

export default function SidebarNav({ activeTab, onTabChange }: SidebarNavProps) {
  return (
    <aside className="sidebar-nav">
      <div className="sidebar-brand">
        <BrainCircuit size={28} className="sidebar-brand-icon" />
        <div>
          <div className="sidebar-brand-title">Sensei.AI</div>
          <div className="sidebar-brand-sub">Học tiếng Nhật</div>
        </div>
      </div>

      <nav className="sidebar-menu">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              className={`sidebar-item ${isActive ? 'active' : ''}`}
              onClick={() => onTabChange(item.id)}
            >
              <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
