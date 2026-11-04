import React, { useState, useEffect } from 'react';
import {
  PhoneCall,
  Mic,
  Volume2,
  Sparkles,
  Compass,
  MessageSquare,
  BookOpen,
  HelpCircle,
  Flame,
  Award,
  Zap,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import { TutorProfile, Scenario, LearningLevel, VocabularyItem } from './types';
import { TUTORS, SCENARIOS, INITIAL_VOCABULARY } from './data/mockData';
import { Navbar } from './components/Navbar';
import { LiveVoiceCallModal } from './components/LiveVoiceCallModal';
import { InteractiveChat } from './components/InteractiveChat';
import { ScenarioSelector } from './components/ScenarioSelector';
import { PronunciationTrainer } from './components/PronunciationTrainer';
import { VocabularyBook } from './components/VocabularyBook';
import { VoiceQuiz } from './components/VoiceQuiz';
import { AudioWaveVisualizer } from './components/AudioWaveVisualizer';
import { speakWithBrowser, playSoundEffect } from './utils/audio';

export default function App() {
  const [activeTab, setActiveTab] = useState<'call' | 'chat' | 'scenarios' | 'pronounce' | 'vocab' | 'quiz'>('call');
  const [activeTutor, setActiveTutor] = useState<TutorProfile>(TUTORS[0]);
  const [activeScenario, setActiveScenario] = useState<Scenario>(SCENARIOS[0]);
  const [userLevel, setUserLevel] = useState<LearningLevel>('beginner');
  const [isLiveCallOpen, setIsLiveCallOpen] = useState(false);

  // Gamification & storage
  const [vocabularyList, setVocabularyList] = useState<VocabularyItem[]>(() => {
    try {
      const saved = localStorage.getItem('ostadi_vocabulary');
      return saved ? JSON.parse(saved) : INITIAL_VOCABULARY;
    } catch {
      return INITIAL_VOCABULARY;
    }
  });

  const [streakDays, setStreakDays] = useState(4);
  const [xpPoints, setXpPoints] = useState(380);

  useEffect(() => {
    try {
      localStorage.setItem('ostadi_vocabulary', JSON.stringify(vocabularyList));
    } catch (e) {
      console.warn('Storage save error:', e);
    }
  }, [vocabularyList]);

  const handleAddVocabulary = (vocab: VocabularyItem) => {
    setVocabularyList((prev) => {
      // Check if already exists
      const exists = prev.some(
        (v) => v.english.toLowerCase() === vocab.english.toLowerCase()
      );
      if (exists) return prev;
      return [vocab, ...prev];
    });
    setXpPoints((prev) => prev + 15);
  };

  const handleToggleMastered = (id: string) => {
    setVocabularyList((prev) =>
      prev.map((v) => (v.id === id ? { ...v, mastered: !v.mastered } : v))
    );
    playSoundEffect('success');
  };

  const handleDeleteWord = (id: string) => {
    setVocabularyList((prev) => prev.filter((v) => v.id !== id));
  };

  const handleStartLiveCall = (scenario?: Scenario) => {
    if (scenario) {
      setActiveScenario(scenario);
    }
    playSoundEffect('start');
    setIsLiveCallOpen(true);
  };

  const handleOpenChatWithScenario = (scenario: Scenario) => {
    setActiveScenario(scenario);
    setActiveTab('chat');
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-300">
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        activeTutor={activeTutor}
        setActiveTutor={setActiveTutor}
        userLevel={userLevel}
        setUserLevel={setUserLevel}
        onStartLiveCall={() => handleStartLiveCall()}
        streakDays={streakDays}
        xpPoints={xpPoints}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Tab 1: Live Voice Call Hub */}
        {activeTab === 'call' && (
          <div className="space-y-8">
            {/* Hero Voice Call Banner */}
            <div className="relative rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900/90 to-emerald-950/40 border border-slate-800 p-6 sm:p-10 shadow-2xl overflow-hidden">
              {/* Background ambient orbs */}
              <div className="absolute top-0 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-10 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

              <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8">
                {/* Text & Pitch */}
                <div className="max-w-2xl text-center lg:text-right space-y-4">
                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>محادثة صوتية فورية بالذكاء الاصطناعي</span>
                  </div>

                  <h2 className="text-3xl sm:text-5xl font-extrabold text-white leading-tight">
                    هدر بالدارجة المغربية، <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-l from-emerald-400 via-teal-300 to-amber-300">
                      وهو يعلّمك الإنجليزية مباشرة!
                    </span>
                  </h2>

                  <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-xl">
                    ما تبقاش متردد ولا خايف من الغلط. تكلم دابا مع {activeTutor.name} بصوتك بحال يلا داير مكالمة حقيقية،
                    هو كيفهم الدارجة مزيان، وكيشرح ليك النطق السليم والعبارات اليومية خطوة بخطوة.
                  </p>

                  {/* Feature pills */}
                  <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2 pt-2 text-xs text-slate-300">
                    <span className="px-3 py-1 rounded-xl bg-slate-800/80 border border-slate-700/80 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      كلام عفوي بالدارجة
                    </span>
                    <span className="px-3 py-1 rounded-xl bg-slate-800/80 border border-slate-700/80 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      نطق إنجليزي بشرح صوتي
                    </span>
                    <span className="px-3 py-1 rounded-xl bg-slate-800/80 border border-slate-700/80 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      تصحيح فوري بدون إحراج
                    </span>
                  </div>

                  {/* Primary CTA */}
                  <div className="pt-4 flex flex-wrap items-center justify-center lg:justify-start gap-3">
                    <button
                      onClick={() => handleStartLiveCall()}
                      className="px-8 py-4 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-extrabold text-base sm:text-lg flex items-center gap-3 shadow-xl shadow-emerald-500/25 transition-all transform hover:scale-105 active:scale-95"
                    >
                      <PhoneCall className="w-5 h-5 animate-bounce" />
                      <span>اتصل بالأستاذ دابا (مكالمة صوتية)</span>
                    </button>

                    <button
                      onClick={() => setActiveTab('chat')}
                      className="px-6 py-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-sm sm:text-base flex items-center gap-2 transition-all"
                    >
                      <MessageSquare className="w-4 h-4 text-emerald-400" />
                      <span>أو جرب الشات التفاعلي</span>
                    </button>
                  </div>
                </div>

                {/* Tutor Card / Live Preview */}
                <div className="w-full lg:w-80 bg-slate-950/70 border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center backdrop-blur-md">
                  <div className="relative mb-3">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-slate-800 to-slate-700 border-2 border-emerald-500/40 flex items-center justify-center text-5xl shadow-xl">
                      {activeTutor.avatar}
                    </div>
                    <span className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-emerald-500 border-2 border-slate-950" />
                  </div>

                  <h3 className="text-lg font-bold text-white">{activeTutor.name}</h3>
                  <span className="text-xs text-emerald-400 font-medium">{activeTutor.title}</span>
                  <p className="text-xs text-slate-400 mt-2 mb-4 leading-relaxed">
                    "{activeTutor.description}"
                  </p>

                  <div className="w-full bg-slate-900 p-3 rounded-2xl border border-slate-800 text-right space-y-1 mb-4">
                    <span className="text-[11px] text-slate-400 block font-semibold">
                      السيناريو الحالي:
                    </span>
                    <span className="text-xs text-white font-bold flex items-center gap-1.5">
                      <span>{activeScenario.icon}</span>
                      <span>{activeScenario.title}</span>
                    </span>
                  </div>

                  <button
                    onClick={() => handleStartLiveCall(activeScenario)}
                    className="w-full py-2.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-slate-950 border border-emerald-500/40 font-bold text-xs transition-all flex items-center justify-center gap-1.5"
                  >
                    <Mic className="w-4 h-4" />
                    <span>بدء التحدث بالصوت</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Practice Scenarios Grid */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-white">اختر سيناريو للمحادثة الصوتية</h3>
                  <p className="text-xs text-slate-400">تدرب على مواقف من الحياة اليومية بالدارجة والإنجليزية</p>
                </div>
                <button
                  onClick={() => setActiveTab('scenarios')}
                  className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1"
                >
                  <span>عرض كل السيناريوهات ({SCENARIOS.length})</span>
                  <ArrowRight className="w-3.5 h-3.5 rotate-180" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {SCENARIOS.slice(0, 3).map((sc) => (
                  <div
                    key={sc.id}
                    onClick={() => handleStartLiveCall(sc)}
                    className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-emerald-500/50 hover:bg-slate-900/90 transition-all cursor-pointer group shadow-lg flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-3xl">{sc.icon}</span>
                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                          {sc.badge}
                        </span>
                      </div>
                      <h4 className="font-bold text-white text-base group-hover:text-emerald-300 transition-colors">
                        {sc.title}
                      </h4>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                        {sc.description}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-semibold text-emerald-400">
                      <span className="flex items-center gap-1">
                        <PhoneCall className="w-3.5 h-3.5" />
                        اتصل دابا
                      </span>
                      <ArrowRight className="w-4 h-4 rotate-180 transform group-hover:-translate-x-1 transition-transform" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Daily Speaking Tip Card */}
            <div className="p-5 sm:p-6 rounded-3xl bg-slate-900/60 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center text-2xl flex-shrink-0">
                  💡
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm sm:text-base">
                    نصيحة الأستاذ اليومية للمغاربة
                  </h4>
                  <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                    ما تخلطش بين حرف P وحرف B! كلمة "Please" كتنطق بنفخة هواء خفيفة (بليز) ماشي (بليس).
                  </p>
                </div>
              </div>

              <button
                onClick={() => setActiveTab('pronounce')}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold border border-slate-700 flex-shrink-0"
              >
                جرب مدرب النطق ←
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: Interactive Chat */}
        {activeTab === 'chat' && (
          <InteractiveChat
            activeTutor={activeTutor}
            activeScenario={activeScenario}
            userLevel={userLevel}
            onAddVocabulary={handleAddVocabulary}
            onOpenLiveCall={() => handleStartLiveCall(activeScenario)}
          />
        )}

        {/* Tab 3: Everyday Scenarios */}
        {activeTab === 'scenarios' && (
          <ScenarioSelector
            activeScenario={activeScenario}
            onSelectScenario={setActiveScenario}
            onStartVoiceCall={handleStartLiveCall}
            onOpenChat={handleOpenChatWithScenario}
          />
        )}

        {/* Tab 4: Pronunciation Studio */}
        {activeTab === 'pronounce' && <PronunciationTrainer />}

        {/* Tab 5: Vocabulary Book */}
        {activeTab === 'vocab' && (
          <VocabularyBook
            vocabularyList={vocabularyList}
            onAddVocabulary={handleAddVocabulary}
            onToggleMastered={handleToggleMastered}
            onDeleteWord={handleDeleteWord}
          />
        )}

        {/* Tab 6: Quick Voice Quiz */}
        {activeTab === 'quiz' && <VoiceQuiz />}
      </main>

      {/* Floating Live Voice Call Modal (The direct voice conversation centerpiece) */}
      <LiveVoiceCallModal
        isOpen={isLiveCallOpen}
        onClose={() => setIsLiveCallOpen(false)}
        activeTutor={activeTutor}
        activeScenario={activeScenario}
        onSelectTutor={setActiveTutor}
        onAddVocabulary={handleAddVocabulary}
        userLevel={userLevel}
      />
    </div>
  );
}
