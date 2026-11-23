'use client';

/* Shared kanji / vocabulary display — port of the original kanji-grid,
   word-grid, and detail views: cards with kana-page style tap-to-select
   (selected cards fill red), detail dialog with speak buttons,
   write-practice links, per-kanji memorization image (upload / pick /
   change / remove), and example words. */
import * as React from 'react';
import Link from 'next/link';
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogHeader } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { speak } from '@/lib/tts';
import { kimgGet, kimgSet } from '@/lib/jl';
import { fileGet, filePut, fileDel, filesList } from '@/lib/files';
import type { Kanji, Vocab, FileMeta } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useT, useToast } from '@/components/providers';

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
          'flex cursor-pointer flex-col gap-1 rounded-xl border bg-card p-4 shadow-sm transition-colors',
          selected ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-accent/40'
        )}
        onClick={() => (onToggle ? onToggle(v.id) : setOpen(true))}
      >
        <div className="flex items-center gap-2">
          <span className="text-xl font-medium">{v.jp}</span>
          <SpeakBtn text={v.jp} />
          {isKex ? <Badge variant="secondary">kex</Badge> : null}
        </div>
        {v.rd ? <div className={cn('text-sm', selected ? 'text-primary-foreground/80' : 'text-muted-foreground')}>{v.rd}</div> : null}
        {v.mm ? <div className="text-sm">{v.mm}</div> : null}
        {v.en ? <div className={cn('text-sm', selected ? 'text-primary-foreground/80' : 'text-muted-foreground')}>{v.en}</div> : null}
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
          'flex cursor-pointer flex-col items-center gap-1 rounded-xl border bg-card p-3 shadow-sm transition-colors',
          selected ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-accent/40'
        )}
        onClick={() => (onToggle ? onToggle(k.id) : setOpen(true))}
      >
        <div className="text-3xl font-medium">{k.kanji}</div>
        <div className={cn('text-center text-xs', selected ? 'text-primary-foreground/80' : 'text-muted-foreground')}>{k.on && k.on.length ? k.on.join('、') : k.kun || ''}</div>
        <div className="text-center text-xs">{(k.meaning || k.en || '').split(/[;；,，]/)[0]}</div>
      </div>
      {open ? <KanjiDetail k={k} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

function KanjiDetail({ k, onClose }: { k: Kanji; onClose: () => void }) {
  const { t } = useT();
  const toast = useToast();
  const [fid, setFid] = React.useState<string | null>(kimgGet(k.id));
  const [imgUrl, setImgUrl] = React.useState<string | null>(null);
  const [pickOpen, setPickOpen] = React.useState(false);
  const [images, setImages] = React.useState<FileMeta[]>([]);
  const fileInp = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!fid) { setImgUrl(null); return; }
    let alive = true;
    fileGet(fid).then((f) => {
      if (alive && f && f.blob) setImgUrl(URL.createObjectURL(f.blob));
    }).catch(() => {});
    return () => { alive = false; };
  }, [fid]);

  const attach = (id: string) => {
    kimgSet(k.id, id);
    setFid(id);
    setPickOpen(false);
  };

  const onUpload = (ev: React.ChangeEvent<HTMLInputElement>) => {
    const f = ev.target.files && ev.target.files[0];
    ev.target.value = '';
    if (!f) return;
    const ext = (f.name.split('.').pop() || 'png').toLowerCase();
    const meta: FileMeta = { id: 'f_kimg_' + k.id + '_' + Date.now(), cat: 'image', name: 'kanji_' + k.kanji + '.' + ext, type: f.type, size: f.size, added: new Date().toISOString().slice(0, 10) };
    filePut(meta, f).then((m) => {
      const old = kimgGet(k.id);
      if (old && String(old).indexOf('f_kimg_') === 0 && old !== m.id) fileDel(old);
      attach(m.id);
      toast('Image attached ✅', 'ok');
    }).catch(() => toast('Upload failed.', 'err'));
  };

  const openPicker = () => {
    filesList().then((all) => {
      const imgs = all.filter((m) => m.cat === 'image');
      if (!imgs.length) { toast('No images in your files yet — upload one instead.', 'warn'); return; }
      setImages(imgs);
      setPickOpen(true);
    });
  };

  const removeImg = () => {
    const old = fid;
    kimgSet(k.id, null);
    setFid(null);
    setImgUrl(null);
    /* a kanji-uploaded image is deleted from My Files too; an image picked
       from your own library is only unlinked, so your file stays */
    if (old && String(old).indexOf('f_kimg_') === 0) {
      fileDel(old);
      toast('Image removed and deleted from your files.', 'ok');
    } else {
      toast('Image removed.', 'ok');
    }
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent>
        <DialogHeader className="items-center">
          <DialogTitle className="w-full text-center text-[2.6rem] font-normal leading-tight">{k.kanji}</DialogTitle>
          <DialogDescription className="w-full space-y-2 text-center">
            <div className="flex flex-wrap items-center justify-center gap-2">
              {k.on && k.on.length ? <span className="rounded-md bg-primary px-2 py-0.5 text-sm text-primary-foreground">音 {k.on.join(' · ')}</span> : null}
              <span className="rounded-md border border-primary/60 bg-accent px-2 py-0.5 text-sm text-foreground">訓 {k.kun || '—'}</span>
            </div>
            <div className="text-base font-medium">
              {k.en || k.meaning}
              {k.en && k.meaning ? <span className="font-normal"> · {k.meaning}</span> : null}
            </div>
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button variant="outline" size="sm" onClick={() => speak(k.kanji)}>{t('🔊 Listen to the kanji')}</Button>
          <Link href={'/write?tab=kanji&k=' + encodeURIComponent(k.kanji)}><Button size="sm">{t('✍️ Practice writing')}</Button></Link>
        </div>
        <input ref={fileInp} type="file" accept="image/*" className="hidden" onChange={onUpload} />
        {pickOpen ? (
          <div className="rounded-xl border p-3">
            <h4 className="mb-2 font-semibold">{t('Pick an image from your files')}</h4>
            <div className="flex flex-wrap gap-2">
              {images.map((m) => (
                <Button key={m.id} variant="outline" size="sm" onClick={() => attach(m.id)}>{m.name || m.id}</Button>
              ))}
            </div>
            <Button variant="ghost" size="sm" className="mt-2" onClick={() => setPickOpen(false)}>↩ {t('Back')}</Button>
          </div>
        ) : (
          <div className="text-center">
            {fid ? (
              <>
                {imgUrl ? <img src={imgUrl} alt="memory image" className="mx-auto max-h-64 rounded-lg border" /> : null}
                <div className="mt-2 flex justify-center gap-2">
                  <Button size="sm" onClick={() => fileInp.current?.click()}>{t('🔄 Change image')}</Button>
                  <Button size="sm" variant="ghost" onClick={removeImg}>{t('🗑 Remove')}</Button>
                </div>
              </>
            ) : (
              <>
                <div className="flex justify-center gap-2">
                  <Button size="sm" onClick={() => fileInp.current?.click()}>{t('⬆️ Upload image')}</Button>
                  <Button size="sm" variant="outline" onClick={openPicker}>{t('🗂️ Pick from my files')}</Button>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{t('Add a picture that helps you remember this kanji (like the pictures in the N5 / N4 kanji books).')}</p>
              </>
            )}
          </div>
        )}
        {k.examples && k.examples.length ? (
          <div>
            <h4 className="mb-1 font-semibold">{t('Example words')}</h4>
            <div className="space-y-1">
              {k.examples.map((e, i) => (
                <div key={i} className="flex items-start gap-2 rounded-lg border px-3 py-2">
                  <SpeakBtn text={e.word} className="mt-0.5" />
                  <div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-xl font-medium">{e.word}</span>
                      {e.reading ? <span className="text-sm text-muted-foreground">{e.reading}</span> : null}
                    </div>
                    {e.meaning ? <div className="text-sm">{e.meaning}</div> : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
