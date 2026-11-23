'use client';

/* Chapter chips/cards — shared by Kanji, Vocabulary, Grammar, Learn and
   Listening (port of the original chapter-list rendering, including the
   special "All chapters" and essential entries). */
import * as React from 'react';
import { cn } from '@/lib/utils';
import { useT } from '@/components/providers';

export interface ChapterItem {
  n: number;
  t: string;
  count: number;
  extra?: boolean; /* true = special entry like "All kanji" / "Essential" */
}

export function ChapterGrid({
  chapters,
  active,
  onPick,
  search,
  onSearch,
  searchPlaceholder,
  controls,
  countNoun,
}: {
  chapters: ChapterItem[];
  active: number | string;
  onPick: (n: number | string) => void;
  search?: string;
  onSearch?: (q: string) => void;
  searchPlaceholder?: string;
  /* selection buttons rendered beside the search bar (Select / Learn selected / Clear) */
  controls?: React.ReactNode;
  /* noun for the count line under each chapter title, e.g. "kanji" → "11 kanji" */
  countNoun?: string;
}) {
  const { t } = useT();
  return (
    <div className="mb-4 space-y-3">
      {onSearch ? (
        /* search bar with the selection controls beside it, like the original site */
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={search || ''}
            onChange={(e) => onSearch(e.target.value)}
            placeholder={searchPlaceholder || t('Search')}
            className="h-9 min-w-[200px] flex-1 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
          />
          {controls}
        </div>
      ) : null}
      {/* chapter boxes — big number on top, chapter title, count underneath */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {chapters.map((c) => {
          const key = c.extra ? 'c_' + c.n + '_x' : c.n;
          const isActive = String(active) === String(key);
          return (
            <button
              key={key}
              type="button"
              onClick={() => onPick(key)}
              className={cn(
                'flex min-h-[7rem] flex-col items-center justify-center gap-0.5 rounded-xl border bg-card p-3 text-center shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md',
                c.extra && 'border-dashed',
                isActive ? 'border-primary bg-primary text-primary-foreground hover:bg-primary' : 'hover:bg-accent/40'
              )}
            >
              {c.extra || !c.t ? (
                /* special entries (All / Essential / All kanji…) and untitled chapters: icon instead of a number */
                <>
                  <span className="text-3xl leading-none">📖</span>
                  <span className="font-medium">{c.t || c.n + '章'}</span>
                </>
              ) : (
                /* regular chapters — big chapter number like the original site */
                <>
                  <span className={cn('text-3xl font-bold leading-none', isActive ? 'text-primary-foreground' : 'text-primary')}>{c.n}</span>
                  <span className="text-sm font-medium">{c.t}</span>
                </>
              )}
              {c.count ? (
                <span className={cn('text-xs', isActive ? 'text-primary-foreground/80' : 'text-muted-foreground')}>
                  {c.count}{countNoun ? ' ' + countNoun : ''}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
