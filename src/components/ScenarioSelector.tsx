import React from 'react';
import { PhoneCall, MessageSquare, ChevronLeft, Sparkles, Volume2 } from 'lucide-react';
import { Scenario } from '../types';
import { SCENARIOS } from '../data/mockData';
import { speakWithBrowser, playSoundEffect } from '../utils/audio';

interface ScenarioSelectorProps {
  activeScenario: Scenario;
  onSelectScenario: (scenario: Scenario) => void;
  onStartVoiceCall: (scenario: Scenario) => void;
  onOpenChat: (scenario: Scenario) => void;
}

export const ScenarioSelector: React.FC<ScenarioSelectorProps> = ({
  activeScenario,
  onSelectScenario,
  onStartVoiceCall,
  onOpenChat,
}) => {
  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      {/* Intro Header */}
      <div className="bg-gradient-to-r from-emerald-950/60 via-slate-900 to-teal-950/40 border border-slate-800 p-6 sm:p-8 rounded-3xl backdrop-blur-xl relative overflow-hidden">
        <div className="relative z-10 max-w-2xl space-y-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold border border-emerald-500/30">
            <Sparkles className="w-3.5 h-3.5" />
            محاكاة مواقف حقيقية
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
            سيناريوهات المحادثة الواقعية اليومية
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            اختار الموقف اللي باغي تدرب عليه (القهوة، المطار، العمل، الطاكسي...) وتكلم مباشرة مع الأستاذ بالدارجة وهو يعلمك شنو تقول بالإنجليزية بكل ثقة.
          </p>
        </div>
      </div>

      {/* Grid of Scenarios */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {SCENARIOS.map((sc) => {
          const isSelected = activeScenario.id === sc.id;

          return (
            <div
              key={sc.id}
              className={`rounded-3xl border p-5 sm:p-6 transition-all duration-300 flex flex-col justify-between ${
                isSelected
                  ? 'bg-gradient-to-b from-slate-900 to-slate-950 border-emerald-500/60 shadow-xl shadow-emerald-500/10 ring-1 ring-emerald-500/30'
                  : 'bg-slate-900/70 border-slate-800 hover:border-slate-700 hover:bg-slate-900/90'
              }`}
            >
              <div>
                {/* Top Badge & Icon */}
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-slate-800/90 border border-slate-700/80 flex items-center justify-center text-2xl shadow-inner">
                    {sc.icon}
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-medium">
                    {sc.badge}
                  </span>
                </div>

                {/* Title & Description */}
                <h3 className="text-lg font-bold text-white mb-1">{sc.title}</h3>
                <span className="font-latin text-xs text-emerald-400 font-medium block mb-2">
                  {sc.titleEn}
                </span>
                <p className="text-xs text-slate-400 leading-relaxed mb-4">{sc.description}</p>

                {/* Sample phrases preview */}
                <div className="space-y-2 mb-4 bg-slate-950/60 p-3 rounded-2xl border border-slate-800/80">
                  <span className="text-[11px] text-slate-400 font-semibold block">
                    عبارات مفتاحية للتدريب:
                  </span>
                  {sc.samplePhrases.slice(0, 2).map((phrase, idx) => (
                    <div key={idx} className="text-xs border-b border-slate-800/60 last:border-0 pb-1.5 last:pb-0">
                      <div className="flex items-center justify-between">
                        <span className="font-latin font-bold text-slate-200">{phrase.english}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            speakWithBrowser(phrase.english, 'en-US', 0.9);
                          }}
                          className="text-slate-400 hover:text-emerald-400 p-1"
                          title="استمع للنطق"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <span className="text-slate-400 text-[11px] block">{phrase.darija}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/60">
                <button
                  onClick={() => {
                    onSelectScenario(sc);
                    onStartVoiceCall(sc);
                  }}
                  className="px-3 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20 transition-all transform hover:scale-105"
                >
                  <PhoneCall className="w-3.5 h-3.5" />
                  <span>مكالمة صوتية</span>
                </button>
                <button
                  onClick={() => {
                    onSelectScenario(sc);
                    onOpenChat(sc);
                  }}
                  className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>بدء الشات</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
