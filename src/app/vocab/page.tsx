'use client';

/* Vocabulary — port of vocab.html: kanji example words (kex) merged in,
   chapter cards with "Essential & my words" first and "All words" last,
   select mode (sel_vocab), detail dialog, and practice tabs over a shared
   scope. URL state ?ch=ess|all|N and ?q= via history.replaceState. */
import * as React from 'react';
import Link from 'next/link';
import { byLevel, vocabList, kexVocab, chapterTitle, useJL } from '@/lib/jl';
import { pref } from '@/lib/store';
import { LevelBar } from '@/components/level-bar';
import { PageHead } from '@/components/page-head';
import { ChapterGrid } from '@/components/chapter-grid';
import { VocabCard } from '@/components/words';
import { Flashcards } from '@/components/flashcards';
import { Quiz } from '@/components/quiz';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useT, useToast } from '@/components/providers';
import { pickN, shuffle } from '@/lib/utils';
import type { QuizItem, Vocab } from '@/lib/types';

export default function VocabPage() {
  useJL();
  const { t } = useT();
  const toast = useToast();
  const [mounted, setMounted] = React.useState(false);
  const [view, setView] = React.useState<'chapters' | 'words'>('chapters');
  const [cat, setCat] = React.useState<string>('');
  const [q, setQ] = React.useState('');
  const [selectMode, setSelectMode] = React.useState(false);
  const [scope, setScope] = React.useState('all');
  const [quizMode, setQuizMode] = React.useState('jp-mm');
  const [cards, setCards] = React.useState<any[] | null>(null);
  const [quiz, setQuiz] = React.useState<QuizItem[] | null>(null);

  const ALL: Vocab[] = mounted ? byLevel(vocabList()).concat(byLevel(kexVocab())) : [];
  const chs = mounted
    ? (() => {
        const seen: Record<number, { n: number; t: string; count: number }> = {};
        ALL.forEach((v) => {
          const n = Number(v.chapter) || 0;
          if (!n) return;
          if (!seen[n]) seen[n] = { n, t: '', count: 0 };
          if (!seen[n].t && v.chapterTitle) seen[n].t = v.chapterTitle;
          seen[n].count++;
        });
        return Object.values(seen)
          .map((c) => ({ ...c, t: chapterTitle('vocab', c.n, c.t) || c.t }))
          .sort((a, b) => a.n - b.n);
      })()
    : [];
  const nEss = ALL.filter((v) => !v.chapter).length;

  React.useEffect(() => {
    setMounted(true);
    const params = new URLSearchParams(location.search);
    const qv = params.get('q');
    const chv = params.get('ch');
    if (qv) { setQ(qv); setView('words'); }
    else if (chv) {
      if (chv === 'ess') { setCat('__essential__'); setView('words'); }
      else if (chv === 'all') { setCat(''); setView('words'); }
      else { setCat(chv); setView('words'); }
    }
  }, []);

  const syncUrl = React.useCallback(() => {
    const parts: string[] = [];
    if (view === 'words' && !q) parts.push('ch=' + (cat === '__essential__' ? 'ess' : cat === '' ? 'all' : cat));
    if (q) parts.push('q=' + encodeURIComponent(q));
    try { history.replaceState(history.state, '', parts.length ? '?' + parts.join('&') : location.pathname); } catch (e) {}
  }, [view, cat, q]);

  const filtered = ALL.filter((v) => {
    /* with a search term, results ignore the open chapter (like the original site) */
    if (!q && view === 'words' && cat) {
      if (cat === '__essential__') { if (v.chapter) return false; }
      else if (String(v.chapter || 0) !== cat) return false;
    }
    if (q) {
      const hay = [v.jp, v.rd, v.romaji, v.en, v.mm].join(' ').toLowerCase();
      if (!hay.includes(q.toLowerCase())) return false;
    }
    return true;
  });

  const pool = scope === 'all' ? ALL : scope === '__essential__' ? ALL.filter((w) => !w.chapter) : ALL.filter((w) => String(w.chapter || 0) === scope);

  const toggleSel = (id: string) => {
    const s = pref('sel_vocab') || [];
    const i = s.indexOf(id);
    if (i < 0) s.push(id); else s.splice(i, 1);
    pref('sel_vocab', s);
  };

  const buildQuiz = (): QuizItem[] | null => {
    if (pool.length < 4) { toast('Need at least 4 words in this scope.', 'warn'); return null; }
    return pickN(pool, Math.min(10, pool.length)).map((v) => {
      const others = pickN(pool.filter((o) => o.id !== v.id), 3);
      const meaning = v.mm || v.en || '';
      if (quizMode === 'mm-jp') {
        const opts = shuffle([v.jp].concat(others.map((o) => o.jp)));
        return { q: meaning, opts, ans: opts.indexOf(v.jp), say: v.jp, note: v.rd || '' };
      }
      const opts = shuffle([meaning].concat(others.map((o) => o.mm || o.en || '')));
      return { q: v.jp, opts, ans: opts.indexOf(meaning), say: v.jp, note: v.rd || '' };
    });
  };

  const chapterCards = [{ n: -1, t: '★ ' + t('Essential & my words'), count: nEss, extra: true }]
    .concat(chs.map((c) => ({ n: c.n, t: c.t, count: c.count, extra: false })))
    .concat([{ n: -2, t: '📖 ' + t('All words'), count: ALL.length, extra: true }]);
  const cardKey = (c: { n: number; extra?: boolean }) => (c.extra ? (c.n === -1 ? '__essential__' : '') : String(c.n));

  const scopeSelect = (
    <select value={scope} onChange={(e) => setScope(e.target.value)} className="h-9 rounded-md border border-input bg-transparent px-3 text-sm">
      <option value="all">{t('All words')} ({ALL.length})</option>
      <option value="__essential__">{t('Essential & my words')} ({nEss})</option>
      {chs.map((c) => (
        <option key={c.n} value={String(c.n)}>{c.n + '章 ' + (c.t || '')} ({c.count})</option>
      ))}
    </select>
  );

  return (
    <div>
      <PageHead icon="語" title="Vocabulary" subtitle={'Words of your selected JLPT level, grouped by chapter — tap a chapter to see its words (word, spelling and meaning), then tap a word for details and audio. Practice with flashcards and quizzes.'} />
      <LevelBar />
      <Tabs defaultValue="learn">
        <TabsList className="mb-4 flex-wrap">
          <TabsTrigger value="learn">{t('Learn')}</TabsTrigger>
          <TabsTrigger value="cards">{t('Flashcards')}</TabsTrigger>
          <TabsTrigger value="quiz">{t('Quiz')}</TabsTrigger>
        </TabsList>
        <TabsContent value="learn">
          {/* search + selection toolbar — always at the top, above both the
              chapter grid and the words view (like the original site) */}
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <input
              value={q}
              onChange={(e) => { const v = e.target.value; setQ(v); if (v) setView('words'); syncUrl(); }}
              placeholder="Search words…"
              className="h-9 min-w-[200px] flex-1 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <div className="flex items-center gap-1 rounded-lg border bg-muted/40 p-1 shadow-sm">
              <Button
                size="sm"
                variant={selectMode ? 'secondary' : 'ghost'}
                className={'gap-1 font-medium' + (selectMode ? ' ring-1 ring-primary/40' : ' text-muted-foreground')}
                onClick={() => { setSelectMode(!selectMode); if (!selectMode) { setCat(''); setView('words'); syncUrl(); toast('Select mode: tap words to add them to your Learn list.', 'ok'); } }}
              >
                {selectMode ? '✓ ' + t('Done selecting') : '☑ ' + t('Select')}
              </Button>
              <Link href="/learn?tab=vocab" className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90">
                🎯 {t('Learn selected')}
                <span className="rounded-full bg-primary-foreground/25 px-1.5 text-xs font-semibold leading-5">{(pref('sel_vocab') || []).length}</span>
              </Link>
              <Button size="sm" variant="ghost" disabled={!(pref('sel_vocab') || []).length} className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-40" onClick={() => { pref('sel_vocab', []); toast('Selection cleared.', 'ok'); }}>✕ {t('Clear selection')}</Button>
            </div>
          </div>
          {view === 'chapters' ? (
            <ChapterGrid
              chapters={chapterCards}
              active={cat}
              onPick={(key) => { setCat(String(key)); setView('words'); syncUrl(); }}
              countNoun="words"
            />
          ) : (
            <div>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => { setView('chapters'); setQ(''); syncUrl(); }}>← {t('Chapters')}</Button>
                <span className="font-medium">
                  {cat === '__essential__' ? '★ ' + t('Essential & my words') : cat ? cat + '章 ' + (chs.find((c) => String(c.n) === cat)?.t || '') : q ? 'Search results' : t('All words')}
                </span>
                <span className="text-xs text-muted-foreground">{filtered.length} words</span>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map((v) => (
                  <VocabCard key={v.id} v={v} selected={selectMode && (pref('sel_vocab') || []).includes(v.id)} onToggle={selectMode ? toggleSel : undefined} />
                ))}
              </div>
            </div>
          )}
        </TabsContent>
        <TabsContent value="cards">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {scopeSelect}
            <Button onClick={() => {
              if (!pool.length) { toast('No words in this scope.', 'warn'); return; }
              setCards(pool.map((v) => ({ front: v.jp, back: (v.rd || '') + '\n' + (v.mm || v.en || ''), say: v.jp })));
            }}>{t('Start')}</Button>
          </div>
          {cards ? <Flashcards cards={cards} title={t('Word flashcards')} /> : null}
        </TabsContent>
        <TabsContent value="quiz">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {scopeSelect}
            <select value={quizMode} onChange={(e) => setQuizMode(e.target.value)} className="h-9 rounded-md border border-input bg-transparent px-3 text-sm">
              <option value="jp-mm">{t('Word → meaning')}</option>
              <option value="mm-jp">{t('Meaning → word')}</option>
            </select>
            <Button onClick={() => setQuiz(buildQuiz())}>{t('Start')}</Button>
          </div>
          {quiz ? <Quiz items={quiz} title={t('Word quiz')} /> : null}
        </TabsContent>
      </Tabs>
    </div>
  );
}
