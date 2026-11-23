'use client';

/* Home — port of index.html: hero with the site introduction, live counts
   for the current JLPT level, and the session cards into every part of the
   app (same order and texts as the original). */
import * as React from 'react';
import Link from 'next/link';
import { byLevel, kanjiList, vocabList, grammarList, sentenceList, merged, useJL } from '@/lib/jl';
import { LevelBar } from '@/components/level-bar';
import { useT } from '@/components/providers';

/* sessions — short & neat cards (user preference), same set as the original incl. Add/Edit */
const SESSIONS = [
  { href: '/textbook', icon: '📖', title: 'Library', desc: 'Textbook PDFs & your files' },
  { href: '/learn', icon: '🎯', title: 'Learn', desc: 'Study selected kanji & words' },
  { href: '/kanji', icon: '漢', title: 'Kanji', desc: 'Browse, select & practice kanji' },
  { href: '/write', icon: '✍️', title: 'Writing', desc: 'Write kanji & words on the pad' },
  { href: '/vocab', icon: '語', title: 'Vocabulary', desc: 'Words by chapter + essential list' },
  { href: '/dictionary', icon: '辞', title: 'Dictionary', desc: 'Search words & sentences' },
  { href: '/kana', icon: 'あ', title: 'Kana', desc: 'Hiragana & katakana with writing pad' },
  { href: '/grammar', icon: '文', title: 'Grammar', desc: 'Patterns, examples & exercises' },
  { href: '/listening', icon: '🎧', title: 'Listening', desc: 'Listen & dictate words & sentences' },
  { href: '/tests', icon: '📝', title: 'Tests', desc: 'Build quizzes & flashcard decks' },
  { href: '/files', icon: '🗂️', title: 'Files', desc: 'Your uploaded files' },
  { href: '/partner', icon: '🤝', title: 'Study Partner', desc: 'Chat, add items, get quizzed' },
  { href: '/edit', icon: '⚙️', title: 'Add / Edit Content', desc: 'Add your own items & tests' },
  { href: '/board', icon: '📌', title: 'Cardboard', desc: 'Plan & finish tasks' },
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
          <Link key={s.href} href={s.href} className="flex items-center gap-4 rounded-xl border bg-card p-4 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-muted/50 text-2xl">{s.icon}</span>
            <span>
              <span className="block font-medium">{t(s.title)}</span>
              <span className="block text-sm text-muted-foreground">{s.desc}</span>
            </span>
          </Link>
        ))}
      </div>
      <p className="mt-8 rounded-xl border bg-muted/30 p-4 text-center text-xs text-muted-foreground">
        Built from your books: “N5 Kanji Master” and “Minna no Nihongo N5 (Myanmar translation)”. Audio uses your device’s Japanese voice (ja-JP).
      </p>
    </div>
  );
}
