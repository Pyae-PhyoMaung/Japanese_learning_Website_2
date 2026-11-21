'use client';

import { LEVELS, level, setLevel, useJL } from '@/lib/jl';
import { cn } from '@/lib/utils';
import { useT } from '@/components/providers';

/* every page that wants the level picker renders <LevelBar /> (port of JL.levelBar) */
export function LevelBar() {
  useJL();
  const { t } = useT();
  const cur = typeof window === 'undefined' ? 'N5' : level();
  return (
    <div className="mb-4 flex flex-wrap items-center gap-1 rounded-lg border bg-muted/40 p-2">
      <span className="px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('JLPT')}</span>
      {LEVELS.map((l) => (
        <button
          key={l}
          type="button"
          title={'Show ' + l + ' content'}
          className={cn(
            'rounded-md px-3 py-1 text-sm font-medium transition-colors hover:bg-accent',
            l === cur ? 'bg-primary text-primary-foreground' : ''
          )}
          onClick={() => setLevel(l)}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
