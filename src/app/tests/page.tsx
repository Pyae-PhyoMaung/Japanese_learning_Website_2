'use client';

/* Tests — port of tests.html: build study material from what you selected
   on the Kanji/Vocabulary pages (sel_kanji / sel_vocab prefs): flashcard
   decks and quizzes, plus your own saved tests from Add/Edit. */
import * as React from 'react';
import { kanjiList, vocabList, merged, useJL } from '@/lib/jl';
import { pref } from '@/lib/store';
import { PageHead } from '@/components/page-head';
import { Flashcards } from '@/components/flashcards';
import { Quiz } from '@/components/quiz';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useT, useToast } from '@/components/providers';
import { pickN, shuffle } from '@/lib/utils';
import type { QuizItem, UserTest } from '@/lib/types';

export default function TestsPage() {
  useJL();
  const { t } = useT();
  const toast = useToast();
  const [mounted, setMounted] = React.useState(false);
  const [cards, setCards] = React.useState<any[] | null>(null);
  const [quiz, setQuiz] = React.useState<QuizItem[] | null>(null);
  const [runTest, setRunTest] = React.useState<UserTest | null>(null);

  React.useEffect(() => setMounted(true), []);

  const selK = mounted ? (pref('sel_kanji') || []) : [];
  const selV = mounted ? (pref('sel_vocab') || []) : [];
  const kanji = mounted ? kanjiList().filter((k) => selK.includes(k.id)) : [];
  const words = mounted ? vocabList().filter((v) => selV.includes(v.id)) : [];
  const myTests: UserTest[] = mounted ? merged<UserTest>('tests') : [];

  const buildCards = () => {
    const c = kanji.map((k) => ({ front: k.kanji, back: (k.kun || (k.on || [])[0] || '') + '\n' + (k.en || k.meaning || ''), say: k.kanji }))
      .concat(words.map((v) => ({ front: v.jp, back: (v.rd || '') + '\n' + (v.mm || v.en || ''), say: v.jp })));
    if (!c.length) { toast('Select kanji or words first (☑ Select on the Kanji/Vocabulary pages).', 'warn'); return; }
    setCards(c);
  };

  const buildQuiz = () => {
    const pool = kanji.map((k) => ({ key: k.kanji, a: k.kun || (k.on || [])[0] || k.kanji }))
      .concat(words.map((v) => ({ key: v.jp, a: v.mm || v.en || '' })));
    if (pool.length < 4) { toast('Select at least 4 items first.', 'warn'); return; }
    setQuiz(pickN(pool, Math.min(10, pool.length)).map((it) => {
      const others = pickN(pool.filter((o) => o.key !== it.key), 3);
      const opts = shuffle([it.a].concat(others.map((o) => o.a)));
      return { q: it.key, opts, ans: opts.indexOf(it.a), say: it.key };
    }));
  };

  const openTest = (ut: UserTest) => {
    if (ut.kind === 'deck') {
      setRunTest(ut);
    } else {
      setQuiz(ut.items.filter((i) => i && i.q && i.opts));
    }
  };

  return (
    <div>
      <PageHead icon="📝" title="Tests" subtitle={kanji.length + ' kanji + ' + words.length + ' words selected'} />
      <Tabs defaultValue="cards">
        <TabsList className="mb-4 flex-wrap">
          <TabsTrigger value="cards">{t('Flashcards')}</TabsTrigger>
          <TabsTrigger value="quiz">{t('Quiz')}</TabsTrigger>
          <TabsTrigger value="mine">{t('My tests')}</TabsTrigger>
        </TabsList>
        <TabsContent value="cards">
          <Button onClick={buildCards}>{t('Build deck from selection')}</Button>
          <div className="mt-4">{cards ? <Flashcards cards={cards} title={t('My deck')} /> : null}</div>
        </TabsContent>
        <TabsContent value="quiz">
          <Button onClick={buildQuiz}>{t('Build quiz from selection')}</Button>
          <div className="mt-4">{quiz ? <Quiz items={quiz} title={t('My quiz')} /> : null}</div>
        </TabsContent>
        <TabsContent value="mine">
          {!myTests.length ? (
            <p className="text-sm text-muted-foreground">{t('No tests yet — build them in Add / Edit.')}</p>
          ) : (
            <div className="space-y-3">
              {myTests.map((ut) => (
                <div key={ut.id} className="flex items-center justify-between rounded-xl border bg-card p-4 shadow-sm">
                  <div>
                    <div className="font-medium">{ut.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {ut.kind === 'deck' ? '🗂 deck' : '❓ quiz'} · {ut.items.length} items{ut.level ? ' · ' + ut.level : ''}{ut.chapter ? ' · ch ' + ut.chapter : ''}
                    </div>
                  </div>
                  <Button size="sm" onClick={() => openTest(ut)}>{t('Start')}</Button>
                </div>
              ))}
            </div>
          )}
          {runTest && runTest.kind === 'deck' ? (
            <div className="mt-4"><Flashcards cards={runTest.items} title={runTest.title} /></div>
          ) : null}
        </TabsContent>
      </Tabs>
    </div>
  );
}
