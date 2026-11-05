import React, { useState } from 'react';
import {
  BookOpen,
  Volume2,
  Plus,
  Search,
  CheckCircle2,
  RotateCw,
  Sparkles,
  Layers,
  Trash2,
} from 'lucide-react';
import { VocabularyItem } from '../types';
import { speakWithBrowser, playSoundEffect, unlockAudio } from '../utils/audio';

interface VocabularyBookProps {
  vocabularyList: VocabularyItem[];
  onAddVocabulary: (vocab: VocabularyItem) => void;
  onToggleMastered: (id: string) => void;
  onDeleteWord: (id: string) => void;
}

export const VocabularyBook: React.FC<VocabularyBookProps> = ({
  vocabularyList,
  onAddVocabulary,
  onToggleMastered,
  onDeleteWord,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'mastered' | 'learning'>('all');
  const [isFlashcardMode, setIsFlashcardMode] = useState(false);
  const [currentFlashcardIndex, setCurrentFlashcardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form states for adding word
  const [newEnglish, setNewEnglish] = useState('');
  const [newDarija, setNewDarija] = useState('');
  const [newPhonetic, setNewPhonetic] = useState('');
  const [newExampleEn, setNewExampleEn] = useState('');

  const filteredList = vocabularyList.filter((item) => {
    const matchesSearch =
      item.english.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.darija.includes(searchQuery) ||
      (item.phonetic && item.phonetic.includes(searchQuery));

    if (!matchesSearch) return false;
    if (filterMode === 'mastered') return !!item.mastered;
    if (filterMode === 'learning') return !item.mastered;
    return true;
  });

  const handleAddNewWord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEnglish.trim() || !newDarija.trim()) return;

    onAddVocabulary({
      id: `v-${Date.now()}`,
      english: newEnglish.trim(),
      darija: newDarija.trim(),
      phonetic: newPhonetic.trim() || undefined,
      exampleEn: newExampleEn.trim() || undefined,
      dateAdded: Date.now(),
      mastered: false,
    });

    setNewEnglish('');
    setNewDarija('');
    setNewPhonetic('');
    setNewExampleEn('');
    setShowAddModal(false);
    playSoundEffect('success');
  };

  const handleNextFlashcard = () => {
    setIsFlipped(false);
    setCurrentFlashcardIndex((prev) => (prev + 1) % filteredList.length);
    playSoundEffect('click');
  };

  const handlePrevFlashcard = () => {
    setIsFlipped(false);
    setCurrentFlashcardIndex((prev) => (prev - 1 + filteredList.length) % filteredList.length);
    playSoundEffect('click');
  };

  const currentCard = filteredList[currentFlashcardIndex] || filteredList[0];

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 p-6 rounded-3xl backdrop-blur-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
              <BookOpen className="w-5 h-5" />
            </span>
            <h2 className="text-xl sm:text-2xl font-bold text-white">قاموسي وعباراتي اليومية</h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-400">
            كل الكلمات والعبارات اللي كتعلمها مع الأستاذ كتحفظ هنا مع النطق الصوتي ومعناها بالدارجة.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsFlashcardMode(!isFlashcardMode)}
            className={`px-3.5 py-2 rounded-xl border text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-all ${
              isFlashcardMode
                ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md'
                : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>{isFlashcardMode ? 'عرض كقائمة' : 'وضع البطاقات (Flashcards)'}</span>
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs sm:text-sm flex items-center gap-1.5 shadow-md shadow-emerald-500/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة كلمة</span>
          </button>
        </div>
      </div>

      {/* Flashcard Mode */}
      {isFlashcardMode && filteredList.length > 0 && currentCard && (
        <div className="bg-slate-900/90 border border-slate-800 p-8 rounded-3xl shadow-xl flex flex-col items-center justify-center min-h-[360px] text-center relative overflow-hidden">
          <span className="text-xs text-slate-400 mb-4 block">
            بطاقة {currentFlashcardIndex + 1} من {filteredList.length} (اضغط على البطاقة لقلبها)
          </span>

          {/* Flipped Card */}
          <div
            onClick={() => setIsFlipped(!isFlipped)}
            className="w-full max-w-lg min-h-[220px] p-6 rounded-2xl bg-gradient-to-br from-slate-950 to-slate-900 border border-slate-700 flex flex-col items-center justify-center cursor-pointer shadow-inner hover:border-emerald-500/50 transition-all select-none"
          >
            {!isFlipped ? (
              <div className="space-y-3">
                <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
                  English Phrase
                </span>
                <h3 className="font-latin text-3xl font-extrabold text-white tracking-wide">
                  {currentCard.english}
                </h3>
                {currentCard.phonetic && (
                  <span className="inline-block text-xs text-emerald-300 bg-emerald-950/60 border border-emerald-500/30 px-3 py-1 rounded-full">
                    النطق بالدارجة: {currentCard.phonetic}
                  </span>
                )}
                <div className="pt-2">
                  <span className="text-xs text-slate-500">اضغط باش تشوف المعنى بالدارجة ↺</span>
                </div>
              </div>
            ) : (
              <div className="space-y-3 animate-fade-in">
                <span className="text-xs uppercase tracking-wider text-emerald-400 font-semibold">
                  المعنى بالدارجة المغربية
                </span>
                <h3 className="text-2xl sm:text-3xl font-bold text-emerald-300">
                  {currentCard.darija}
                </h3>
                {currentCard.exampleEn && (
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 mt-2">
                    <p className="font-latin font-medium">"{currentCard.exampleEn}"</p>
                    {currentCard.exampleDarija && (
                      <p className="text-slate-400 mt-1">{currentCard.exampleDarija}</p>
                    )}
                  </div>
                )}
                <div className="pt-2">
                  <span className="text-xs text-slate-500">اضغط لقلب البطاقة مرة أخرى ↺</span>
                </div>
              </div>
            )}
          </div>

          {/* Flashcard Action Bar */}
          <div className="flex items-center gap-4 mt-6">
            <button
              onClick={handlePrevFlashcard}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700"
            >
              السابقة
            </button>
            <button
              onClick={() => speakWithBrowser(currentCard.english, 'en-US', 0.85)}
              className="p-3 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md"
              title="استمع للنطق"
            >
              <Volume2 className="w-5 h-5" />
            </button>
            <button
              onClick={handleNextFlashcard}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700"
            >
              التالية
            </button>
          </div>
        </div>
      )}

      {/* Normal List View */}
      {(!isFlashcardMode || filteredList.length === 0) && (
        <div className="space-y-4">
          {/* Search & Filters */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث بالإنجليزية أو بالدارجة..."
                className="w-full bg-slate-900/80 border border-slate-800 rounded-2xl pr-10 pl-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex items-center gap-1.5 w-full sm:w-auto">
              {(['all', 'learning', 'mastered'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setFilterMode(mode)}
                  className={`flex-1 sm:flex-none px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                    filterMode === mode
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:bg-slate-800'
                  }`}
                >
                  {mode === 'all' ? 'الكل' : mode === 'learning' ? 'قيد التعلم' : 'تم الحفظ ✓'}
                </button>
              ))}
            </div>
          </div>

          {/* Items Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredList.map((item) => (
              <div
                key={item.id}
                className="bg-slate-900/70 border border-slate-800 hover:border-slate-700 p-4 rounded-2xl flex flex-col justify-between transition-all"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <h4 className="font-latin text-lg font-bold text-white tracking-wide">
                      {item.english}
                    </h4>
                    {item.phonetic && (
                      <span className="text-xs text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-md inline-block mt-1">
                        نطقها: {item.phonetic}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => speakWithBrowser(item.english, 'en-US', 0.85)}
                      title="استمع للنطق"
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-emerald-500/20 hover:text-emerald-400 text-slate-400 transition-all"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onToggleMastered(item.id)}
                      title={item.mastered ? 'تم الحفظ' : 'تحديد كمحفوظ'}
                      className={`p-1.5 rounded-lg transition-all ${
                        item.mastered
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-slate-800 text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDeleteWord(item.id)}
                      title="حذف الكلمة"
                      className="p-1.5 rounded-lg bg-slate-800 text-slate-500 hover:text-rose-400 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800/80">
                  <p className="text-sm font-semibold text-emerald-300">{item.darija}</p>
                  {item.exampleEn && (
                    <p className="font-latin text-xs text-slate-400 mt-1 italic">
                      "{item.exampleEn}"
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {filteredList.length === 0 && (
            <div className="text-center py-12 bg-slate-900/40 rounded-3xl border border-slate-800/60 p-6">
              <BookOpen className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400 text-sm">ما كاين حتى كلمة مطابقة لبحثك.</p>
              <button
                onClick={() => setShowAddModal(true)}
                className="mt-3 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs font-bold"
              >
                + ضيف كلمة جديدة دابا
              </button>
            </div>
          )}
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-4">إضافة كلمة أو عبارة جديدة</h3>

            <form onSubmit={handleAddNewWord} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">الكلمة بالإنجليزية (English):</label>
                <input
                  type="text"
                  required
                  value={newEnglish}
                  onChange={(e) => setNewEnglish(e.target.value)}
                  placeholder="e.g. Magnificent, Take your time"
                  className="w-full font-latin bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">المعنى بالدارجة المغربية:</label>
                <input
                  type="text"
                  required
                  value={newDarija}
                  onChange={(e) => setNewDarija(e.target.value)}
                  placeholder="مثلا: خد وقتك، على خاطرك"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">طريقة النطق بالدارجة (اختياري):</label>
                <input
                  type="text"
                  value={newPhonetic}
                  onChange={(e) => setNewPhonetic(e.target.value)}
                  placeholder="مثلا: تيك يور تايم"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">مثال في جملة بالإنجليزية (اختياري):</label>
                <input
                  type="text"
                  value={newExampleEn}
                  onChange={(e) => setNewExampleEn(e.target.value)}
                  placeholder="e.g. Please take your time, no rush!"
                  className="w-full font-latin bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold shadow-md shadow-emerald-500/20"
                >
                  حفظ الكلمة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
