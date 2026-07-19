import { useState } from 'react';
import { BookOpen, BrainCircuit, Users } from 'lucide-react';

import ChopchepTab from '../components/chopchep/ChopchepTab';
import GrammarTab from '../components/chopchep/GrammarTab';
import NhanVatTab from '../components/chopchep/NhanVatTab';
import '../styles/chopchep.css';

type TabType = 'chopchep' | 'nguphap' | 'nhanvat';

export default function ChopchepPage() {
  const [activeTab, setActiveTab] = useState<TabType>('chopchep');

  return (
    <div className="chopchep-layout">
      {/* Top Navbar */}
      <div className="chopchep-nav">
        <button
          onClick={() => setActiveTab('chopchep')}
          className={`chopchep-tab-btn ${activeTab === 'chopchep' ? 'active' : ''}`}
        >
          <BookOpen size={18} />
          <span>Chop Chep</span>
        </button>

        <button
          onClick={() => setActiveTab('nguphap')}
          className={`chopchep-tab-btn ${activeTab === 'nguphap' ? 'active' : ''}`}
        >
          <BrainCircuit size={18} />
          <span>Ngữ pháp</span>
        </button>

        <button
          onClick={() => setActiveTab('nhanvat')}
          className={`chopchep-tab-btn ${activeTab === 'nhanvat' ? 'active' : ''}`}
        >
          <Users size={18} />
          <span>Nhân vật</span>
        </button>
      </div>

      {/* Content Area */}
      <div className="chopchep-content-area">
        {activeTab === 'chopchep' && <ChopchepTab />}
        {activeTab === 'nguphap' && <GrammarTab />}
        {activeTab === 'nhanvat' && <NhanVatTab />}
      </div>
    </div>
  );
}
