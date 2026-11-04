export type LearningLevel = 'beginner' | 'intermediate' | 'advanced';

export type TutorGender = 'male' | 'female';

export interface TutorProfile {
  id: string;
  name: string;
  title: string;
  gender: TutorGender;
  voiceName: string; // 'Puck' | 'Kore' | 'Fenrir' | 'Zephyr'
  avatar: string;
  description: string;
  accent: string;
}

export interface Scenario {
  id: string;
  title: string;
  titleEn: string;
  icon: string;
  badge: string;
  description: string;
  aiRole: string;
  userGoal: string;
  starterPrompt: string;
  samplePhrases: { english: string; darija: string; phonetic: string }[];
}

export interface VocabularyItem {
  id: string;
  english: string;
  darija: string;
  phonetic?: string;
  exampleEn?: string;
  exampleDarija?: string;
  dateAdded: number;
  mastered?: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  timestamp: number;
  content: string; // The primary message content
  darijaResponse?: string;
  englishPhrase?: string;
  phoneticArabic?: string;
  phoneticEnglish?: string;
  darijaExplanation?: string;
  vocabulary?: { english: string; darija: string; pronunciation?: string }[];
  encouragement?: string;
  suggestedUserReplies?: string[];
  audioBase64?: string;
}

export interface PronunciationResult {
  score: number;
  rating: string;
  heardText: string;
  darijaFeedback: string;
  pronunciationTips?: string[];
  encouragement?: string;
}

export interface QuizQuestion {
  id: string;
  questionDarija: string;
  situation?: string;
  targetEnglish?: string;
  options: string[];
  correctAnswerIndex: number;
  explanationDarija: string;
  phoneticGuide?: string;
}
