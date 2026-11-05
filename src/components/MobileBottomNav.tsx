import React from 'react';
import {
  PhoneCall,
  MessageSquare,
  Compass,
  Mic2,
  BookMarked,
  HelpCircle,
} from 'lucide-react';
import { unlockAudio } from '../utils/audio';

interface MobileBottomNavProps {
  activeTab: 'call' | 'chat' | 'scenarios' | 'pronounce' | 'vocab' | 'quiz';
  setActiveTab: (tab: 'call' | 'chat' | 'scenarios' | 'pronounce' | 'vocab' | 'quiz') => void;
  onStartCall: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  setActiveTab,
  onStartCall,
}) => {
  const handleTabClick = (tab: 'call' | 'chat' | 'scenarios' | 'pronounce' | 'vocab' | 'quiz') => {
    unlockAudio();
    if (tab === 'call') {
      onStartCall();
    } else {
      setActiveTab(tab);
    }
  };

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-xl border-t border-slate-800/90 px-2 py-2 flex items-center justify-around shadow-2xl pb-[max(0.5rem,env(safe-area-inset-bottom))]">
      {/* 1. Chat */}
      <button
        onClick={() => handleTabClick('chat')}
        className={`flex flex-col items-center justify-center p-1.5 rounded-xl transition-all ${
          activeTab === 'chat' ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <MessageSquare className="w-5 h-5" />
        <span className="text-[10px] mt-1">شات</span>
      </button>

      {/* 2. Scenarios */}
      <button
        onClick={() => handleTabClick('scenarios')}
        className={`flex flex-col items-center justify-center p-1.5 rounded-xl transition-all ${
          activeTab === 'scenarios' ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <Compass className="w-5 h-5" />
        <span className="text-[10px] mt-1">مواقف</span>
      </button>

      {/* 3. Center Call Action Button */}
      <button
        onClick={() => {
          unlockAudio();
          onStartCall();
        }}
        className="relative -top-4 flex flex-col items-center justify-center group"
      >
        <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-emerald-500 via-teal-400 to-emerald-400 text-slate-950 flex items-center justify-center shadow-lg shadow-emerald-500/30 ring-4 ring-slate-950 transform active:scale-95 transition-all">
          <PhoneCall className="w-6 h-6 animate-pulse" />
        </div>
        <span className="text-[10px] font-extrabold text-emerald-400 mt-0.5">اتصل دابا</span>
      </button>

      {/* 4. Pronounce */}
      <button
        onClick={() => handleTabClick('pronounce')}
        className={`flex flex-col items-center justify-center p-1.5 rounded-xl transition-all ${
          activeTab === 'pronounce' ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <Mic2 className="w-5 h-5" />
        <span className="text-[10px] mt-1">نطق</span>
      </button>

      {/* 5. Vocab */}
      <button
        onClick={() => handleTabClick('vocab')}
        className={`flex flex-col items-center justify-center p-1.5 rounded-xl transition-all ${
          activeTab === 'vocab' ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <BookMarked className="w-5 h-5" />
        <span className="text-[10px] mt-1">قاموس</span>
      </button>

      {/* 6. Quiz */}
      <button
        onClick={() => handleTabClick('quiz')}
        className={`flex flex-col items-center justify-center p-1.5 rounded-xl transition-all ${
          activeTab === 'quiz' ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <HelpCircle className="w-5 h-5" />
        <span className="text-[10px] mt-1">كويز</span>
      </button>
    </div>
  );
};
