'use client';

/* Quiz runner — port of the original quiz flow: pick N items, show progress,
   answer, speak, finish with score. Used by Tests, Grammar exercises, partner-bot
   quizzes, and any user-built quiz tests. */
import * as React from 'react';
import { Button } from '@/components/ui/button';
import { speak } from '@/lib/tts';
import type { QuizItem } from '@/lib/types';
import { cn } from '@/lib/utils';

export function Quiz({ items, title, onDone }: { items: QuizItem[]; title?: string; onDone?: (score: { right: number; total: number }) => void }) {
  const [i, setI] = React.useState(0);
  const [sel, setSel] = React.useState<number | null>(null);
  const [right, setRight] = React.useState(0);
  const [done, setDone] = React.useState(false);
  const total = items.length;

  if (!total) return <div className="p-6 text-center text-muted-foreground">No questions available.</div>;
  const q = items[i];

  const answer = (idx: number) => {
    if (sel != null) return;
    setSel(idx);
    if (idx === q.ans) setRight((r) => r + 1);
  };
  const next = () => {
    if (i + 1 >= total) {
      setDone(true);
      if (onDone) onDone({ right: sel === q.ans ? right : right, total });
    } else {
      setI(i + 1);
      setSel(null);
    }
  };

  if (done) {
    return (
      <div className="space-y-4 p-6 text-center">
        <div className="text-5xl">{right / total >= 0.8 ? '🎉' : right / total >= 0.5 ? '👍' : '💪'}</div>
        <h3 className="text-xl font-semibold">{right} / {total} correct</h3>
        <p className="text-muted-foreground">{right === total ? 'Perfect!' : 'Keep practicing!'}</p>
        <Button onClick={() => { setI(0); setSel(null); setRight(0); setDone(false); }}>{'Retry'}</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {title ? <h3 className="text-lg font-semibold">{title}</h3> : null}
      <div className="h-1.5 rounded-full bg-muted"><div className="h-1.5 rounded-full bg-primary transition-all" style={{ width: ((i + (sel != null ? 1 : 0)) / total) * 100 + '%' }} /></div>
      <div className="text-xs text-muted-foreground">{i + 1} / {total}</div>
      <div className="rounded-xl border bg-card p-6 text-center">
        <div className="mb-4 flex items-center justify-center gap-2">
          <span className="text-2xl font-medium">{q.q}</span>
          {q.say ? (
            <button type="button" title="Listen" className="rounded-md px-2 py-1 text-sm hover:bg-accent" onClick={() => speak(q.say)}>
              🔊
            </button>
          ) : null}
        </div>
        <div className="grid gap-2">
          {q.opts.map((o, idx) => {
            const isAns = idx === q.ans;
            const chosen = sel === idx;
            return (
              <button
                key={idx}
                type="button"
                className={cn(
                  'rounded-lg border px-4 py-3 text-left text-sm transition-colors',
                  sel == null && 'hover:bg-accent',
                  sel != null && isAns && 'border-green-500 bg-green-50 dark:bg-green-950',
                  sel != null && chosen && !isAns && 'border-red-500 bg-red-50 dark:bg-red-950'
                )}
                onClick={() => answer(idx)}
              >
                {o}
              </button>
            );
          })}
        </div>
        {sel != null && q.note ? <p className="mt-3 text-sm text-muted-foreground">{q.note}</p> : null}
        {sel != null && (
          <div className="mt-4">
            <Button onClick={next}>{i + 1 >= total ? 'Finish' : 'Next'}</Button>
          </div>
        )}
      </div>
    </div>
  );
}
