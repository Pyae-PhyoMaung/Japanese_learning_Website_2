'use client';

/* Grammar — port of grammar.html: chapter cards, grammar points with pattern /
   meaning / Myanmar explanation, examples with speak buttons, and exercise
   quizzes (fill-in-the-blank multiple choice) per point and for the chapter. */
import * as React from 'react';
import { byLevel, grammarList, chapterTitle, useJL, level } from '@/lib/jl';
import { LevelBar } from '@/components/level-bar';
import { PageHead } from '@/components/page-head';
import { ChapterGrid } from '@/components/chapter-grid';
import { Quiz } from '@/components/quiz';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SpeakBtn } from '@/components/words';
import { useT } from '@/components/providers';
import { shuffle } from '@/lib/utils';
import type { Grammar, QuizItem } from '@/lib/types';

export default function GrammarPage() {
  useJL();
  const { t } = useT();
  const [mounted, setMounted] = React.useState(false);
  const [ch, setCh] = React.useState<string>('');
  const [quiz, setQuiz] = React.useState<QuizItem[] | null>(null);
  const [quizTitle, setQuizTitle] = React.useState('');

  const ALL: Grammar[] = mounted ? byLevel(grammarList()) : [];
  const chs = mounted
    ? (() => {
        const seen: Record<number, { n: number; t: string; count: number }> = {};
        ALL.forEach((g) => {
          const n = Number(g.chapter) || 0;
          if (!n) return;
          if (!seen[n]) seen[n] = { n, t: '', count: 0 };
          if (!seen[n].t && g.chapterTitle) seen[n].t = g.chapterTitle;
          seen[n].count++;
        });
        return Object.values(seen)
          .map((c) => ({ ...c, t: chapterTitle('grammar', c.n, c.t) || c.t }))
          .sort((a, b) => a.n - b.n);
      })()
    : [];

  React.useEffect(() => {
    setMounted(true);
    const params = new URLSearchParams(location.search);
    const chv = params.get('ch');
    if (chv) setCh(chv);
  }, []);

  const list = ch === '' ? ALL : ALL.filter((g) => String(g.chapter || 0) === ch);

  const chapterQuiz = (g: Grammar) => {
    const items: QuizItem[] = [];
    ALL.filter((x) => x.id === g.id).forEach((x) =>
      (x.exercises || []).forEach((e) => items.push({ q: e.q, opts: e.opts, ans: e.ans, say: e.q.replace(/___/g, e.opts[e.ans] || '') }))
    );
    if (!items.length) return;
    setQuizTitle(g.title);
    setQuiz(shuffle(items));
  };

  const practiceAll = () => {
    const items: QuizItem[] = [];
    list.forEach((g) =>
      (g.exercises || []).forEach((e) => items.push({ q: e.q, opts: e.opts, ans: e.ans, say: e.q.replace(/___/g, e.opts[e.ans] || '') }))
    );
    if (!items.length) { setQuizTitle(''); setQuiz([]); return; }
    setQuizTitle(t('Grammar practice'));
    setQuiz(shuffle(items));
  };

  return (
    <div>
      <PageHead icon="文" title="Grammar" subtitle={(mounted ? level() : '') + ' · ' + list.length + ' grammar points'} />
      <LevelBar />
      <ChapterGrid
        chapters={[{ n: 0, t: t('All grammar'), count: ALL.length, extra: true }].concat(
          chs.map((c) => ({ n: c.n, t: c.t, count: c.count, extra: false }))
        )}
        active={ch}
        onPick={(n) => setCh(String(n))}
      />
      <div className="mb-4 flex items-center justify-between">
        <div className="text-sm text-muted-foreground">{list.length} {t('points')}</div>
        <Button onClick={practiceAll}>{t('Practice all')}</Button>
      </div>
      {quiz ? (
        <div className="mb-6">
          <Quiz items={quiz} title={quizTitle || t('Grammar practice')} />
        </div>
      ) : null}
      <div className="space-y-4">
        {list.map((g) => (
          <div key={g.id} className="rounded-xl border bg-card p-5 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-semibold">{g.title}</h3>
              {g.pattern ? <Badge variant="secondary">{g.pattern}</Badge> : null}
              {g.lesson ? <Badge variant="outline">{t('Lesson')} {g.lesson}</Badge> : null}
            </div>
            {g.meaning ? <p className="mt-1 text-sm text-muted-foreground">{g.meaning}</p> : null}
            {g.mm ? <p className="mt-1 text-sm">{g.mm}</p> : null}
            {g.explanation ? <p className="mt-2 text-sm">{g.explanation}</p> : null}
            {g.examples && g.examples.length ? (
              <div className="mt-3 space-y-1">
                {g.examples.map((e, i) => (
                  <div key={i} className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2">
                    <span className="font-medium">{e.jp}</span>
                    <SpeakBtn text={e.jp} />
                    {e.rd ? <span className="text-sm text-muted-foreground">{e.rd}</span> : null}
                    {e.en ? <span className="text-sm">{e.en}</span> : null}
                  </div>
                ))}
              </div>
            ) : null}
            {g.exercises && g.exercises.length ? (
              <Button variant="outline" size="sm" className="mt-3" onClick={() => chapterQuiz(g)}>
                {t('Exercises')} ({g.exercises.length})
              </Button>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
