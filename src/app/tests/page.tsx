'use client';

/* Tests — port of tests.html: JLPT-scoped flashcards and quizzes generated
   fresh from the level's data via content-kind + chapter selects (like the
   original), plus your own saved tests from Add/Edit with take/delete. */
import * as React from 'react';
import { byLevel, kanjiList, vocabList, grammarList, sentenceList, chapterTitle, merged, useJL } from '@/lib/jl';
import { remove } from '@/lib/store';
import { PageHead } from '@/components/page-head';
import { LevelBar } from '@/components/level-bar';
import { Flashcards } from '@/components/flashcards';
import { Quiz } from '@/components/quiz';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useT, useToast } from '@/components/providers';
import { pickN, shuffle } from '@/lib/utils';
import type { QuizItem, UserTest, Kanji, Vocab, Grammar, Sentence } from '@/lib/types';

const selectCls = 'h-9 rounded-md border border-input bg-transparent px-3 text-sm';

export default function TestsPage() {
  useJL();
  const { t } = useT();
  const toast = useToast();
  const [mounted, setMounted] = React.useState(false);
  const [deckSrc, setDeckSrc] = React.useState('k-rm');
  const [deckCh, setDeckCh] = React.useState('all');
  const [quizSrc, setQuizSrc] = React.useState('k-reading');
  const [quizCh, setQuizCh] = React.useState('all');
  const [cards, setCards] = React.useState<any[] | null>(null);
  const [quiz, setQuiz] = React.useState<QuizItem[] | null>(null);
  const [runTest, setRunTest] = React.useState<UserTest | null>(null);

  React.useEffect(() => { setMounted(true); }, []);

  const K: Kanji[] = mounted ? byLevel(kanjiList()) : [];
  const V: Vocab[] = mounted ? byLevel(vocabList()) : [];
  const G: Grammar[] = mounted ? byLevel(grammarList()) : [];
  const S: Sentence[] = mounted ? byLevel(sentenceList()) : [];
  const myTests: UserTest[] = mounted ? byLevel(merged<UserTest>('tests')) : [];

  const everything = [...K, ...V, ...G, ...S];
  const allChs = Array.from(new Set(everything.map((x) => Number(x.chapter) || 0))).filter((n) => n > 0).sort((a, b) => a - b);
  const chTitle = (n: number) => {
    const first: any = everything.find((x) => String(x.chapter || 0) === String(n));
    return chapterTitle('vocab', n, first ? first.chapterTitle || '' : '');
  };
  const chCount = (n: string) => everything.filter((x) => String(x.chapter || 0) === n).length;

  /* flashcards — deck source + chapter scope, like tests.html */
  const buildCards = () => {
    const f = (x: { chapter?: number }) => deckCh === 'all' || String(x.chapter || 0) === deckCh;
    let c: any[] = [];
    if (deckSrc === 'k-rm') {
      c = K.filter(f).map((k) => ({ front: k.kanji, back: (k.kun || (k.on || [])[0] || '') + '\n' + (k.en || k.meaning || ''), say: k.kanji }));
    } else if (deckSrc === 'v-both') {
      c = V.filter(f).map((v) => {
        const meaning = v.mm || v.en || '';
        return Math.random() < 0.5
          ? { front: v.jp, back: (v.rd ? v.rd + '\n' : '') + meaning, say: v.jp }
          : { front: meaning || v.jp, back: v.jp + (v.rd ? '\n' + v.rd : ''), say: v.jp };
      });
    } else if (deckSrc === 'g-ex') {
      c = G.filter(f).flatMap((g) => (g.examples || []).map((e) => ({ front: e.jp, back: [e.rd || '', e.en || ''].filter(Boolean).join('\n'), say: e.jp })));
    } else {
      c = S.filter(f).map((s) => ({ front: s.jp, back: [s.rd || '', s.mm || s.en || ''].filter(Boolean).join('\n'), say: s.jp }));
    }
    if (!c.length) { toast('Not enough items in this scope.', 'warn'); return; }
    setCards(shuffle(c));
  };

  /* quizzes — 10 questions from the chosen source + chapter scope */
  const buildQuiz = () => {
    const f = (x: { chapter?: number }) => quizCh === 'all' || String(x.chapter || 0) === quizCh;
    let items: QuizItem[] = [];
    if (quizSrc === 'k-reading' || quizSrc === 'k-meaning') {
      const pool = K.filter(f);
      if (pool.length < 4) { toast('Not enough items in this scope.', 'warn'); return; }
      const reading = quizSrc === 'k-reading';
      items = pickN(pool, Math.min(10, pool.length)).map((k) => {
        const a = reading ? (k.kun || (k.on || [])[0] || '') : (k.en || k.meaning || '');
        const others = pickN(pool.filter((o) => o.id !== k.id), 3).map((o) => (reading ? (o.kun || (o.on || [])[0] || '') : (o.en || o.meaning || '')));
        const opts = shuffle([a].concat(others));
        return { q: k.kanji, opts, ans: opts.indexOf(a), say: k.kanji };
      });
    } else if (quizSrc === 'v-jm' || quizSrc === 'v-mj') {
      const pool = V.filter(f);
      if (pool.length < 4) { toast('Not enough items in this scope.', 'warn'); return; }
      items = pickN(pool, Math.min(10, pool.length)).map((v) => {
        const meaning = v.mm || v.en || '';
        const others = pickN(pool.filter((o) => o.id !== v.id), 3).map((o) => o.mm || o.en || '');
        if (quizSrc === 'v-mj') {
          const real = shuffle([v.jp].concat(pickN(pool.filter((o) => o.id !== v.id), 3).map((o) => o.jp)));
          return { q: meaning, opts: real, ans: real.indexOf(v.jp), say: v.jp };
        }
        const opts = shuffle([meaning].concat(others));
        return { q: v.jp, opts, ans: opts.indexOf(meaning), say: v.jp };
      });
    } else if (quizSrc === 'v-listen') {
      const pool = V.filter(f);
      if (pool.length < 4) { toast('Not enough items in this scope.', 'warn'); return; }
      items = pickN(pool, Math.min(10, pool.length)).map((v) => {
        const meaning = v.mm || v.en || '';
        const others = pickN(pool.filter((o) => o.id !== v.id), 3).map((o) => o.mm || o.en || '');
        const opts = shuffle([meaning].concat(others));
        return { q: '🔊 ' + t('Tap to listen'), opts, ans: opts.indexOf(meaning), say: v.jp };
      });
    } else {
      const pool: QuizItem[] = [];
      G.filter(f).forEach((g) => (g.exercises || []).forEach((e) => pool.push({ q: e.q, opts: e.opts, ans: e.ans, say: e.q.replace(/___/g, e.opts[e.ans] || '') })));
      if (!pool.length) { toast('Not enough items in this scope.', 'warn'); return; }
      items = shuffle(pool).slice(0, 10);
    }
    setQuiz(items);
  };

  const openTest = (ut: UserTest) => {
    if (ut.kind === 'deck') {
      setRunTest(ut);
    } else {
      setQuiz(ut.items.filter((i) => i && i.q && i.opts));
    }
  };

  const deleteTest = (ut: UserTest) => {
    remove('tests', ut.id);
    if (runTest && runTest.id === ut.id) setRunTest(null);
    toast('Test deleted.', 'ok');
  };

  return (
    <div>
      <PageHead icon="📝" title="Tests" subtitle={'Practice with flashcards and auto-generated quizzes from your study data, or take the custom tests and flashcard decks you build yourself.'} />
      <LevelBar />
      <Tabs defaultValue="cards">
        <TabsList className="mb-4 flex-wrap">
          <TabsTrigger value="cards">{t('Flashcards')}</TabsTrigger>
          <TabsTrigger value="quiz">{t('Quizzes')}</TabsTrigger>
          <TabsTrigger value="mine">{t('My tests')}</TabsTrigger>
        </TabsList>
        <TabsContent value="cards">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <select value={deckSrc} onChange={(e) => { setDeckSrc(e.target.value); setCards(null); }} className={selectCls}>
              <option value="k-rm">{t('Kanji (kanji → reading & meaning)')}</option>
              <option value="v-both">{t('Vocabulary (Japanese ⇄ meaning)')}</option>
              <option value="g-ex">{t('Grammar example sentences')}</option>
              <option value="s-all">{t('All sentences')}</option>
            </select>
            <select value={deckCh} onChange={(e) => { setDeckCh(e.target.value); setCards(null); }} className={selectCls}>
              <option value="all">{t('All chapters')} ({everything.length})</option>
              {allChs.map((n) => (
                <option key={n} value={String(n)}>{n}章 {chTitle(n)} ({chCount(String(n))})</option>
              ))}
            </select>
            <Button onClick={buildCards}>{t('Start flashcards')}</Button>
          </div>
          <div className="mt-4">{cards ? <Flashcards cards={cards} title={t('My deck')} /> : null}</div>
        </TabsContent>
        <TabsContent value="quiz">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <select value={quizSrc} onChange={(e) => { setQuizSrc(e.target.value); setQuiz(null); }} className={selectCls}>
              <option value="k-reading">{t('Kanji → reading')}</option>
              <option value="k-meaning">{t('Kanji → meaning')}</option>
              <option value="v-jm">{t('Vocabulary: Japanese → meaning')}</option>
              <option value="v-mj">{t('Vocabulary: meaning → Japanese')}</option>
              <option value="v-listen">{t('Vocabulary: 🎧 listen and choose')}</option>
              <option value="g-ex">{t('Grammar exercises (mixed)')}</option>
            </select>
            <select value={quizCh} onChange={(e) => { setQuizCh(e.target.value); setQuiz(null); }} className={selectCls}>
              <option value="all">{t('All chapters')} ({everything.length})</option>
              {allChs.map((n) => (
                <option key={n} value={String(n)}>{n}章 {chTitle(n)} ({chCount(String(n))})</option>
              ))}
            </select>
            <Button onClick={buildQuiz}>{t('Start quiz (10 questions)')}</Button>
          </div>
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
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => openTest(ut)}>{t('▶ Take this test')}</Button>
                    <Button size="sm" variant="outline" onClick={() => deleteTest(ut)}>{t('🗑 Delete')}</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {runTest && runTest.kind === 'deck' ? (
            <div className="mt-4"><Flashcards cards={runTest.items} title={runTest.title} /></div>
          ) : null}
        </TabsContent>
      </Tabs>
      <div className="mt-8 border-t pt-4 text-center text-xs text-muted-foreground">
        {t('Every quiz and flashcard deck here is generated fresh from your current data — including anything you added in the editor.')}
      </div>
    </div>
  );
}
