'use client';

/* Library — port of textbook.html's "My Library": six category tiles (PDF
   books, images, videos, audio, documents, other files) with live counts,
   like the original site. Clicking a tile opens that category's files below
   — the bundled study books and uploaded PDFs open in the pdf.js reader
   (which remembers your last page), images / videos / audio open a preview
   dialog. Uploaded files come from the Files page. */
import * as React from 'react';
import Link from 'next/link';
import { filesList, fileGet, type FileRec } from '@/lib/files';
import { PageHead } from '@/components/page-head';
import { PdfReader } from '@/components/pdf-reader';
import { FileThumb } from '@/components/file-thumb';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useT, useToast } from '@/components/providers';
import { fmtSize } from '@/lib/utils';

const BUNDLED = [
  { name: 'Minna no Nihongo N5 (Myanmar)', path: '/assets/pdfs/Minna-no-Nihongo-N5-Myanmar.pdf', icon: '📕', cat: 'textbook' },
  { name: 'N5 Kanji Master', path: '/assets/pdfs/N5-Kanji-Master.pdf', icon: '📘', cat: 'kanji book' },
];

const CATS = [
  { key: 'pdf', icon: '📚', label: 'PDF books', unit: 'book(s)' },
  { key: 'image', icon: '🖼️', label: 'Images', unit: 'image(s)' },
  { key: 'video', icon: '🎬', label: 'Videos', unit: 'video(s)' },
  { key: 'audio', icon: '🎵', label: 'Audio', unit: 'audio(s)' },
  { key: 'doc', icon: '📄', label: 'Documents', unit: 'document(s)' },
  { key: 'other', icon: '📦', label: 'Other files', unit: 'file(s)' },
];

