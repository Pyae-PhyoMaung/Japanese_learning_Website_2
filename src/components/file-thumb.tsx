'use client';

/* Thumbnail used by the Files page and the Library page. Image blobs are
   only fetched once the card scrolls into view (IntersectionObserver), so a
   library of 100+ images doesn't all load at once; other file types show
   their category icon tile. */
import * as React from 'react';
import { fileGet } from '@/lib/files';
import { useT } from '@/components/providers';
import type { FileMeta } from '@/lib/types';

const CAT_ICON: Record<string, string> = { image: '🖼️', pdf: '📕', video: '🎬', audio: '🎵', doc: '📄', other: '📦' };

export function FileThumb({ m }: { m: FileMeta }) {
  const { t } = useT();
  const [url, setUrl] = React.useState<string | null>(null);
  const [failed, setFailed] = React.useState(false);
  const [vis, setVis] = React.useState(false);
  const boxRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const el = boxRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') { setVis(true); return; }
    const io = new IntersectionObserver(
      (es) => { if (es.some((e) => e.isIntersecting)) { setVis(true); io.disconnect(); } },
      { rootMargin: '300px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  React.useEffect(() => {
    if (!vis || m.cat !== 'image' || url || failed) return;
    let dead = false;
    fileGet(m.id)
      .then((rec) => { if (!dead && rec.blob) setUrl(URL.createObjectURL(rec.blob)); })
      .catch(() => { if (!dead) setFailed(true); });
    return () => { dead = true; };
  }, [vis, m.id, m.cat, url, failed]);

  React.useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);

  if (m.cat !== 'image') {
    return (
      <div className="flex h-28 items-center justify-center rounded-lg border bg-muted/30 text-4xl">
        <span>{CAT_ICON[m.cat || 'other'] || '📦'}</span>
      </div>
    );
  }
  return (
    <div ref={boxRef} className="flex h-28 items-center justify-center overflow-hidden rounded-lg border bg-muted/30">
      {url ? (
        <img src={url} alt={m.name} className="max-h-full max-w-full object-contain" loading="lazy" />
      ) : failed ? (
        <span className="text-4xl">🖼️</span>
      ) : (
        <span className="text-xs text-muted-foreground">{t('Loading…')}</span>
      )}
    </div>
  );
}
