import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  PhoneOff,
  Volume2,
  VolumeX,
  Sparkles,
  RotateCcw,
  BookOpen,
  MessageSquare,
  Flame,
  Award,
  ChevronDown,
  Info,
} from 'lucide-react';
import { TutorProfile, Scenario, ChatMessage, VocabularyItem } from '../types';
import { AudioWaveVisualizer } from './AudioWaveVisualizer';
import {
  globalAudioPlayer,
  speakWithBrowser,
  LiveSpeechRecognizer,
  AudioRecorder,
  playSoundEffect,
  unlockAudio,
} from '../utils/audio';

interface LiveVoiceCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeTutor: TutorProfile;
  activeScenario: Scenario;
  onSelectTutor: (tutor: TutorProfile) => void;
  onAddVocabulary: (vocab: VocabularyItem) => void;
  userLevel: string;
}

export const LiveVoiceCallModal: React.FC<LiveVoiceCallModalProps> = ({
  isOpen,
  onClose,
  activeTutor,
  activeScenario,
  onSelectTutor,
  onAddVocabulary,
  userLevel,
}) => {
  const [callState, setCallState] = useState<'connecting' | 'listening' | 'speaking' | 'thinking' | 'idle'>('connecting');
  const [isMuted, setIsMuted] = useState(false);
  const [autoListen, setAutoListen] = useState(true);
  const [speechSpeed, setSpeechSpeed] = useState<0.8 | 1.0>(1.0);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [lastTutorMessage, setLastTutorMessage] = useState<ChatMessage | null>(null);
  const [conversationHistory, setConversationHistory] = useState<ChatMessage[]>([]);
  const [callDuration, setCallDuration] = useState(0);
  const [showSummary, setShowSummary] = useState(false);
  const [learnedCount, setLearnedCount] = useState(0);

  const recognizerRef = useRef<LiveSpeechRecognizer | null>(null);
  const recorderRef = useRef<AudioRecorder | null>(null);
  const callTimerRef = useRef<any>(null);
  const isListeningRef = useRef(false);

  // Initialize SpeechRecognizer
  useEffect(() => {
    if (typeof window !== 'undefined') {
      recognizerRef.current = new LiveSpeechRecognizer();
    }
    return () => {
      globalAudioPlayer.stop();
      if (recognizerRef.current) recognizerRef.current.stop();
      if (callTimerRef.current) clearInterval(callTimerRef.current);
    };
  }, []);

  // Handle call lifecycle
  useEffect(() => {
    if (isOpen) {
      setCallDuration(0);
      setLearnedCount(0);
      setShowSummary(false);
      setCallState('connecting');

      callTimerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);

      // Start call with tutor's greeting
      startCallSession();
    } else {
      globalAudioPlayer.stop();
      if (recognizerRef.current) recognizerRef.current.stop();
      if (callTimerRef.current) clearInterval(callTimerRef.current);
      setCallState('idle');
    }
  }, [isOpen, activeScenario.id, activeTutor.id]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const [isAudioBlocked, setIsAudioBlocked] = useState(false);
  const silenceTimerRef = useRef<any>(null);

  const startCallSession = async () => {
    try {
      unlockAudio();
      setCallState('thinking');
      setIsAudioBlocked(false);
      const initialGreeting =
        activeScenario.id === 'free_chat'
          ? `Hey أستاذي! سلام، بغيت نبدا نهدر معاك بالدارجة مخلطة بـ English وتعلّمني دابا!`
          : `Hey! أنا دابا فـ سيناريو: "${activeScenario.title}". ${activeScenario.starterPrompt}`;

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: initialGreeting }],
          scenario: activeScenario,
          userLevel,
          tutorGender: activeTutor.gender,
        }),
      });

      const json = await res.json();
      if (json.success && json.data) {
        const botMsg: ChatMessage = {
          id: String(Date.now()),
          role: 'assistant',
          timestamp: Date.now(),
          content: json.data.darijaResponse,
          darijaResponse: json.data.darijaResponse,
          englishPhrase: json.data.englishPhrase,
          phoneticArabic: json.data.phoneticArabic,
          phoneticEnglish: json.data.phoneticEnglish,
          darijaExplanation: json.data.darijaExplanation,
          vocabulary: json.data.vocabulary,
          encouragement: json.data.encouragement,
          suggestedUserReplies: json.data.suggestedUserReplies,
          audioBase64: json.audioBase64,
        };

        setLastTutorMessage(botMsg);
        setConversationHistory([botMsg]);

        if (botMsg.vocabulary && botMsg.vocabulary.length > 0) {
          setLearnedCount((prev) => prev + botMsg.vocabulary!.length);
        }

        // Speak the response immediately
        playTutorVoice(botMsg);
      }
    } catch (err) {
      console.error('Call session start error:', err);
      setCallState('idle');
    }
  };

  const playTutorVoice = async (msg: ChatMessage) => {
    setCallState('speaking');
    unlockAudio();

    // 1. If server bundled the audio, play it immediately!
    if (msg.audioBase64) {
      const ok = await globalAudioPlayer.playBase64(msg.audioBase64, 'audio/wav', () => {
        onTutorFinishedSpeaking();
      });
      if (ok) return;
      // If blocked by mobile autoplay without interaction, show tap-to-unmute banner
      setIsAudioBlocked(true);
    }

    // 2. Fallback: Fetch /api/tts
    try {
      const speechPrompt = `${msg.englishPhrase || ''}. ${msg.darijaResponse || ''}`.trim();
      const ttsRes = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: speechPrompt,
          voice: activeTutor.voiceName,
          speed: speechSpeed,
          lang: 'en',
        }),
      });

      const ttsData = await ttsRes.json();
      if (ttsData.success && ttsData.audioBase64) {
        msg.audioBase64 = ttsData.audioBase64;
        const ok = await globalAudioPlayer.playBase64(ttsData.audioBase64, 'audio/wav', () => {
          onTutorFinishedSpeaking();
        });
        if (ok) return;
        setIsAudioBlocked(true);
      }
    } catch (e) {
      console.warn('Gemini TTS fetch failed, using browser synthesis:', e);
    }

    // 3. Fallback: Browser speech synthesis
    if (msg.englishPhrase) {
      await speakWithBrowser(msg.englishPhrase, 'en-US', speechSpeed);
    } else if (msg.darijaResponse) {
      await speakWithBrowser(msg.darijaResponse, 'ar-SA', speechSpeed);
    }
    onTutorFinishedSpeaking();
  };

  const onTutorFinishedSpeaking = () => {
    setIsAudioBlocked(false);
    playSoundEffect('ding');
    if (autoListen && !isMuted) {
      setTimeout(() => {
        startListening();
      }, 400);
    } else {
      setCallState('idle');
    }
  };

  const startListening = () => {
    unlockAudio();
    if (callState === 'speaking') {
      globalAudioPlayer.stop();
    }

    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    setCurrentTranscript('');
    isListeningRef.current = true;
    setCallState('listening');

    // Use Web Speech Recognition if available
    if (recognizerRef.current && recognizerRef.current.isAvailable()) {
      recognizerRef.current.setLang('ar-MA');
      recognizerRef.current.onResultCallback = (res) => {
        setCurrentTranscript(res.transcript);

        // Auto silence detection: auto send if user stopped speaking
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        if (res.transcript.trim().length > 3) {
          silenceTimerRef.current = setTimeout(() => {
            if (isListeningRef.current) {
              stopListeningAndSend(res.transcript.trim());
            }
          }, 1400);
        }

        if (res.isFinal && res.transcript.trim()) {
          stopListeningAndSend(res.transcript.trim());
        }
      };

      recognizerRef.current.onErrorCallback = (err) => {
        console.warn('Recognition error:', err);
      };

      recognizerRef.current.onEndCallback = () => {
        if (isListeningRef.current && currentTranscript) {
          stopListeningAndSend(currentTranscript);
        } else if (isListeningRef.current) {
          setCallState('idle');
        }
      };

      const ok = recognizerRef.current.start();
      if (!ok) {
        startRecorderFallback();
      }
    } else {
      startRecorderFallback();
    }
  };

  const startRecorderFallback = async () => {
    recorderRef.current = new AudioRecorder();
    const ok = await recorderRef.current.start();
    if (!ok) {
      setCallState('idle');
      alert('المرجو السماح للمتصفح بالوصول إلى الميكروفون للبدء في التحدث.');
    }
  };

  const stopListeningAndSend = async (transcriptText?: string) => {
    isListeningRef.current = false;
    let textToSend = transcriptText || currentTranscript;

    if (recognizerRef.current) {
      recognizerRef.current.stop();
    }

    // If we used recorder fallback
    if (!textToSend && recorderRef.current) {
      try {
        setCallState('thinking');
        const audio = await recorderRef.current.stop();
        if (audio.base64) {
          const transcribeRes = await fetch('/api/transcribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              audioBase64: audio.base64,
              mimeType: audio.mimeType,
            }),
          });
          const tJson = await transcribeRes.json();
          if (tJson.success && tJson.transcription) {
            textToSend = tJson.transcription;
          }
        }
      } catch (e) {
        console.error('Audio recorder transcribe error:', e);
      }
    }

    if (!textToSend || !textToSend.trim()) {
      setCallState('idle');
      return;
    }

    sendUserSpokenMessage(textToSend);
  };

  const sendUserSpokenMessage = async (userText: string) => {
    setCallState('thinking');
    setCurrentTranscript('');

    const userMsg: ChatMessage = {
      id: String(Date.now()),
      role: 'user',
      timestamp: Date.now(),
      content: userText,
    };

    const newHistory = [...conversationHistory, userMsg];
    setConversationHistory(newHistory);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newHistory.map((m) => ({
            role: m.role,
            content: m.content || m.darijaResponse,
          })),
          scenario: activeScenario,
          userLevel,
          tutorGender: activeTutor.gender,
        }),
      });

      const json = await res.json();
      if (json.success && json.data) {
        const botMsg: ChatMessage = {
          id: String(Date.now()),
          role: 'assistant',
          timestamp: Date.now(),
          content: json.data.darijaResponse,
          darijaResponse: json.data.darijaResponse,
          englishPhrase: json.data.englishPhrase,
          phoneticArabic: json.data.phoneticArabic,
          phoneticEnglish: json.data.phoneticEnglish,
          darijaExplanation: json.data.darijaExplanation,
          vocabulary: json.data.vocabulary,
          encouragement: json.data.encouragement,
          suggestedUserReplies: json.data.suggestedUserReplies,
          audioBase64: json.audioBase64,
        };

        setLastTutorMessage(botMsg);
        setConversationHistory((prev) => [...prev, botMsg]);

        if (botMsg.vocabulary && botMsg.vocabulary.length > 0) {
          setLearnedCount((prev) => prev + botMsg.vocabulary!.length);
        }

        playTutorVoice(botMsg);
      } else {
        setCallState('idle');
      }
    } catch (err) {
      console.error('Chat error:', err);
      setCallState('idle');
    }
  };

  const handleEndCall = () => {
    globalAudioPlayer.stop();
    if (recognizerRef.current) recognizerRef.current.stop();
    if (callTimerRef.current) clearInterval(callTimerRef.current);
    playSoundEffect('ding');
    setShowSummary(true);
  };

  const handleReplayCurrentAudio = () => {
    if (lastTutorMessage) {
      playTutorVoice(lastTutorMessage);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950 p-0 sm:p-6 transition-all">
      <div className="relative w-full max-w-3xl h-[100dvh] sm:h-[92vh] max-h-none sm:max-h-[850px] bg-gradient-to-b from-slate-900 via-slate-900/95 to-slate-950 border-0 sm:border border-slate-800 rounded-none sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        
        {/* Top Call Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="relative">
              <span className="text-2xl sm:text-3xl">{activeTutor.avatar}</span>
              <span
                className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-slate-900 ${
                  callState === 'speaking'
                    ? 'bg-emerald-400 animate-pulse'
                    : callState === 'listening'
                    ? 'bg-amber-400 animate-ping'
                    : 'bg-emerald-500'
                }`}
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <h3 className="font-bold text-white text-sm sm:text-lg">{activeTutor.name}</h3>
                <span className="text-[10px] sm:text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {activeScenario.title}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-slate-400">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>مكالمة صوتية</span>
                <span>•</span>
                <span className="font-mono text-emerald-400">{formatDuration(callDuration)}</span>
              </div>
            </div>
          </div>

          {/* Quick Settings: Speed & Auto-Listen */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={() => {
                unlockAudio();
                setSpeechSpeed((prev) => (prev === 1.0 ? 0.8 : 1.0));
              }}
              title="سرعة نطق الأستاذ"
              className={`px-2 sm:px-2.5 py-1 text-[11px] sm:text-xs rounded-xl border transition-all font-medium ${
                speechSpeed === 0.8
                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                  : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800'
              }`}
            >
              {speechSpeed === 0.8 ? '0.8x بطيء' : '1.0x عادي'}
            </button>
            <button
              onClick={() => {
                unlockAudio();
                setAutoListen(!autoListen);
              }}
              title="الاستماع التلقائي بعد انتهاء الأستاذ"
              className={`px-2 sm:px-2.5 py-1 text-[11px] sm:text-xs rounded-xl border transition-all font-medium ${
                autoListen
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                  : 'bg-slate-800/60 border-slate-700 text-slate-400'
              }`}
            >
              تلقائي: {autoListen ? 'مفعّل ⚡' : 'يدوي'}
            </button>
          </div>
        </div>

        {/* Call Center Stage: Visualizer & Status */}
        <div className="flex-1 flex flex-col items-center justify-between p-3 sm:p-6 overflow-y-auto">
          {/* Status Label & Unmute fallback banner */}
          <div className="text-center my-1 sm:my-2 w-full flex flex-col items-center">
            {isAudioBlocked && lastTutorMessage && (
              <button
                onClick={() => {
                  unlockAudio();
                  setIsAudioBlocked(false);
                  if (lastTutorMessage.audioBase64) {
                    globalAudioPlayer.playBase64(lastTutorMessage.audioBase64, 'audio/wav', () => onTutorFinishedSpeaking());
                  } else {
                    speakWithBrowser(lastTutorMessage.englishPhrase || lastTutorMessage.darijaResponse || '');
                  }
                }}
                className="mb-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-bold text-xs sm:text-sm shadow-xl flex items-center gap-2 animate-bounce ring-4 ring-amber-500/30"
              >
                <Volume2 className="w-4 h-4 text-slate-950" />
                <span>اضغط هنا لتشغيل صوت الأستاذ فوراً 🔊</span>
              </button>
            )}

            {callState === 'connecting' && (
              <span className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-slate-800/80 text-slate-300 text-xs sm:text-sm animate-pulse border border-slate-700">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                جاري الاتصال بالأستاذ...
              </span>
            )}
            {callState === 'speaking' && (
              <span className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs sm:text-sm border border-emerald-500/30">
                <Volume2 className="w-3.5 h-3.5 animate-bounce" />
                {activeTutor.name} كيهدر ويشرح دابا...
              </span>
            )}
            {callState === 'listening' && (
              <span className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs sm:text-sm border border-amber-500/30 animate-pulse">
                <Mic className="w-3.5 h-3.5 text-amber-400" />
                كنسمعك دابا... تكلم بالدارجة أو الإنجليزية
              </span>
            )}
            {callState === 'thinking' && (
              <span className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs sm:text-sm border border-indigo-500/30 animate-pulse">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
                الأستاذ كيفكر وكيوجد الجواب...
              </span>
            )}
            {callState === 'idle' && (
              <span className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-slate-800/60 text-slate-300 text-xs sm:text-sm border border-slate-700">
                اضغط على الميكروفون لتحت باش تهدر
              </span>
            )}
          </div>

          {/* Central Pulsing Avatar & Soundwave */}
          <div className="relative flex flex-col items-center justify-center my-auto py-2 sm:py-4">
            <div className="relative">
              {/* Outer pulsing wave rings */}
              <div
                className={`absolute inset-0 rounded-full transition-all duration-700 ${
                  callState === 'speaking'
                    ? 'scale-150 bg-emerald-500/10 animate-ping'
                    : callState === 'listening'
                    ? 'scale-150 bg-amber-500/10 animate-pulse'
                    : 'scale-100 bg-transparent'
                }`}
              />
              <div
                className={`absolute -inset-4 rounded-full transition-all duration-500 ${
                  callState === 'speaking'
                    ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/20 blur-md'
                    : callState === 'listening'
                    ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 blur-md'
                    : ''
                }`}
              />

              {/* Tutor Avatar Circle */}
              <div className="relative w-28 h-28 sm:w-36 sm:h-36 rounded-full bg-gradient-to-tr from-slate-800 to-slate-700 border-4 border-slate-700/80 shadow-2xl flex items-center justify-center text-5xl sm:text-6xl select-none">
                {activeTutor.avatar}
              </div>
            </div>

            {/* Reactive Wave Equalizer */}
            <div className="mt-4 w-full flex justify-center">
              <AudioWaveVisualizer
                isActive={callState === 'speaking' || callState === 'listening'}
                state={callState === 'speaking' ? 'speaking' : callState === 'listening' ? 'listening' : 'idle'}
                color={callState === 'listening' ? 'amber' : 'emerald'}
                size="md"
              />
            </div>

            {/* Live user transcript while speaking */}
            {callState === 'listening' && (
              <div className="mt-2 min-h-8 text-center px-4 max-w-md">
                <p className="text-amber-200 text-sm font-medium animate-pulse">
                  {currentTranscript ? `"${currentTranscript}"` : 'تكلم دابا، راني كنسمعك...'}
                </p>
              </div>
            )}
          </div>

          {/* Subtitles & Content Card */}
          {lastTutorMessage && (
            <div className="w-full bg-slate-800/60 border border-slate-700/70 rounded-2xl p-4 sm:p-5 backdrop-blur-md shadow-lg my-2">
              {/* Darija response */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <p className="text-slate-100 text-sm sm:text-base leading-relaxed font-normal">
                    {lastTutorMessage.darijaResponse}
                  </p>
                </div>
                <button
                  onClick={handleReplayCurrentAudio}
                  title="إعادة الاستماع للصوت"
                  className="p-2 rounded-xl bg-slate-700/70 hover:bg-emerald-500/20 hover:text-emerald-400 text-slate-300 transition-all flex-shrink-0"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>

              {/* Target English Phrase Highlight */}
              {lastTutorMessage.englishPhrase && (
                <div className="mt-3 p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30">
                  <div className="flex items-center justify-between text-xs text-emerald-400 font-medium mb-1">
                    <span>🇬🇧 الجملة بالإنجليزية (عاود نطقها):</span>
                    {lastTutorMessage.phoneticArabic && (
                      <span className="text-slate-300 bg-slate-800 px-2 py-0.5 rounded-md">
                        نطقها: {lastTutorMessage.phoneticArabic}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-1">
                    <p className="font-latin text-base sm:text-lg font-bold text-white tracking-wide">
                      "{lastTutorMessage.englishPhrase}"
                    </p>
                    <button
                      onClick={() => speakWithBrowser(lastTutorMessage.englishPhrase!, 'en-US', speechSpeed)}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500 text-slate-950 font-bold text-xs hover:bg-emerald-400 transition-all flex-shrink-0"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      اسمع النطق
                    </button>
                  </div>

                  {lastTutorMessage.darijaExplanation && (
                    <p className="text-xs text-emerald-200/80 mt-2 border-t border-emerald-500/20 pt-2">
                      💡 {lastTutorMessage.darijaExplanation}
                    </p>
                  )}
                </div>
              )}

              {/* Quick extracted vocabulary tags */}
              {lastTutorMessage.vocabulary && lastTutorMessage.vocabulary.length > 0 && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="text-xs text-slate-400">كلمات جديدة:</span>
                  {lastTutorMessage.vocabulary.map((vocab, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        onAddVocabulary({
                          id: `v-${Date.now()}-${i}`,
                          english: vocab.english,
                          darija: vocab.darija,
                          phonetic: vocab.pronunciation,
                          dateAdded: Date.now(),
                        });
                        playSoundEffect('ding');
                      }}
                      className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-slate-700/60 hover:bg-emerald-500/20 text-slate-200 border border-slate-600 hover:border-emerald-500/30 transition-all"
                    >
                      <span className="font-latin font-bold text-emerald-300">{vocab.english}</span>
                      <span className="text-slate-400">({vocab.darija})</span>
                      <span className="text-xs text-emerald-400">+ حفظ</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Suggested Quick Replies */}
              {lastTutorMessage.suggestedUserReplies && lastTutorMessage.suggestedUserReplies.length > 0 && (
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  <span className="text-xs text-slate-400">اقتراحات سريعة للرد:</span>
                  {lastTutorMessage.suggestedUserReplies.map((reply, i) => (
                    <button
                      key={i}
                      onClick={() => sendUserSpokenMessage(reply)}
                      className="text-xs px-2.5 py-1 rounded-lg bg-slate-700/40 hover:bg-slate-700 text-slate-300 border border-slate-700 hover:text-white transition-all"
                    >
                      {reply}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom Call Controls (Like modern mobile phone call) */}
        <div className="p-3 sm:p-5 border-t border-slate-800 bg-slate-900/90 flex items-center justify-around gap-2 sm:gap-4 pb-safe">
          {/* Mute/Unmute Mic */}
          <button
            onClick={() => {
              unlockAudio();
              setIsMuted(!isMuted);
            }}
            className={`p-3 sm:p-3.5 rounded-2xl border transition-all ${
              isMuted
                ? 'bg-rose-500/20 border-rose-500/40 text-rose-400'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
            }`}
            title={isMuted ? 'إلغاء كتم الصوت' : 'كتم الصوت'}
          >
            {isMuted ? <MicOff className="w-5 h-5 sm:w-6 sm:h-6" /> : <Mic className="w-5 h-5 sm:w-6 sm:h-6" />}
          </button>

          {/* Re-play audio button */}
          <button
            onClick={() => {
              unlockAudio();
              handleReplayCurrentAudio();
            }}
            className="p-3 sm:p-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 transition-all flex items-center gap-1"
            title="إعادة نطق الأستاذ"
          >
            <Volume2 className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>

          {/* Main Action: Speak Now / Push-to-Talk or Finish */}
          {callState === 'listening' ? (
            <button
              onClick={() => {
                unlockAudio();
                stopListeningAndSend();
              }}
              className="flex-1 max-w-[220px] py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 transition-all transform active:scale-95 animate-pulse"
            >
              <Mic className="w-5 h-5 text-slate-950" />
              <span>ساليت، صيفط ✓</span>
            </button>
          ) : callState === 'speaking' ? (
            <button
              onClick={() => {
                unlockAudio();
                globalAudioPlayer.stop();
                startListening();
              }}
              className="flex-1 max-w-[220px] py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs sm:text-sm flex items-center justify-center gap-2 border border-slate-700 transition-all"
            >
              <VolumeX className="w-4 h-4 text-slate-400" />
              <span>قاطع وتكلم</span>
            </button>
          ) : (
            <button
              onClick={() => {
                unlockAudio();
                startListening();
              }}
              disabled={callState === 'thinking'}
              className="flex-1 max-w-[220px] py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 transition-all transform active:scale-95"
            >
              <Mic className="w-5 h-5 text-slate-950" />
              <span>تكلم دابا 🎙️</span>
            </button>
          )}

          {/* End Call Button */}
          <button
            onClick={() => {
              unlockAudio();
              handleEndCall();
            }}
            className="p-3 sm:p-3.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30 transition-all transform active:scale-95"
            title="إنهاء المكالمة"
          >
            <PhoneOff className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>

        {/* Call Summary Modal / Screen */}
        {showSummary && (
          <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-xl z-20 flex flex-col items-center justify-center p-6 text-center animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mb-4 text-3xl">
              🎉
            </div>
            <h3 className="text-2xl font-bold text-white mb-1">تبارك الله عليك! مكالمة رائعة</h3>
            <p className="text-slate-400 text-sm max-w-md mb-6">
              سالينا هاد الحصة الصوتية مع {activeTutor.name}. خطوة ممتازة لكسر حاجز الخوف من التحدث بالإنجليزية!
            </p>

            <div className="grid grid-cols-3 gap-3 w-full max-w-md mb-6">
              <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700">
                <span className="block text-xl font-bold text-emerald-400 font-mono">
                  {formatDuration(callDuration)}
                </span>
                <span className="text-xs text-slate-400">مدة المكالمة</span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700">
                <span className="block text-xl font-bold text-amber-400 font-mono">
                  {conversationHistory.filter((m) => m.role === 'user').length}
                </span>
                <span className="text-xs text-slate-400">مرات التحدث</span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700">
                <span className="block text-xl font-bold text-teal-400 font-mono">
                  +{learnedCount * 10}
                </span>
                <span className="text-xs text-slate-400">نقط XP كسبتيها</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowSummary(false);
                  startCallSession();
                }}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-sm font-semibold transition-all"
              >
                عاود مكالمة أخرى
              </button>
              <button
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-sm font-bold shadow-lg shadow-emerald-500/30 transition-all"
              >
                الرجوع للصفحة الرئيسية
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
