import { useState } from 'react';
import { BookOpen, BrainCircuit, Users } from 'lucide-react';

import ChopchepTab from '../components/chopchep/ChopchepTab';
import NguPhapTab from '../components/chopchep/NguPhapTab';
import NhanVatTab from '../components/chopchep/NhanVatTab';

type TabType = 'chopchep' | 'nguphap' | 'nhanvat';

export default function ChopchepPage() {
  const [activeTab, setActiveTab] = useState<TabType>('chopchep');

  return (
    <div className="flex flex-col h-screen bg-[#0a0a0a]">
      {/* Top Navbar */}
      <div className="flex-none p-4 bg-[#111111] border-b border-white/5 shadow-md flex items-center justify-center gap-2 md:gap-4 z-20">
        <button
          onClick={() => setActiveTab('chopchep')}
          className={`px-4 py-2 md:px-6 md:py-2.5 rounded-xl font-medium transition-all flex items-center gap-2 ${
            activeTab === 'chopchep' 
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' 
              : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white/90'
          }`}
        >
          <BookOpen size={18} />
          <span className="hidden md:inline">Chop Chep</span>
        </button>

        <button
          onClick={() => setActiveTab('nguphap')}
          className={`px-4 py-2 md:px-6 md:py-2.5 rounded-xl font-medium transition-all flex items-center gap-2 ${
            activeTab === 'nguphap' 
              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20' 
              : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white/90'
          }`}
        >
          <BrainCircuit size={18} />
          <span className="hidden md:inline">Ngữ pháp</span>
        </button>

        <button
          onClick={() => setActiveTab('nhanvat')}
          className={`px-4 py-2 md:px-6 md:py-2.5 rounded-xl font-medium transition-all flex items-center gap-2 ${
            activeTab === 'nhanvat' 
              ? 'bg-amber-600 text-white shadow-lg shadow-amber-500/20' 
              : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white/90'
          }`}
        >
          <Users size={18} />
          <span className="hidden md:inline">Nhân vật</span>
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden relative">
        {activeTab === 'chopchep' && <ChopchepTab />}
        {activeTab === 'nguphap' && <NguPhapTab />}
        {activeTab === 'nhanvat' && <NhanVatTab />}
      </div>
    </div>
  );
}
