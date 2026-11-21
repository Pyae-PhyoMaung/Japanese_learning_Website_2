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
}: {
  chapters: ChapterItem[];
  active: number | string;
  onPick: (n: number | string) => void;
  search?: string;
  onSearch?: (q: string) => void;
  searchPlaceholder?: string;
}) {
  const { t } = useT();
  return (
    <div className="mb-4 space-y-3">
      {onSearch ? (
        <input
          value={search || ''}
          onChange={(e) => onSearch(e.target.value)}
          placeholder={searchPlaceholder || t('Search')}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
        />
      ) : null}
      <div className="flex flex-wrap gap-2">
        {chapters.map((c) => {
          const key = c.extra ? 'c_' + c.n + '_x' : c.n;
          const isActive = String(active) === String(key);
          return (
            <button
              key={key}
              type="button"
              onClick={() => onPick(key)}
              className={cn(
                'rounded-lg border px-3 py-2 text-left text-sm transition-colors hover:bg-accent',
                c.extra && 'border-dashed',
                isActive ? 'border-primary bg-primary text-primary-foreground hover:bg-primary' : ''
              )}
            >
              {c.t ? (
                <>
                  <span className="mr-1 font-medium">{c.n}</span>
                  <span className={cn(isActive ? 'text-primary-foreground/90' : 'text-muted-foreground')}>{c.t}</span>
                </>
              ) : (
                <span className="font-medium">{c.n}</span>
              )}
              {c.count ? <span className={cn('ml-2 rounded-full px-1.5 py-0.5 text-xs', isActive ? 'bg-primary-foreground/20' : 'bg-muted')}>{c.count}</span> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
