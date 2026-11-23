/* Data types for the base learning data (ported from js/data.js). */

export interface KanjiExample {
  word: string;
  reading?: string;
  meaning?: string;
}

export interface Kanji {
  id: string;
  kanji: string;
  on?: string[];
  kun?: string;
  meaning?: string;   /* Myanmar meaning */
  en?: string;
  chapter?: number;
  chapterTitle?: string;
  level?: string;
  examples?: KanjiExample[];
  img?: string;
}

export interface Vocab {
  id: string;
  jp: string;
  rd?: string;        /* reading (kana) */
  romaji?: string;
  en?: string;
  mm?: string;        /* Myanmar meaning */
  cat?: string;
  syn?: string;
  ant?: string;
  chapter?: number;
  chapterTitle?: string;
  level?: string;
  lesson?: number;
}

export interface GrammarExample {
  jp: string;
  rd?: string;
  en?: string;
}

export interface GrammarExercise {
  q: string;
  opts: string[];
  ans: number;
}

export interface Grammar {
  id: string;
  title: string;
  pattern?: string;
  meaning?: string;
  explanation?: string;
  mm?: string;
  lesson?: number;
  chapter?: number;
  chapterTitle?: string;
  level?: string;
  examples?: GrammarExample[];
  exercises?: GrammarExercise[];
}

export interface Sentence {
  id?: string; /* base sentences carry no id (as in the original data.js); merged() assigns stable synthetic ones */
  jp: string;
  rd?: string;
  en?: string;
  mm?: string;
  cat?: string;
  chapter?: number;
  chapterTitle?: string;
  level?: string;
}

/* A user-built test: kind 'quiz' (q/opts/ans) or 'deck' (front/back flashcards). */
export interface UserTest {
  id: string;
  title: string;
  kind?: 'quiz' | 'deck';
  level?: string;
  chapter?: number;
  items: any[];
}

/* ---------- user store (localStorage 'jl_user_v1', same shape as the original site) ---------- */

export interface KindStore {
  added: any[];
  edited: Record<string, any>;
  deleted: Record<string, boolean>;
}

export interface FileMeta {
  id: string;
  name: string;
  type?: string;
  cat?: string;
  size?: number;
  added?: string;
}

export interface UserRecord {
  kanji?: KindStore;
  vocab?: KindStore;
  grammar?: KindStore;
  sentences?: KindStore;
  tests?: KindStore;
  files?: { added: FileMeta[]; trashed?: FileMeta[] };
  prefs?: Record<string, any>;
  _sync?: { at: number; dev?: string };
}

export interface QuizItem {
  q: string;
  opts: string[];
  ans: number;
  note?: string;
  say?: string;
}

export interface Flashcard {
  front: string;
  back: string;
  say?: string;
}
