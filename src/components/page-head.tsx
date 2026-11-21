'use client';

/* Page heading — port of the original .head (icon tile + page-title + subtitle). */
import { useT } from '@/components/providers';

export function PageHead({ icon, title, subtitle }: { icon: string; title: string; subtitle?: string }) {
  const { t } = useT();
  return (
    <div className="mb-6 flex items-center gap-3">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl border bg-muted/40 text-2xl">{icon}</div>
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t(title)}</h1>
        {subtitle ? <p className="text-sm text-muted-foreground">{subtitle}</p> : null}
      </div>
    </div>
  );
}
