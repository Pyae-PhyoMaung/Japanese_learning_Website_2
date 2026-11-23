'use client';

/* Kanji — port of kanji.html: chapter cards / one chapter's grid, search,
   select mode (sel_kanji pref), detail dialog, and the practice tabs
   (flashcards, quiz with reading|meaning|reverse modes, fill-in-the-blank)
   over a shared scope (All chapters or one chapter). URL state ?ch/?q/?k is
   kept via history.replaceState so back/refresh return to this view. */
import * as React from 'react';
import Link from 'next/link';
import { byLevel, kanjiList, chapterTitle, chapters, useJL } from '@/lib/jl';
import { pref } from '@/lib/store';
import { LevelBar } from '@/components/level-bar';
import { PageHead } from '@/components/page-head';
import { ChapterGrid } from '@/components/chapter-grid';
import { KanjiCard } from '@/components/words';
import { Flashcards } from '@/components/flashcards';
import { Quiz } from '@/components/quiz';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useT, useToast } from '@/components/providers';
import { pickN, shuffle } from '@/lib/utils';
import type { Kanji, QuizItem } from '@/lib/types';

function kReading(k: Kanji) { return k.kun || (k.on || [])[0] || ''; }

export default function KanjiPage() {
  useJL();
  const { t } = useT();
  const toast = useToast();
  const [mounted, setMounted] = React.useState(false);
  const [view, setView] = React.useState<'chapters' | 'kanji'>('chapters');
  const [ch, setCh] = React.useState(0);
  const [q, setQ] = React.useState('');
  const [selectMode, setSelectMode] = React.useState(false);
  const [scope, setScope] = React.useState('all');
  const [quizMode, setQuizMode] = React.useState('reading');
  const [cards, setCards] = React.useState<any[] | null>(null);
  const [quiz, setQuiz] = React.useState<QuizItem[] | null>(null);

  const ALL = mounted ? byLevel(kanjiList()) : [];
  const chs = mounted ? chapters('kanji') : [];

  const syncUrl = React.useCallback((extra?: string) => {
    const parts: string[] = [];
    if (view === 'kanji' && !q) parts.push('ch=' + ch);
    if (q) parts.push('q=' + encodeURIComponent(q));
    if (extra) parts.push(extra);
    try { history.replaceState(history.state, '', parts.length ? '?' + parts.join('&') : location.pathname); } catch (e) {}
  }, [view, ch, q]);

  React.useEffect(() => {
    setMounted(true);
    /* deep links: ?ch=N reopens a chapter grid, ?q=… a search, ?k=X a detail */
    const params = new URLSearchParams(location.search);
    const qv = params.get('q');
    const chv = params.get('ch');
    if (qv) { setQ(qv); setView('kanji'); }
    else if (chv != null && chv !== '') { setCh(parseInt(chv, 10) || 0); setView('kanji'); }
  }, []);

  const filtered = ALL.filter((k) => {
    /* with a search term, results ignore the open chapter (like the original site) */
    if (!q && view === 'kanji' && ch && k.chapter !== ch) return false;
    if (q) {
      const needle = q.toLowerCase();
      const hay = [k.kanji, (k.on || []).join(' '), k.kun, k.meaning, k.en].join(' ').toLowerCase();
      const inEx = (k.examples || []).some((e) => (e.word + ' ' + e.reading + ' ' + e.meaning).toLowerCase().includes(needle));
      if (!hay.includes(needle) && !inEx) return false;
    }
    return true;
  });

  const pool = scope === 'all' ? ALL : ALL.filter((k) => String(k.chapter || 0) === scope);

  const toggleSel = (id: string) => {
    const s = pref('sel_kanji') || [];
    const i = s.indexOf(id);
    if (i < 0) s.push(id); else s.splice(i, 1);
    pref('sel_kanji', s);
  };

  const buildQuiz = (): QuizItem[] | null => {
    if (pool.length < 4) { toast('Need at least 4 kanji in this scope.', 'warn'); return null; }
    return pickN(pool, Math.min(10, pool.length)).map((k) => {
      const others = pickN(pool.filter((o) => o.id !== k.id), 3);
      if (quizMode === 'meaning') {
        const a = k.en || k.meaning;
        const opts = shuffle([a].concat(others.map((o) => o.en || o.meaning)));
        return { q: k.kanji, opts, ans: opts.indexOf(a), say: k.kanji, note: kReading(k) };
      }
      if (quizMode === 'reverse') {
        const opts = shuffle([k.kanji].concat(others.map((o) => o.kanji)));
        return { q: kReading(k) + ' — which kanji is this?', opts, ans: opts.indexOf(k.kanji), say: kReading(k), note: k.en || '' };
      }
      const a = kReading(k);
      const opts = shuffle([a].concat(others.map((o) => kReading(o) || o.kanji)));
      return { q: k.kanji, opts, ans: opts.indexOf(a), say: k.kanji, note: k.en || '' };
    });
  };

  const buildBlank = (): QuizItem[] => {
    const qs: QuizItem[] = [];
    shuffle(pool).forEach((k) => {
      if (qs.length >= 10) return;
      const ex = (k.examples || []).filter((e) => e.word && e.word.includes(k.kanji))[0];
      if (!ex) return;
      const others = pickN(ALL.filter((o) => o.id !== k.id), 3);
      const opts = shuffle([k.kanji].concat(others.map((o) => o.kanji)));
      qs.push({ q: ex.word.replace(k.kanji, '◯') + '  (' + (ex.reading || '') + ')', opts, ans: opts.indexOf(k.kanji), say: ex.word, note: ex.word + ' — ' + (ex.meaning || '') });
    });
    return qs;
  };

  return (
    <div>
      <PageHead icon="漢" title="Kanji" subtitle={'Kanji of your selected JLPT level, grouped by chapter — tap a chapter button to see its kanji, then tap any kanji for details and audio. Switch to Flashcards / Quiz to practice.'} />
      <LevelBar />
      <Tabs defaultValue="learn">
        <TabsList className="mb-4 flex-wrap">
          <TabsTrigger value="learn">{t('Learn')}</TabsTrigger>
          <TabsTrigger value="cards">{t('Flashcards')}</TabsTrigger>
          <TabsTrigger value="quiz">{t('Quiz')}</TabsTrigger>
          <TabsTrigger value="blank">{t('Fill in the blank')}</TabsTrigger>
        </TabsList>
        <TabsContent value="learn">
          {/* search + selection toolbar — always at the top, above both the
              chapter grid and the chapter view (like the original site) */}
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <input
              value={q}
              onChange={(e) => { const v = e.target.value; setQ(v); if (v) setView('kanji'); syncUrl(); }}
              placeholder="Search kanji…"
              className="h-9 min-w-[200px] flex-1 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <div className="flex items-center gap-1 rounded-lg border bg-muted/40 p-1 shadow-sm">
              <Button
                size="sm"
                variant={selectMode ? 'secondary' : 'ghost'}
                className={'gap-1 font-medium' + (selectMode ? ' ring-1 ring-primary/40' : ' text-muted-foreground')}
                onClick={() => { setSelectMode(!selectMode); if (!selectMode) { setView('kanji'); syncUrl(); toast('Select mode: tap kanji to add them to your Learn list.', 'ok'); } }}
              >
                {selectMode ? '✓ ' + t('Done selecting') : '☑ ' + t('Select')}
              </Button>
              <Link href="/learn?tab=kanji" className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90">
                🎯 {t('Learn selected')}
                <span className="rounded-full bg-primary-foreground/25 px-1.5 text-xs font-semibold leading-5">{(pref('sel_kanji') || []).length}</span>
              </Link>
              <Button size="sm" variant="ghost" disabled={!(pref('sel_kanji') || []).length} className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-40" onClick={() => { pref('sel_kanji', []); toast('Selection cleared.', 'ok'); }}>✕ {t('Clear selection')}</Button>
            </div>
          </div>
          {view === 'chapters' ? (
            <ChapterGrid
              chapters={[{ n: 0, t: 'All kanji', count: ALL.length, extra: true }].concat(
                chs.map((c) => ({ n: c.n, t: chapterTitle('kanji', c.n, c.t) || c.t, count: ALL.filter((k) => k.chapter === c.n).length, extra: false }))
              )}
              active={ch}
              onPick={(n) => { setCh(Number(n)); setView('kanji'); syncUrl(); }}
              countNoun="kanji"
            />
          ) : (
            <div>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => { setView('chapters'); setQ(''); syncUrl(); }}>← {t('Chapters')}</Button>
                <span className="font-medium">{q ? 'Search results' : ch ? ch + '章 ' + (chs.find((c) => c.n === ch)?.t || '') : 'All kanji'}</span>
                <span className="text-xs text-muted-foreground">{filtered.length} kanji</span>
              </div>
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
                {filtered.map((k) => (
                  <KanjiCard key={k.id} k={k} selected={selectMode && (pref('sel_kanji') || []).includes(k.id)} onToggle={selectMode ? toggleSel : undefined} />
                ))}
              </div>
            </div>
          )}
        </TabsContent>
        <TabsContent value="cards">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <select value={scope} onChange={(e) => setScope(e.target.value)} className="h-9 rounded-md border border-input bg-transparent px-3 text-sm">
              <option value="all">{t('All chapters')} ({ALL.length} kanji)</option>
              {chs.map((c) => (
                <option key={c.n} value={String(c.n)}>{c.n + '章 ' + (c.t || '')} ({ALL.filter((k) => k.chapter === c.n).length})</option>
              ))}
            </select>
            <Button onClick={() => {
              if (!pool.length) { toast('No kanji in this scope.', 'warn'); return; }
              setCards(pool.map((k) => ({ front: k.kanji, back: (kReading(k) || '—') + '\n' + (k.en || '') + (k.meaning ? ' · ' + k.meaning : ''), say: k.kanji })));
            }}>{t('Start')}</Button>
          </div>
          {cards ? <Flashcards cards={cards} title={t('Kanji flashcards')} /> : null}
        </TabsContent>
        <TabsContent value="quiz">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <select value={scope} onChange={(e) => setScope(e.target.value)} className="h-9 rounded-md border border-input bg-transparent px-3 text-sm">
              <option value="all">{t('All chapters')} ({ALL.length})</option>
              {chs.map((c) => (
                <option key={c.n} value={String(c.n)}>{c.n + '章 ' + (c.t || '')}</option>
              ))}
            </select>
            <select value={quizMode} onChange={(e) => setQuizMode(e.target.value)} className="h-9 rounded-md border border-input bg-transparent px-3 text-sm">
              <option value="reading">{t('Kanji → reading')}</option>
              <option value="meaning">{t('Kanji → meaning')}</option>
              <option value="reverse">{t('Reading → kanji')}</option>
            </select>
            <Button onClick={() => setQuiz(buildQuiz())}>{t('Start')}</Button>
          </div>
          {quiz ? <Quiz items={quiz} title={t('Kanji quiz')} /> : null}
        </TabsContent>
        <TabsContent value="blank">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <select value={scope} onChange={(e) => setScope(e.target.value)} className="h-9 rounded-md border border-input bg-transparent px-3 text-sm">
              <option value="all">{t('All chapters')} ({ALL.length})</option>
              {chs.map((c) => (
                <option key={c.n} value={String(c.n)}>{c.n + '章 ' + (c.t || '')}</option>
              ))}
            </select>
            <Button onClick={() => {
              const qs = buildBlank();
              if (!qs.length) { toast('No kanji in this scope have example words to blank out.', 'warn'); return; }
              setQuiz(qs);
            }}>{t('Start')}</Button>
          </div>
          {quiz ? <Quiz items={quiz} title={t('Fill in the blank')} /> : null}
        </TabsContent>
      </Tabs>
    </div>
  );
}
