'use client';

/* Shared kanji / vocabulary display — port of the original kanji-grid,
   word-grid, and detail views: cards with select checkboxes (for Tests /
   Learn decks), detail dialog with speak buttons, write-practice links,
   kex (kanji-example) badge, per-kanji memorization image, and the
   fill-in-the-blank quiz from kanji examples. */
import * as React from 'react';
import Link from 'next/link';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Quiz } from '@/components/quiz';
import { speak } from '@/lib/tts';
import { kimgGet } from '@/lib/jl';
import { fileGet } from '@/lib/files';
import type { Kanji, Vocab } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useT } from '@/components/providers';

export function SpeakBtn({ text, className }: { text: string; className?: string }) {
  return (
    <button type="button" title="Listen" className={cn('rounded-md px-2 py-1 text-sm hover:bg-accent', className)} onClick={() => speak(text)}>
      🔊
    </button>
  );
}

/* ---------------- vocabulary ---------------- */

export function VocabCard({ v, selected, onToggle }: { v: Vocab; selected?: boolean; onToggle?: (id: string) => void }) {
  const { t } = useT();
  const [open, setOpen] = React.useState(false);
  const isKex = v.cat === 'kex';
  return (
    <>
      <div
        className={cn(
          'flex cursor-pointer flex-col gap-1 rounded-xl border bg-card p-4 shadow-sm transition-colors hover:bg-accent/40',
          selected && 'ring-2 ring-primary'
        )}
        onClick={() => setOpen(true)}
      >
        {onToggle ? (
          <input
            type="checkbox"
            className="mb-1 h-4 w-4 accent-[var(--primary)]"
            checked={!!selected}
            onClick={(e) => e.stopPropagation()}
            onChange={() => onToggle(v.id)}
          />
        ) : null}
        <div className="flex items-center gap-2">
          <span className="text-xl font-medium">{v.jp}</span>
          <SpeakBtn text={v.jp} />
          {isKex ? <Badge variant="secondary">kex</Badge> : null}
        </div>
        {v.rd ? <div className="text-sm text-muted-foreground">{v.rd}</div> : null}
        {v.mm ? <div className="text-sm">{v.mm}</div> : null}
        {v.en ? <div className="text-sm text-muted-foreground">{v.en}</div> : null}
        {v.cat && !isKex ? <Badge variant="outline" className="mt-1 w-fit">{v.cat}</Badge> : null}
      </div>
      {open ? <VocabDetail v={v} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

function VocabDetail({ v, onClose }: { v: Vocab; onClose: () => void }) {
  const { t } = useT();
  const chars = (v.jp || '').split(/[\u3000\s]/).join('').split('').filter((c) => /[一-龯぀-ゟ゠-ヿ]/.test(c));
  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-3">
            <DialogTitle className="text-3xl">{v.jp}</DialogTitle>
            <SpeakBtn text={v.jp} className="text-lg" />
            {v.cat === 'kex' ? <Badge variant="secondary">kex</Badge> : null}
          </div>
          <DialogDescription>
            {v.rd ? <div>{v.rd}</div> : null}
            {v.romaji ? <div className="italic">{v.romaji}</div> : null}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          {v.mm ? <div className="text-lg">{v.mm}</div> : null}
          {v.en ? <div className="text-muted-foreground">{v.en}</div> : null}
          {v.syn ? <div><span className="text-xs uppercase text-muted-foreground">syn: </span>{v.syn}</div> : null}
          {v.ant ? <div><span className="text-xs uppercase text-muted-foreground">ant: </span>{v.ant}</div> : null}
          {v.chapter ? (
            <div className="text-sm text-muted-foreground">
              {t('Chapter')} {v.chapter}{v.chapterTitle ? ' · ' + v.chapterTitle : ''}
            </div>
          ) : null}
          {chars.length ? (
            <div className="pt-2">
              <div className="mb-1 text-xs uppercase text-muted-foreground">{t('Characters')}</div>
              <div className="flex flex-wrap gap-2">
                {chars.map((c, i) => (
                  <Link key={i} href={'/write?k=' + encodeURIComponent(c)} className="rounded-md border bg-muted/40 px-3 py-1.5 text-lg hover:bg-accent" title={t('Practice writing')}>
                    {c}
                  </Link>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------- kanji ---------------- */

export function KanjiCard({ k, selected, onToggle }: { k: Kanji; selected?: boolean; onToggle?: (id: string) => void }) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <div
        className={cn(
          'flex cursor-pointer flex-col items-center gap-1 rounded-xl border bg-card p-3 shadow-sm transition-colors hover:bg-accent/40',
          selected && 'ring-2 ring-primary'
        )}
        onClick={() => setOpen(true)}
      >
        {onToggle ? (
          <input
            type="checkbox"
            className="h-4 w-4 accent-[var(--primary)]"
            checked={!!selected}
            onClick={(e) => e.stopPropagation()}
            onChange={() => onToggle(k.id)}
          />
        ) : null}
        <div className="text-3xl font-medium">{k.kanji}</div>
        <div className="text-center text-xs text-muted-foreground">{k.on && k.on.length ? k.on.join('、') : k.kun || ''}</div>
        <div className="text-center text-xs">{(k.meaning || k.en || '').split(/[;；,，]/)[0]}</div>
      </div>
      {open ? <KanjiDetail k={k} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

function KanjiDetail({ k, onClose }: { k: Kanji; onClose: () => void }) {
  const { t } = useT();
  const [imgUrl, setImgUrl] = React.useState<string | null>(null);
  const [fillOpen, setFillOpen] = React.useState(false);
  const imgId = kimgGet(k.id);

  React.useEffect(() => {
    if (!imgId) { setImgUrl(null); return; }
    fileGet(imgId).then((f) => {
      if (f && f.blob) setImgUrl(URL.createObjectURL(f.blob));
    }).catch(() => {});
  }, [imgId]);

  const fillItems = (k.examples || []).map((e) => ({
    q: (e.word || '').replace(k.kanji, '___'),
    opts: [k.kanji].concat(['人', '日', '本', '語'].filter((c) => c !== k.kanji).slice(0, 3)),
    ans: 0,
    say: e.word,
  }));

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-3">
            <DialogTitle className="text-5xl font-normal">{k.kanji}</DialogTitle>
            <div className="space-y-1">
              <SpeakBtn text={k.kanji} className="text-lg" />
              <Link href={'/write?k=' + encodeURIComponent(k.kanji)} className="block rounded-md px-2 py-1 text-sm hover:bg-accent">✍️ {t('Practice writing')}</Link>
            </div>
          </div>
          <DialogDescription>
            {k.on && k.on.length ? <div><span className="text-xs uppercase">ON: </span>{k.on.join('、')}</div> : null}
            {k.kun ? <div><span className="text-xs uppercase">KUN: </span>{k.kun}</div> : null}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          {k.meaning ? <div className="text-lg">{k.meaning}</div> : null}
          {k.en ? <div className="text-muted-foreground">{k.en}</div> : null}
          {k.chapter ? <div className="text-sm text-muted-foreground">{t('Chapter')} {k.chapter}{k.chapterTitle ? ' · ' + k.chapterTitle : ''}</div> : null}
          {imgUrl ? (
            <img src={imgUrl} alt="memorization" className="mt-2 max-h-48 rounded-lg border" />
          ) : null}
          {k.examples && k.examples.length ? (
            <div className="pt-2">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs uppercase text-muted-foreground">{t('Examples')}</span>
                {fillItems.length ? (
                  <Button variant="outline" size="sm" onClick={() => setFillOpen(!fillOpen)}>{t('Fill-blank quiz')}</Button>
                ) : null}
              </div>
              {fillOpen ? (
                <Quiz items={fillItems} title={k.kanji} />
              ) : (
                <div className="space-y-1">
                  {k.examples.map((e, i) => (
                    <div key={i} className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2">
                      <span className="font-medium">{e.word}</span>
                      <SpeakBtn text={e.word} />
                      {e.reading ? <span className="text-sm text-muted-foreground">{e.reading}</span> : null}
                      {e.meaning ? <span className="text-sm">{e.meaning}</span> : null}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
