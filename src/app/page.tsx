'use client';

/* Home — port of index.html: live counts for the current JLPT level plus
   session cards into every part of the app. */
import * as React from 'react';
import Link from 'next/link';
import { byLevel, kanjiList, vocabList, grammarList, sentenceList, merged, level, useJL } from '@/lib/jl';
import { LevelBar } from '@/components/level-bar';
import { useT } from '@/components/providers';

const SESSIONS = [
  { href: '/learn', icon: '🎯', title: 'Learn', desc: 'Study selected kanji & words' },
  { href: '/kanji', icon: '漢', title: 'Kanji', desc: 'Browse, select & practice kanji' },
  { href: '/vocab', icon: '語', title: 'Vocabulary', desc: 'Words by chapter + essential list' },
  { href: '/kana', icon: 'あ', title: 'Kana', desc: 'Hiragana & katakana with writing pad' },
  { href: '/grammar', icon: '文', title: 'Grammar', desc: 'Patterns, examples & exercises' },
  { href: '/write', icon: '✍️', title: 'Writing', desc: 'Write kanji & words on the pad' },
  { href: '/listening', icon: '🎧', title: 'Listening', desc: 'Listen & dictate words & sentences' },
  { href: '/tests', icon: '📝', title: 'Tests', desc: 'Build quizzes & flashcard decks' },
  { href: '/dictionary', icon: '辞', title: 'Dictionary', desc: 'Search words & sentences' },
  { href: '/textbook', icon: '📖', title: 'Library', desc: 'Textbook PDFs & your books' },
  { href: '/files', icon: '🗂️', title: 'Files', desc: 'Your uploaded files' },
  { href: '/partner', icon: '🤝', title: 'Study Partner', desc: 'Chat, add items, get quizzed' },
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

  const stats = [
    { id: 'kanji', label: 'Kanji' },
    { id: 'vocab', label: 'Vocabulary' },
    { id: 'grammar', label: 'Grammar' },
    { id: 'sentences', label: 'Sentences' },
    { id: 'tests', label: 'Tests' },
  ];

  return (
    <div>
      <div className="mb-8 rounded-2xl border bg-card p-8 text-center shadow-sm">
        <h1 className="text-4xl font-bold tracking-tight">日本語 <span className="text-muted-foreground">Japanese Learning</span></h1>
        <p className="mt-2 text-muted-foreground">
          {t('Learn Japanese with kanji, words, grammar, listening, writing and tests')} — {mounted ? level() : 'N5'}
        </p>
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
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {SESSIONS.map((s) => (
          <Link key={s.href} href={s.href} className="flex items-center gap-4 rounded-xl border bg-card p-4 shadow-sm transition-colors hover:bg-accent/40">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-muted/50 text-2xl">{s.icon}</span>
            <span>
              <span className="block font-medium">{t(s.title)}</span>
              <span className="block text-sm text-muted-foreground">{s.desc}</span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
