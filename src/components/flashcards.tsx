'use client';

/* Flashcard deck runner — port of the original flip-card study flow.
   Used by Learn, user-built deck tests, and partner-bot decks. */
import * as React from 'react';
import { Button } from '@/components/ui/button';
import { speak } from '@/lib/tts';
import type { Flashcard } from '@/lib/types';

export function Flashcards({ cards, title }: { cards: Flashcard[]; title?: string }) {
  const [i, setI] = React.useState(0);
  const [flipped, setFlipped] = React.useState(false);
  const [known, setKnown] = React.useState<Record<number, boolean>>({});
  const total = cards.length;

  if (!total) return <div className="p-6 text-center text-muted-foreground">No cards available.</div>;
  const c = cards[i];

  const mark = (k: boolean) => {
    setKnown({ ...known, [i]: k });
    next();
  };
  const next = () => {
    if (i + 1 >= total) setFlipped(true); /* stay on last card; summary shows below */
    else { setI(i + 1); setFlipped(false); }
  };
  const answered = Object.keys(known).length;

  return (
    <div className="space-y-4">
      {title ? <h3 className="text-lg font-semibold">{title}</h3> : null}
      <div className="text-xs text-muted-foreground">{i + 1} / {total} · known: {Object.values(known).filter(Boolean).length}</div>
      <div
        className="mx-auto flex min-h-56 w-full max-w-md cursor-pointer items-center justify-center rounded-xl border bg-card p-10 text-center shadow-sm"
        onClick={() => setFlipped(!flipped)}
      >
        <div>
          <div className="text-3xl font-medium">{flipped ? c.back : c.front}</div>
          {!flipped && c.say ? (
            <button type="button" className="mt-4 rounded-md px-2 py-1 text-sm hover:bg-accent" onClick={(e) => { e.stopPropagation(); speak(c.say); }}>
              🔊 Listen
            </button>
          ) : null}
          {flipped && <p className="mt-3 text-sm text-muted-foreground">tap to flip back</p>}
        </div>
      </div>
      {flipped && i + 1 < total ? (
        <div className="flex justify-center gap-2">
          <Button variant="outline" onClick={() => mark(false)}>{'Still learning'}</Button>
          <Button onClick={() => mark(true)}>{'I know this'}</Button>
        </div>
      ) : null}
      {flipped && i + 1 >= total && answered < total ? (
        <div className="flex justify-center gap-2">
          <Button variant="outline" onClick={() => mark(false)}>{'Still learning'}</Button>
          <Button onClick={() => mark(true)}>{'I know this'}</Button>
        </div>
      ) : null}
      {answered >= total ? (
        <div className="rounded-xl border bg-muted/40 p-4 text-center">
          <p className="font-medium">{Object.values(known).filter(Boolean).length} / {total} known</p>
          <Button className="mt-3" variant="outline" onClick={() => { setI(0); setFlipped(false); setKnown({}); }}>{'Study again'}</Button>
        </div>
      ) : null}
    </div>
  );
}
