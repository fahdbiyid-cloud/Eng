import React, { useState, useEffect } from 'react';
import {
  HelpCircle,
  Volume2,
  CheckCircle2,
  XCircle,
  Sparkles,
  RotateCcw,
  Award,
  Zap,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { QuizQuestion } from '../types';
import { speakWithBrowser, playSoundEffect } from '../utils/audio';

export const VoiceQuiz: React.FC = () => {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isQuizCompleted, setIsQuizCompleted] = useState(false);

  // Default fallback questions in case API is loading or network is slow
  const DEFAULT_QUESTIONS: QuizQuestion[] = [
    {
      id: 'q1',
      questionDarija: 'يلا كنتي فـ مطعم وبغيتي تطلب الحساب بكل أدب، شنو تقول بالإنجليزية؟',
      situation: 'أنت في مطعم وساليتي الماكلة وبغيتي تخلص',
      targetEnglish: 'Could we have the bill, please?',
      options: [
        'Give me the money now!',
        'Could we have the bill, please?',
        'I am paying food today.',
        'Where is the kitchen?',
      ],
      correctAnswerIndex: 1,
      explanationDarija: 'العبارة "Could we have the bill, please?" هي الطريقة الأكثر أدباً واحتراماً لطلب الحساب.',
      phoneticGuide: 'كود وي هاف ذا بِل بليز؟',
    },
    {
      id: 'q2',
      questionDarija: 'صاحبك سولك كيف داير نهارك وبغيتي تجاوبو: "كلشي غادي مزيان تبارك الله"، شنو تقول؟',
      situation: 'تحية ودردشة يومية',
      targetEnglish: 'Everything is going great, thank you!',
      options: [
        'Everything is going great, thank you!',
        'I am not here today.',
        'No problem for anything.',
        'What is your name friend?',
      ],
      correctAnswerIndex: 0,
      explanationDarija: '"Everything is going great" كتعني كولشي غادي ممتاز وبأفضل حال!',
      phoneticGuide: 'إيفريثينڭ إز ڭوينڭ ڭريت، ثانك يو!',
    },
    {
      id: 'q3',
      questionDarija: 'فالمطار، ضاعت ليك حقيبة وبغيتي تسول موظف الاستعلامات: "فين مكتب الأمتعة المفقودة؟"',
      situation: 'فالمطار بعد الوصول',
      targetEnglish: 'Where is the lost and found office?',
      options: [
        'How many bags do you have?',
        'I lost my airplane ticket.',
        'Where is the lost and found office?',
        'Can I take a taxi here?',
      ],
      correctAnswerIndex: 2,
      explanationDarija: '"Lost and found" هو المصطلح المستعمل عالمياً للأمتعة والأشياء المفقودة.',
      phoneticGuide: 'وير إز ذا لوست آند فاونـد أوفيس؟',
    },
    {
      id: 'q4',
      questionDarija: 'فمقابلة عمل، بغيتي تقول: "أنا كنتعلم بسرعة وكنخدم مزيان مع الفريق"، شنو العبارة الاحترافية؟',
      situation: 'مقابلة عمل (Job Interview)',
      targetEnglish: 'I am a fast learner and a great team player.',
      options: [
        'I like to work alone always.',
        'I am a fast learner and a great team player.',
        'I don’t know anything yet.',
        'My salary must be very high.',
      ],
      correctAnswerIndex: 1,
      explanationDarija: '"Fast learner" (كنتعلم دغيا) و "Team player" (كنسجم مع الفريق) من أهم العبارات فالمقابلات.',
      phoneticGuide: 'آي آم أ فاست لورنر آند أ ڭريت تيم بلاير.',
    },
  ];

  useEffect(() => {
    loadQuiz();
  }, []);

  const loadQuiz = async () => {
    setIsLoading(true);
    setIsQuizCompleted(false);
    setCurrentIndex(0);
    setScore(0);
    setSelectedOption(null);
    setIsAnswerSubmitted(false);

    try {
      const res = await fetch('/api/quiz/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: 'daily_conversation', level: 'beginner' }),
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.questions) && data.questions.length > 0) {
        setQuestions(data.questions);
      } else {
        setQuestions(DEFAULT_QUESTIONS);
      }
    } catch (e) {
      setQuestions(DEFAULT_QUESTIONS);
    } finally {
      setIsLoading(false);
    }
  };

  const currentQ = questions[currentIndex] || DEFAULT_QUESTIONS[0];

  const handleSelectOption = (idx: number) => {
    if (isAnswerSubmitted) return;
    setSelectedOption(idx);
    playSoundEffect('click');
  };

  const handleSubmitAnswer = () => {
    if (selectedOption === null || isAnswerSubmitted) return;

    setIsAnswerSubmitted(true);
    const isCorrect = selectedOption === currentQ.correctAnswerIndex;

    if (isCorrect) {
      playSoundEffect('success');
      setScore((prev) => prev + 1);
    } else {
      playSoundEffect('ding');
    }
  };

  const handleNextQuestion = () => {
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedOption(null);
      setIsAnswerSubmitted(false);
    } else {
      setIsQuizCompleted(true);
      playSoundEffect('success');
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between bg-slate-900/80 border border-slate-800 p-5 rounded-3xl backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <span className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
            <Zap className="w-5 h-5" />
          </span>
          <div>
            <h2 className="text-xl font-bold text-white">اختبار التحدث والذكاء السريع</h2>
            <p className="text-xs text-slate-400">أسئلة بمواقف مغربية يومية وشرح مبسط بالدارجة</p>
          </div>
        </div>

        {!isQuizCompleted && (
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400">السؤال:</span>
            <span className="px-3 py-1 rounded-xl bg-slate-800 text-amber-400 font-mono font-bold border border-slate-700">
              {currentIndex + 1} / {questions.length}
            </span>
          </div>
        )}
      </div>

      {/* Main Card */}
      {!isQuizCompleted ? (
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
          {/* Situation & Question in Darija */}
          <div className="space-y-3">
            {currentQ.situation && (
              <span className="inline-block text-xs px-3 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                الموقف: {currentQ.situation}
              </span>
            )}
            <h3 className="text-lg sm:text-xl font-bold text-white leading-relaxed">
              {currentQ.questionDarija}
            </h3>
          </div>

          {/* Options */}
          <div className="space-y-3">
            {currentQ.options.map((option, idx) => {
              const isSelected = selectedOption === idx;
              const isCorrect = idx === currentQ.correctAnswerIndex;

              let style = 'bg-slate-800/80 border-slate-700 text-slate-200 hover:bg-slate-800';

              if (isAnswerSubmitted) {
                if (isCorrect) {
                  style = 'bg-emerald-500/20 border-emerald-500/60 text-emerald-300 ring-1 ring-emerald-500/40';
                } else if (isSelected) {
                  style = 'bg-rose-500/20 border-rose-500/60 text-rose-300';
                } else {
                  style = 'bg-slate-800/40 border-slate-800 text-slate-500 opacity-60';
                }
              } else if (isSelected) {
                style = 'bg-emerald-500/20 border-emerald-500/50 text-white ring-1 ring-emerald-500/30';
              }

              return (
                <div
                  key={idx}
                  onClick={() => handleSelectOption(idx)}
                  className={`p-4 rounded-2xl border flex items-center justify-between gap-3 cursor-pointer transition-all ${style}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-lg bg-slate-700/60 flex items-center justify-center text-xs font-mono font-bold text-slate-300">
                      {String.fromCharCode(65 + idx)}
                    </span>
                    <span className="font-latin text-base font-semibold">{option}</span>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      speakWithBrowser(option, 'en-US', 0.85);
                    }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400"
                    title="استمع للنطق"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Explanation in Darija when answered */}
          {isAnswerSubmitted && (
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2 animate-fade-in">
              <div className="flex items-center gap-2 text-sm font-bold">
                {selectedOption === currentQ.correctAnswerIndex ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    <span className="text-emerald-300">تبارك الله عليك! جواب صحيح 100%</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-5 h-5 text-rose-400" />
                    <span className="text-rose-300">معليش، شوف الشرح باش تفهم مزيان:</span>
                  </>
                )}
              </div>
              <p className="text-sm text-slate-300 leading-relaxed">
                💡 {currentQ.explanationDarija}
              </p>
              {currentQ.phoneticGuide && (
                <p className="text-xs text-emerald-400 pt-1">
                  نطق الجملة الصحيحة بالدارجة: {currentQ.phoneticGuide}
                </p>
              )}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            {!isAnswerSubmitted ? (
              <button
                onClick={handleSubmitAnswer}
                disabled={selectedOption === null}
                className="px-6 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 font-bold text-sm shadow-md shadow-emerald-500/20 transition-all"
              >
                تأكيد الجواب
              </button>
            ) : (
              <button
                onClick={handleNextQuestion}
                className="px-6 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm shadow-md shadow-emerald-500/20 transition-all"
              >
                {currentIndex + 1 < questions.length ? 'السؤال التالي ←' : 'شوف النتيجة النهائية 🏆'}
              </button>
            )}
          </div>
        </div>
      ) : (
        /* Final Score Screen */
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-8 shadow-2xl text-center space-y-6">
          <div className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto text-4xl shadow-lg">
            🏆
          </div>

          <div>
            <h3 className="text-2xl font-bold text-white mb-1">نتيجة الكويز السريع</h3>
            <p className="text-slate-400 text-sm">
              جبتي {score} من {questions.length} أسئلة صحيحة!
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 max-w-sm mx-auto">
            <span className="text-3xl font-extrabold text-emerald-400 font-mono">
              {Math.round((score / questions.length) * 100)}%
            </span>
            <span className="block text-xs text-slate-400 mt-1">
              {score === questions.length
                ? 'علامة كاملة! راك ناضي فـ هاد السيناريوهات.'
                : score >= questions.length / 2
                ? 'مستوى ممتاز، مع الاستمرار غاتولي تهدر بطلاقة!'
                : 'بداية مزيانة، عاود جرب الكويز باش تركز الكلمات فبالك.'}
            </span>
          </div>

          <div className="flex items-center justify-center gap-3">
            <button
              onClick={loadQuiz}
              className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold border border-slate-700"
            >
              عاود كويز جديد ↺
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
