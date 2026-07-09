import { NAV_ITEMS, type AppTab } from '../../constants/navItems';

interface BottomNavProps {
  activeTab: string;
  onTabChange: (tab: AppTab) => void;
}

export default function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  return (
    <nav className="bottom-nav">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            type="button"
            className={`nav-item ${isActive ? 'active' : ''}`}
            onClick={() => onTabChange(item.id)}
          >
            <div className="nav-item-icon-wrapper">
              <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
            </div>
            <span className="nav-item-label">{item.shortLabel ?? item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
