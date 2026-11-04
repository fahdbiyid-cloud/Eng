import React from 'react';
import {
  PhoneCall,
  MessageSquare,
  Compass,
  Mic2,
  BookMarked,
  HelpCircle,
  Flame,
  Award,
  ChevronDown,
} from 'lucide-react';
import { TutorProfile, LearningLevel } from '../types';
import { TUTORS } from '../data/mockData';

interface NavbarProps {
  activeTab: 'call' | 'chat' | 'scenarios' | 'pronounce' | 'vocab' | 'quiz';
  setActiveTab: (tab: 'call' | 'chat' | 'scenarios' | 'pronounce' | 'vocab' | 'quiz') => void;
  activeTutor: TutorProfile;
  setActiveTutor: (tutor: TutorProfile) => void;
  userLevel: LearningLevel;
  setUserLevel: (level: LearningLevel) => void;
  onStartLiveCall: () => void;
  streakDays: number;
  xpPoints: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  activeTutor,
  setActiveTutor,
  userLevel,
  setUserLevel,
  onStartLiveCall,
  streakDays,
  xpPoints,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Top brand & controls bar */}
        <div className="flex items-center justify-between py-3.5 border-b border-slate-800/40">
          {/* Logo & Moroccan Identity */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-emerald-400 p-0.5 shadow-lg shadow-emerald-500/20 flex items-center justify-center">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-xl font-black text-emerald-400">
                أ
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
                  أستاذي <span className="text-emerald-400">Ostadi</span>
                </h1>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-medium">
                  🇲🇦 بالدارجة
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                تعلّم الإنجليزية بمحادثة صوتية مباشرة مع الذكاء الاصطناعي
              </p>
            </div>
          </div>

          {/* Right Action & Stats items */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Streak & XP */}
            <div className="hidden md:flex items-center gap-2 bg-slate-900/90 border border-slate-800 px-3 py-1.5 rounded-2xl text-xs">
              <span className="flex items-center gap-1 text-amber-400 font-bold">
                <Flame className="w-4 h-4 fill-amber-400 text-amber-500" />
                <span>{streakDays} أيام</span>
              </span>
              <span className="text-slate-600">•</span>
              <span className="flex items-center gap-1 text-teal-400 font-bold">
                <Award className="w-4 h-4" />
                <span>{xpPoints} XP</span>
              </span>
            </div>

            {/* Level Selector */}
            <select
              value={userLevel}
              onChange={(e) => setUserLevel(e.target.value as LearningLevel)}
              className="bg-slate-900 border border-slate-800 text-slate-300 text-xs rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="beginner">مبتدئ (Beginner)</option>
              <option value="intermediate">متوسط (Intermediate)</option>
              <option value="advanced">متقدم (Advanced)</option>
            </select>

            {/* Tutor Selector */}
            <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-0.5">
              {TUTORS.map((tutor) => (
                <button
                  key={tutor.id}
                  onClick={() => setActiveTutor(tutor)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                    activeTutor.id === tutor.id
                      ? 'bg-emerald-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title={tutor.description}
                >
                  <span>{tutor.avatar}</span>
                  <span className="hidden sm:inline">{tutor.name.replace('أستاذي ', '').replace('أستاذتي ', '')}</span>
                </button>
              ))}
            </div>

            {/* Primary Live Voice CTA */}
            <button
              onClick={onStartLiveCall}
              className="px-3.5 sm:px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-bold text-xs sm:text-sm flex items-center gap-1.5 shadow-lg shadow-emerald-500/25 transition-all transform hover:scale-105"
            >
              <PhoneCall className="w-3.5 h-3.5 animate-pulse" />
              <span>مكالمة صوتية</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation row */}
        <nav className="flex items-center gap-1 py-2 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('call')}
            className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all flex-shrink-0 ${
              activeTab === 'call'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
            }`}
          >
            <PhoneCall className="w-4 h-4 text-emerald-400" />
            <span>المحادثة الصوتية المباشرة</span>
          </button>

          <button
            onClick={() => setActiveTab('chat')}
            className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all flex-shrink-0 ${
              activeTab === 'chat'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>شات الأستاذ التفاعلي</span>
          </button>

          <button
            onClick={() => setActiveTab('scenarios')}
            className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all flex-shrink-0 ${
              activeTab === 'scenarios'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
            }`}
          >
            <Compass className="w-4 h-4" />
            <span>السيناريوهات اليومية</span>
          </button>

          <button
            onClick={() => setActiveTab('pronounce')}
            className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all flex-shrink-0 ${
              activeTab === 'pronounce'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
            }`}
          >
            <Mic2 className="w-4 h-4" />
            <span>مدرب النطق ومخارج الحروف</span>
          </button>

          <button
            onClick={() => setActiveTab('vocab')}
            className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all flex-shrink-0 ${
              activeTab === 'vocab'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
            }`}
          >
            <BookMarked className="w-4 h-4" />
            <span>قاموسي وعباراتي</span>
          </button>

          <button
            onClick={() => setActiveTab('quiz')}
            className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all flex-shrink-0 ${
              activeTab === 'quiz'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            <span>كويز سريع</span>
          </button>
        </nav>
      </div>
    </header>
  );
};
