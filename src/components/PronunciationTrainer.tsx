import React, { useState, useRef } from 'react';
import {
  Mic,
  Volume2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  RotateCcw,
  Award,
  Zap,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { PRONUNCIATION_CHALLENGES } from '../data/mockData';
import { PronunciationResult } from '../types';
import {
  globalAudioPlayer,
  speakWithBrowser,
  LiveSpeechRecognizer,
  AudioRecorder,
  playSoundEffect,
  unlockAudio,
} from '../utils/audio';

export const PronunciationTrainer: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [result, setResult] = useState<PronunciationResult | null>(null);
  const [heardTranscript, setHeardTranscript] = useState('');

  const currentChallenge = PRONUNCIATION_CHALLENGES[currentIndex];
  const recognizerRef = useRef<LiveSpeechRecognizer | null>(null);
  const recorderRef = useRef<AudioRecorder | null>(null);

  const handlePlayReferenceAudio = async () => {
    unlockAudio();
    playSoundEffect('click');
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: currentChallenge.phrase,
          voice: 'Puck',
          speed: 0.9,
          lang: 'en',
        }),
      });
      const data = await res.json();
      if (data.success && data.audioBase64) {
        await globalAudioPlayer.playBase64(data.audioBase64, 'audio/wav');
        return;
      }
    } catch (e) {
      console.warn('Fallback to browser synthesis');
    }
    speakWithBrowser(currentChallenge.phrase, 'en-US', 0.85);
  };

  const handleStartPractice = async () => {
    setResult(null);
    setHeardTranscript('');
    setIsRecording(true);

    if (typeof window !== 'undefined') {
      const rec = new LiveSpeechRecognizer();
      rec.setLang('en-US'); // For evaluating English pronunciation
      recognizerRef.current = rec;

      rec.onResultCallback = (res) => {
        setHeardTranscript(res.transcript);
        if (res.isFinal && res.transcript.trim()) {
          handleStopAndEvaluate(res.transcript.trim());
        }
      };

      rec.onErrorCallback = () => {
        // Fallback to recorder
      };

      const ok = rec.start();
      if (!ok) {
        recorderRef.current = new AudioRecorder();
        await recorderRef.current.start();
      }
    }
  };

  const handleStopAndEvaluate = async (transcriptText?: string) => {
    setIsRecording(false);
    setIsEvaluating(true);
    let spokenText = transcriptText || heardTranscript;
    let audioBase64: string | undefined = undefined;

    if (recognizerRef.current) {
      recognizerRef.current.stop();
    }

    if (!spokenText && recorderRef.current) {
      try {
        const audioData = await recorderRef.current.stop();
        audioBase64 = audioData.base64;
      } catch (err) {
        console.error('Audio recorder error:', err);
      }
    }

    try {
      const res = await fetch('/api/pronunciation-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetPhrase: currentChallenge.phrase,
          spokenText: spokenText || undefined,
          audioBase64,
        }),
      });

      const json = await res.json();
      if (json.success && json.data) {
        setResult(json.data);
        if (json.data.score >= 80) {
          playSoundEffect('success');
          confetti({
            particleCount: 80,
            spread: 60,
            origin: { y: 0.6 },
          });
        } else {
          playSoundEffect('ding');
        }
      }
    } catch (error) {
      console.error('Pronunciation check failed:', error);
    } finally {
      setIsEvaluating(false);
    }
  };

  const nextChallenge = () => {
    setResult(null);
    setHeardTranscript('');
    setCurrentIndex((prev) => (prev + 1) % PRONUNCIATION_CHALLENGES.length);
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/60 border border-slate-800 p-5 rounded-2xl backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
              <Zap className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-white">مدرب النطق ومخارج الحروف</h2>
          </div>
          <p className="text-sm text-slate-400">
            اسمع النطق الصحيح، عاود بصوتك، والذكاء الاصطناعي يعطيك نقطتك ونصائح بالدارجة!
          </p>
        </div>

        {/* Counter */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">التحدي:</span>
          <span className="px-3 py-1 rounded-xl bg-slate-800 text-emerald-400 font-mono font-bold border border-slate-700">
            {currentIndex + 1} / {PRONUNCIATION_CHALLENGES.length}
          </span>
        </div>
      </div>

      {/* Challenge Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        {/* Ambient background glow */}
        <div className="absolute -top-24 -left-24 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Card Header */}
        <div className="flex items-center justify-between mb-6">
          <span className="text-xs px-3 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-medium">
            🎯 {currentChallenge.title}
          </span>
          <span className="text-xs px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30">
            مستوى: {currentChallenge.level}
          </span>
        </div>

        {/* Target Phrase Main View */}
        <div className="text-center my-6 space-y-4">
          <div className="p-6 rounded-2xl bg-slate-950/60 border border-slate-800">
            <h3 className="font-latin text-2xl sm:text-3xl font-extrabold text-white tracking-wide mb-3">
              "{currentChallenge.phrase}"
            </h3>

            {/* Arabic Phonetics & Meaning */}
            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 text-sm mt-3">
              <span className="px-3 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                النطق بالدارجة: {currentChallenge.phoneticArabic}
              </span>
              <span className="text-slate-400">المعنى: {currentChallenge.darijaMeaning}</span>
            </div>

            {/* Focus sound tip */}
            <div className="mt-3 text-xs text-amber-300/90 flex items-center justify-center gap-1.5">
              <span>💡 رد البال:</span>
              <span>{currentChallenge.focusSound}</span>
            </div>
          </div>

          {/* Action buttons: Listen & Record */}
          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <button
              onClick={handlePlayReferenceAudio}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-sm transition-all shadow-md"
            >
              <Volume2 className="w-5 h-5 text-emerald-400" />
              <span>اسمع النطق الأصلي</span>
            </button>

            {isRecording ? (
              <button
                onClick={() => handleStopAndEvaluate()}
                className="inline-flex items-center gap-2 px-7 py-3 rounded-2xl bg-rose-500 hover:bg-rose-400 text-white font-bold text-sm transition-all shadow-lg shadow-rose-500/30 animate-pulse"
              >
                <Mic className="w-5 h-5 animate-bounce" />
                <span>وقف التسجيل وشوف النقطة</span>
              </button>
            ) : (
              <button
                onClick={handleStartPractice}
                disabled={isEvaluating}
                className="inline-flex items-center gap-2 px-7 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-sm transition-all shadow-lg shadow-emerald-500/30 transform hover:scale-105"
              >
                <Mic className="w-5 h-5" />
                <span>اضغط وانطق بالإنجليزية</span>
              </button>
            )}
          </div>

          {/* Evaluating State */}
          {isEvaluating && (
            <div className="mt-4 p-4 rounded-xl bg-slate-800/80 border border-slate-700 inline-flex items-center gap-2 text-sm text-slate-300 animate-pulse">
              <Sparkles className="w-4 h-4 text-emerald-400 animate-spin" />
              <span>الذكاء الاصطناعي كيحلل نطقك ومخارج الحروف...</span>
            </div>
          )}

          {/* Recording live prompt */}
          {isRecording && (
            <p className="text-xs text-amber-300 animate-pulse">
              🎙️ انطق الجملة دابا: "{currentChallenge.phrase}"
            </p>
          )}
        </div>

        {/* Evaluation Results Card */}
        {result && (
          <div className="mt-8 border-t border-slate-800 pt-6 animate-fade-in">
            <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-slate-950 to-slate-900 border border-slate-800 shadow-xl">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-3">
                  {/* Score badge circle */}
                  <div
                    className={`w-16 h-16 rounded-2xl flex flex-col items-center justify-center font-bold text-xl border shadow-lg ${
                      result.score >= 80
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-emerald-500/20'
                        : result.score >= 60
                        ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 shadow-amber-500/20'
                        : 'bg-rose-500/20 text-rose-400 border-rose-500/40 shadow-rose-500/20'
                    }`}
                  >
                    <span>{result.score}%</span>
                    <span className="text-[10px] font-normal">النقطة</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-base sm:text-lg flex items-center gap-2">
                      {result.score >= 80 ? (
                        <>
                          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                          <span>نطق ناضي تبارك الله!</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-5 h-5 text-amber-400" />
                          <span>محاولة مزيانة، باقي غير شوية!</span>
                        </>
                      )}
                    </h4>
                    <p className="text-xs text-slate-400">
                      شنو سمع الأستاذ:{' '}
                      <span className="font-latin font-bold text-slate-200">
                        "{result.heardText || currentChallenge.phrase}"
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleStartPractice}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-all"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    عاود المحاولة
                  </button>
                  <button
                    onClick={nextChallenge}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-all shadow-md"
                  >
                    <span>التحدي التالي</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Darija Feedback Text */}
              <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 mt-3">
                <p className="text-sm text-slate-200 leading-relaxed">
                  🗣️ {result.darijaFeedback}
                </p>

                {result.pronunciationTips && result.pronunciationTips.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-800">
                    <span className="text-xs text-amber-400 font-bold block mb-1">
                      نصائح الأستاذ لمخارج الحروف:
                    </span>
                    <ul className="text-xs text-slate-300 space-y-1 list-disc list-inside">
                      {result.pronunciationTips.map((tip, i) => (
                        <li key={i}>{tip}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {result.encouragement && (
                  <p className="text-xs text-emerald-400 font-bold mt-2">
                    ✨ {result.encouragement}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quick Select Carousel */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {PRONUNCIATION_CHALLENGES.map((ch, i) => (
          <button
            key={ch.id}
            onClick={() => {
              setCurrentIndex(i);
              setResult(null);
            }}
            className={`p-3 rounded-xl border text-right transition-all ${
              i === currentIndex
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <span className="block text-[11px] text-slate-400">تحدي #{i + 1}</span>
            <span className="block text-xs font-bold truncate">{ch.title}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
