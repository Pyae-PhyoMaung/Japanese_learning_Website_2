'use client';

/* Home — port of index.html: hero with the site introduction, live counts
   for the current JLPT level, and the session cards into every part of the
   app (same order and texts as the original). */
import * as React from 'react';
import Link from 'next/link';
import { byLevel, kanjiList, vocabList, grammarList, sentenceList, merged, useJL } from '@/lib/jl';
import { LevelBar } from '@/components/level-bar';
import { useT } from '@/components/providers';

/* same sessions (order + texts) as index.html — plus Cardboard */
const SESSIONS = [
  { href: '/textbook', icon: '📖', title: 'My Library', desc: 'Read the complete Minna no Nihongo N5 (Myanmar translation) and N5 Kanji Master books — plus all the files you upload: PDFs, images, videos and audio.', go: 'Open library →' },
  { href: '/learn', icon: '🎯', title: 'Learn Selected & Chapters', desc: 'Check kanji and words on their pages, then study just those — or learn a whole chapter. Meanings are revealed only when you ask.', go: 'Start learning →' },
  { href: '/kanji', icon: '漢', title: 'Kanji Learning & Practice', desc: 'Browse kanji with readings, meanings and example words. Listen, flashcards and quizzes.', go: 'Learn kanji →' },
  { href: '/write', icon: '✍️', title: 'Writing Practice', desc: 'Practice writing kanji and whole words by chapter on a guided grid — trace the guide or hide it to test yourself.', go: 'Start writing →' },
  { href: '/vocab', icon: '語', title: 'Vocabulary Learning & Practice', desc: 'Study the word list with Japanese, readings and meanings. Listen to every word, then practice with flashcards and quizzes.', go: 'Learn words →' },
  { href: '/dictionary', icon: '辞', title: 'Dictionary', desc: 'Look up any word in English, Japanese or Myanmar — meanings, example sentences, synonyms and antonyms when available.', go: 'Open dictionary →' },
  { href: '/kana', icon: 'あア', title: 'Kana — Hiragana & Katakana', desc: 'All hiragana and katakana in one place: tap a kana to read it, hear it and write it on the practice grid.', go: 'Open kana →' },
  { href: '/grammar', icon: '文', title: 'Grammar Learning & Exercises', desc: 'Grammar points from です to つもりです, each with examples and interactive exercises.', go: 'Learn grammar →' },
  { href: '/listening', icon: '🎧', title: 'Listening Session', desc: 'Listen to words and sentences with adjustable speed, plus dictation practice.', go: 'Start listening →' },
  { href: '/tests', icon: '📝', title: 'Practice Tests', desc: 'Flashcards, quizzes on kanji/vocab/grammar, and your own custom tests and flashcard decks.', go: 'Take tests →' },
  { href: '/files', icon: '🗂️', title: 'My Files', desc: 'Upload and manage your own PDFs, images, documents, videos and audio — uploaded PDFs appear in the Library reader, images, videos and audio play right there too.', go: 'Open files →' },
  { href: '/partner', icon: '🤝', title: 'Study Partner', desc: 'Ask your study companion for word meanings, kanji details, random words and quick quizzes from your books.', go: 'Chat now →' },
  { href: '/edit', icon: '⚙️', title: 'Add / Edit Content', desc: 'Add your own vocabulary, grammar, kanji and practice tests — or edit the existing entries.', go: 'Open editor →' },
  { href: '/board', icon: '📌', title: 'Cardboard History', desc: 'Pin tasks to plan, finish them, and look back on what you did.', go: 'Open board →' },
];

export default function HomePage() {
  useJL();
  const { t } = useT();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const counts = mounted
    ? {
        kanji: byLevel(kanjiList()).length,
        vocab: byLevel(vocabList()).length,
        grammar: byLevel(grammarList()).length,
        sentences: byLevel(sentenceList()).length,
        tests: byLevel(merged('tests')).length,
      }
    : { kanji: 0, vocab: 0, grammar: 0, sentences: 0, tests: 0 };

  /* same stat labels as index.html */
  const stats = [
    { id: 'kanji', label: 'Kanji entries' },
    { id: 'vocab', label: 'Vocabulary words' },
    { id: 'grammar', label: 'Grammar points' },
    { id: 'sentences', label: 'Listening sentences' },
    { id: 'tests', label: 'Your custom tests' },
  ];

  return (
    <div>
      {/* hero — like the original .hero block */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-6 rounded-2xl border bg-card p-8 shadow-sm">
        <div className="max-w-2xl">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{t('Learn Japanese, your way')} 🌸</h1>
          <p className="mt-3 text-muted-foreground">
            {t('Choose your JLPT level above, then read the textbook, learn and practice kanji, vocabulary and grammar, train your listening, and build your own flashcards and quizzes.')}
          </p>
        </div>
        <div className="jp text-7xl font-bold text-primary/80 sm:text-8xl">日本語</div>
      </div>
      <LevelBar />
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {stats.map((s) => (
          <div key={s.id} className="rounded-xl border bg-card p-4 text-center shadow-sm">
            <div className="text-2xl font-bold text-primary">{counts[s.id as keyof typeof counts]}</div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground">{t(s.label)}</div>
          </div>
        ))}
      </div>
      <h2 className="mb-3 text-lg font-semibold">{t('Sessions')}</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {SESSIONS.map((s) => (
          <Link key={s.href} href={s.href} className="flex flex-col gap-2 rounded-xl border bg-card p-5 shadow-sm transition-colors hover:bg-accent/40">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted/50 text-2xl">{s.icon}</span>
            <span className="font-semibold">{s.title}</span>
            <span className="flex-1 text-sm text-muted-foreground">{s.desc}</span>
            <span className="text-sm font-medium text-primary">{s.go}</span>
          </Link>
        ))}
      </div>
      <p className="mt-8 rounded-xl border bg-muted/30 p-4 text-center text-xs text-muted-foreground">
        Built from your books: “N5 Kanji Master” and “Minna no Nihongo N5 (Myanmar translation)”. Audio uses your device’s Japanese voice (ja-JP).
      </p>
    </div>
  );
}
