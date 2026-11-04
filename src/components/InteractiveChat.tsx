import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Mic,
  MicOff,
  Volume2,
  Sparkles,
  BookPlus,
  Check,
  RotateCcw,
  Languages,
} from 'lucide-react';
import { ChatMessage, Scenario, TutorProfile, VocabularyItem } from '../types';
import {
  globalAudioPlayer,
  speakWithBrowser,
  LiveSpeechRecognizer,
  playSoundEffect,
} from '../utils/audio';

interface InteractiveChatProps {
  activeTutor: TutorProfile;
  activeScenario: Scenario;
  userLevel: string;
  onAddVocabulary: (vocab: VocabularyItem) => void;
  onOpenLiveCall: () => void;
}

export const InteractiveChat: React.FC<InteractiveChatProps> = ({
  activeTutor,
  activeScenario,
  userLevel,
  onAddVocabulary,
  onOpenLiveCall,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [savedWords, setSavedWords] = useState<Record<string, boolean>>({});
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const recognizerRef = useRef<LiveSpeechRecognizer | null>(null);

  // Initialize with tutor opening greeting
  useEffect(() => {
    loadInitialGreeting();
  }, [activeScenario.id, activeTutor.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const loadInitialGreeting = async () => {
    setIsLoading(true);
    const initialPrompt =
      activeScenario.id === 'free_chat'
        ? `سلام أستاذي ${activeTutor.name}، أنا هنا بغيت نتعلم الإنجليزية بالدارجة!`
        : `أنا باغي نتدرب على سيناريو: "${activeScenario.title}". ${activeScenario.starterPrompt}`;

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: initialPrompt }],
          scenario: activeScenario,
          userLevel,
          tutorGender: activeTutor.gender,
        }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        const botMsg: ChatMessage = {
          id: String(Date.now()),
          role: 'assistant',
          timestamp: Date.now(),
          content: data.data.darijaResponse,
          darijaResponse: data.data.darijaResponse,
          englishPhrase: data.data.englishPhrase,
          phoneticArabic: data.data.phoneticArabic,
          phoneticEnglish: data.data.phoneticEnglish,
          darijaExplanation: data.data.darijaExplanation,
          vocabulary: data.data.vocabulary,
          encouragement: data.data.encouragement,
          suggestedUserReplies: data.data.suggestedUserReplies,
        };
        setMessages([botMsg]);
      }
    } catch (e) {
      console.error('Initial chat load error:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputText;
    if (!text.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: String(Date.now()),
      role: 'user',
      timestamp: Date.now(),
      content: text,
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInputText('');
    setIsLoading(true);

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

      const data = await res.json();
      if (data.success && data.data) {
        const botMsg: ChatMessage = {
          id: String(Date.now() + 1),
          role: 'assistant',
          timestamp: Date.now(),
          content: data.data.darijaResponse,
          darijaResponse: data.data.darijaResponse,
          englishPhrase: data.data.englishPhrase,
          phoneticArabic: data.data.phoneticArabic,
          phoneticEnglish: data.data.phoneticEnglish,
          darijaExplanation: data.data.darijaExplanation,
          vocabulary: data.data.vocabulary,
          encouragement: data.data.encouragement,
          suggestedUserReplies: data.data.suggestedUserReplies,
        };
        setMessages((prev) => [...prev, botMsg]);
        playSoundEffect('ding');
      }
    } catch (e) {
      console.error('Chat error:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleVoiceInput = () => {
    if (isRecording) {
      if (recognizerRef.current) recognizerRef.current.stop();
      setIsRecording(false);
      return;
    }

    if (typeof window !== 'undefined') {
      const rec = new LiveSpeechRecognizer();
      rec.setLang('ar-MA'); // Listen to Darija
      recognizerRef.current = rec;

      rec.onResultCallback = (res) => {
        setInputText(res.transcript);
        if (res.isFinal && res.transcript.trim()) {
          setIsRecording(false);
          handleSendMessage(res.transcript.trim());
        }
      };

      rec.onErrorCallback = () => {
        setIsRecording(false);
      };

      rec.onEndCallback = () => {
        setIsRecording(false);
      };

      const ok = rec.start();
      if (ok) {
        setIsRecording(true);
      }
    }
  };

  const handlePlayAudio = async (text: string, lang = 'en') => {
    // Immediate instant playback with browser for zero waiting time
    try {
      await speakWithBrowser(text, lang === 'en' ? 'en-US' : 'ar-SA', 0.9);
    } catch {
      // Fallback to server TTS if browser speech fails
      try {
        const res = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text,
            voice: activeTutor.voiceName,
            lang,
          }),
        });
        const data = await res.json();
        if (data.success && data.audioBase64) {
          await globalAudioPlayer.playBase64(data.audioBase64, 'audio/wav');
        }
      } catch (e) {
        console.warn('TTS playback error:', e);
      }
    }
  };

  const handleSaveWord = (vocab: { english: string; darija: string; pronunciation?: string }) => {
    onAddVocabulary({
      id: `v-${Date.now()}-${vocab.english}`,
      english: vocab.english,
      darija: vocab.darija,
      phonetic: vocab.pronunciation,
      dateAdded: Date.now(),
    });
    setSavedWords((prev) => ({ ...prev, [vocab.english]: true }));
    playSoundEffect('ding');
  };

  return (
    <div className="w-full max-w-4xl mx-auto h-[78vh] flex flex-col bg-slate-900/80 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden backdrop-blur-xl">
      {/* Top Chat Bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-2xl">
            {activeTutor.avatar}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-white text-sm sm:text-base">{activeTutor.name}</h3>
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                {activeScenario.title}
              </span>
            </div>
            <p className="text-xs text-slate-400">سول بالدارجة، وهو يشرح ويعلمك بالصوت والترجمة</p>
          </div>
        </div>

        <button
          onClick={onOpenLiveCall}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs sm:text-sm shadow-lg shadow-emerald-500/20 transition-all transform hover:scale-105"
        >
          <Mic className="w-4 h-4" />
          <span>مكالمة صوتية مباشرة</span>
        </button>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';

          if (isUser) {
            return (
              <div key={msg.id} className="flex justify-start">
                <div className="max-w-[85%] sm:max-w-[70%] bg-emerald-600 text-white rounded-2xl rounded-tr-sm px-4 py-3 shadow-md">
                  <p className="text-sm sm:text-base font-normal leading-relaxed">{msg.content}</p>
                </div>
              </div>
            );
          }

          return (
            <div key={msg.id} className="flex justify-end gap-3">
              <div className="max-w-[92%] sm:max-w-[80%] bg-slate-800/90 border border-slate-700/80 rounded-2xl rounded-tl-sm p-4 sm:p-5 shadow-lg space-y-3">
                {/* Darija conversational text */}
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm sm:text-base text-slate-100 leading-relaxed font-normal">
                    {msg.darijaResponse}
                  </p>
                  <button
                    onClick={() => handlePlayAudio(msg.englishPhrase || msg.darijaResponse || '')}
                    title="تشغيل الصوت"
                    className="p-1.5 rounded-lg bg-slate-700 hover:bg-emerald-500/20 hover:text-emerald-400 text-slate-300 transition-all flex-shrink-0"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Target English Phrase */}
                {msg.englishPhrase && (
                  <div className="p-3.5 rounded-xl bg-slate-950/70 border border-emerald-500/30">
                    <div className="flex items-center justify-between text-xs text-emerald-400 font-semibold mb-1">
                      <span>🇬🇧 بالإنجليزية:</span>
                      {msg.phoneticArabic && (
                        <span className="text-slate-300 bg-slate-800 px-2 py-0.5 rounded-md">
                          نطقها: {msg.phoneticArabic}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-1">
                      <p className="font-latin text-base sm:text-lg font-bold text-white tracking-wide">
                        "{msg.englishPhrase}"
                      </p>
                      <button
                        onClick={() => handlePlayAudio(msg.englishPhrase!, 'en')}
                        className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-slate-950 text-xs font-bold transition-all flex items-center gap-1 flex-shrink-0"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                        نطق
                      </button>
                    </div>

                    {msg.darijaExplanation && (
                      <p className="text-xs text-slate-400 mt-2 border-t border-slate-800 pt-2">
                        💡 {msg.darijaExplanation}
                      </p>
                    )}
                  </div>
                )}

                {/* Vocabulary items */}
                {msg.vocabulary && msg.vocabulary.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <span className="text-xs text-slate-400">كلمات للحفظ:</span>
                    {msg.vocabulary.map((vocab, i) => (
                      <button
                        key={i}
                        onClick={() => handleSaveWord(vocab)}
                        className={`text-xs px-2.5 py-1 rounded-lg border flex items-center gap-1 transition-all ${
                          savedWords[vocab.english]
                            ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                            : 'bg-slate-700/60 border-slate-600 text-slate-200 hover:bg-slate-700'
                        }`}
                      >
                        <span className="font-latin font-bold">{vocab.english}</span>
                        <span className="text-slate-400">({vocab.darija})</span>
                        {savedWords[vocab.english] ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <BookPlus className="w-3 h-3 text-emerald-400" />
                        )}
                      </button>
                    ))}
                  </div>
                )}

                {/* Suggested User replies */}
                {msg.suggestedUserReplies && msg.suggestedUserReplies.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-700/50">
                    <span className="text-xs text-slate-400">اقتراحات للرد:</span>
                    {msg.suggestedUserReplies.map((reply, i) => (
                      <button
                        key={i}
                        onClick={() => handleSendMessage(reply)}
                        className="text-xs px-2.5 py-1 rounded-lg bg-slate-700/50 hover:bg-emerald-500/20 hover:text-emerald-300 text-slate-300 border border-slate-600/50 transition-all"
                      >
                        {reply}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex justify-end">
            <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-4 flex items-center gap-3 text-slate-400 text-sm animate-pulse">
              <Sparkles className="w-4 h-4 text-emerald-400 animate-spin" />
              <span>{activeTutor.name} كيفكر وكيوجد الجواب...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Bottom Input Area */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/60">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2"
        >
          {/* Voice Input button */}
          <button
            type="button"
            onClick={handleToggleVoiceInput}
            title={isRecording ? 'إيقاف التسجيل' : 'التحدث بالصوت بالدارجة'}
            className={`p-3 rounded-2xl border transition-all ${
              isRecording
                ? 'bg-rose-500 text-white animate-pulse border-rose-400'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border-slate-700'
            }`}
          >
            {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5 text-emerald-400" />}
          </button>

          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={
              isRecording
                ? 'كنسمعك دابا... تكلم بالدارجة'
                : 'كتب أو سول بالدارجة (مثلا: كيفاش نقول عفاك بغيت طاكسي؟)...'
            }
            className="flex-1 bg-slate-800/70 border border-slate-700 rounded-2xl px-4 py-3 text-sm sm:text-base text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-all"
          />

          <button
            type="submit"
            disabled={!inputText.trim() || isLoading}
            className="p-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 font-bold transition-all shadow-md"
          >
            <Send className="w-5 h-5 rotate-180" />
          </button>
        </form>
      </div>
    </div>
  );
};