export default function TextbookPage() {
  const { t } = useT();
  const toast = useToast();
  const [mounted, setMounted] = React.useState(false);
  const [files, setFiles] = React.useState<any[]>([]);
  const [cat, setCat] = React.useState<string | null>(null);
  const [reader, setReader] = React.useState<{ name: string; url: string; bookKey: string; cat: string } | null>(null);
  const [preview, setPreview] = React.useState<{ url: string; rec: FileRec } | null>(null);

  React.useEffect(() => {
    setMounted(true);
    filesList().then(setFiles).catch(() => {});
  }, []);

  const byCat = (c: string) => files.filter((m) => (m.cat || 'other') === c);
  const pdfCount = BUNDLED.length + byCat('pdf').length;
  const countOf = (key: string) => (key === 'pdf' ? pdfCount : byCat(key).length);

  const openBundled = (b: any) => setReader({ name: b.name, url: b.path, bookKey: b.path, cat: 'pdf' });
  const openFile = async (m: any) => {
    try {
      const rec = await fileGet(m.id);
      if (!rec || !rec.blob) throw new Error('not found');
      const c = m.cat || rec.cat || 'other';
      if (c === 'pdf') setReader({ name: m.name || 'Book', url: URL.createObjectURL(rec.blob), bookKey: m.id, cat: 'pdf' });
      else setPreview({ url: URL.createObjectURL(rec.blob), rec: { ...rec, name: m.name || rec.name, cat: c } });
    } catch (e) {
      toast('File not found on this device or the server.', 'err');
    }
  };

  const closeReader = () => { if (reader && reader.url.startsWith('blob:')) URL.revokeObjectURL(reader.url); setReader(null); };
  const closePreview = () => { if (preview) URL.revokeObjectURL(preview.url); setPreview(null); };

  const active = CATS.filter((c) => c.key === cat)[0] || null;
  const catFiles = active ? byCat(active.key) : [];

  return (
    <div>
      <PageHead icon="📖" title="My Library" subtitle={'Pick a category below — PDF books (your two study books plus uploaded PDFs), images, videos, audio and documents each sit behind their own button. Your last page is remembered for each book.'} />

      {/* category tiles — like the original site */}
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {CATS.map((c) => (
          <button
            key={c.key}
            type="button"
            onClick={() => setCat(cat === c.key ? null : c.key)}
            className={'rounded-xl border bg-card p-6 text-center shadow-sm transition-colors hover:bg-accent/40' + (cat === c.key ? ' border-primary ring-1 ring-primary' : '')}
          >
            <span className="block text-4xl">{c.icon}</span>
            <span className="mt-2 block text-sm font-medium">{t(c.label)}</span>
            <span className="mt-1 block text-xs text-muted-foreground">
              {mounted ? countOf(c.key) : '…'} {t(c.unit)}
            </span>
          </button>
        ))}
      </div>

      {active ? (
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {active.icon} {t(active.label)} ({active.key === 'pdf' ? pdfCount : catFiles.length})
          </h2>
          {active.key === 'pdf' ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {BUNDLED.map((b) => (
                <button key={b.path} type="button" onClick={() => openBundled(b)} className="flex items-center gap-4 rounded-xl border bg-card p-4 text-left shadow-sm transition-colors hover:bg-accent/40">
                  <span className="text-3xl">{b.icon}</span>
                  <span>
                    <span className="block font-medium">{b.name}</span>
                    <span className="block text-xs text-muted-foreground">{b.cat} · PDF</span>
                  </span>
                </button>
              ))}
            </div>
          ) : !catFiles.length ? (
            <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
              {t('No files here yet — upload on the Files page and they appear here.')}
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {catFiles.map((m) => (
                <div key={m.id} className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm">
                  <FileThumb m={m} />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium" title={m.name}>{m.name}</div>
                    <div className="text-xs text-muted-foreground">{fmtSize(m.size)}{m.added ? ' · ' + m.added : ''}</div>
                  </div>
                  <div>
                    <Button size="sm" variant="outline" onClick={() => openFile(m)}>{t('Open')}</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}

      <p className="mt-10 text-center text-xs text-muted-foreground">
        {t('The reader loads PDF.js from a CDN, so an internet connection is required the first time. The study books live in the assets/pdfs folder; uploaded files come from the')}{' '}
        <Link href="/files" className="underline">{t('My Files')}</Link>
        {' '}{t('page and are stored in this browser + your account.')}
      </p>

      {reader ? (
        <Dialog open onOpenChange={(o) => { if (!o) closeReader(); }}>
          <DialogContent className="flex h-[94vh] max-h-[94vh] w-[96vw] max-w-[96vw] flex-col overflow-hidden p-4">
            <DialogTitle className="truncate pr-8">{reader.name}</DialogTitle>
            {reader.cat === 'pdf' ? (
              <PdfReader url={reader.url} bookKey={reader.bookKey} name={reader.name} />
            ) : (
              <iframe src={reader.url} title={reader.name} className="min-h-0 w-full flex-1 rounded-lg border" />
            )}
          </DialogContent>
        </Dialog>
      ) : null}

      {preview ? (
        <Dialog open onOpenChange={(o) => { if (!o) closePreview(); }}>
          <DialogContent className="max-w-3xl">
            <DialogTitle className="truncate pr-8">{preview.rec.name || 'File'}</DialogTitle>
            <div className="max-h-[70vh] overflow-auto rounded-lg border">
              {preview.rec.cat === 'image' ? (
                <img src={preview.url} alt={preview.rec.name} className="w-full" />
              ) : preview.rec.cat === 'video' ? (
                <video src={preview.url} controls className="w-full" />
              ) : preview.rec.cat === 'audio' ? (
                <audio src={preview.url} controls className="w-full p-4" />
              ) : (
                <div className="p-6 text-center">
                  <Badge variant="outline">{preview.rec.cat || 'other'}</Badge>
                  <p className="mt-2 text-sm text-muted-foreground">{t('No inline preview for this file type.')}</p>
                  <a href={preview.url} download={preview.rec.name || 'file'} className="mt-3 inline-block"><Button size="sm">{t('Download')}</Button></a>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  );
}
