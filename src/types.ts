export interface Term {
  id: string;
  term: string;
  category: string;
  definition: string;
  function: string;
  related_terms: string[];
  confusion_terms: string[];
  example: string;
  keyword_hint: string;
}

export interface WrongQuestion {
  termId: string;
  wrongAnswer: string;
  correctAnswer: string;
  errorCount: number;
  lastErrorTime: number;
}

export interface UserData {
  wrongQuestions: Record<string, WrongQuestion>;
  masteryLevels: Record<string, number>; // 0-3
  practiceHistory: {
    date: string;
    score: number;
    total: number;
  }[];
  customTerms: Term[];
}

export type View = 'dashboard' | 'practice' | 'error-book' | 'glossary' | 'upload';
export type PracticeMode = 'term-to-function' | 'function-to-term' | 'term-to-category';
