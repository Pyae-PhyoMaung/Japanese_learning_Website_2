'use client';

/* Library — port of textbook.html: the bundled textbook PDFs (Minna no
   Nihongo N5 Myanmar, N5 Kanji Master) plus your uploaded PDFs and books
   from My Files, opened in an inline reader. The original rendered PDFs
   with pdf.js; this port uses the browser's native PDF viewer, which works
   the same for reading and page navigation on all modern browsers. */
import * as React from 'react';
import { filesList, fileGet } from '@/lib/files';
import { PageHead } from '@/components/page-head';
import { PdfReader } from '@/components/pdf-reader';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useT, useToast } from '@/components/providers';

const BUNDLED = [
  { name: 'Minna no Nihongo N5 (Myanmar)', path: '/assets/pdfs/Minna-no-Nihongo-N5-Myanmar.pdf', icon: '📕', cat: 'textbook' },
  { name: 'N5 Kanji Master', path: '/assets/pdfs/N5-Kanji-Master.pdf', icon: '📘', cat: 'kanji book' },
];

export default function TextbookPage() {
  const { t } = useT();
  const toast = useToast();
  const [mounted, setMounted] = React.useState(false);
  const [books, setBooks] = React.useState<any[]>([]);
  const [reader, setReader] = React.useState<{ name: string; url: string; bookKey: string; cat: string } | null>(null);

  React.useEffect(() => {
    setMounted(true);
    filesList().then((all) => setBooks(all.filter((m) => (m.cat || '') === 'pdf' || (m.cat || '') === 'doc'))).catch(() => {});
  }, []);

  const openBundled = (b: any) => setReader({ name: b.name, url: b.path, bookKey: b.path, cat: 'pdf' });
  const openMine = async (m: any) => {
    try {
      const rec = await fileGet(m.id);
      if (rec && rec.blob) setReader({ name: m.name || 'Book', url: URL.createObjectURL(rec.blob), bookKey: m.id, cat: m.cat || rec.cat || 'pdf' });
      else toast('Book not found on this device or the server.', 'err');
    } catch (e) {
      toast('Book not found on this device or the server.', 'err');
    }
  };

  return (
    <div>
      <PageHead icon="📖" title="Library" subtitle={'Pick a category below — PDF books (your two study books plus uploaded PDFs), images, videos, audio and documents each sit behind their own button. Your last page is remembered for each book.'} />
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">{t('Textbooks')}</h2>
      <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">{t('My books')} ({books.length})</h2>
      {!books.length ? (
        <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
          {t('No books yet — upload PDFs on the Files page and they appear here.')}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {books.map((m) => (
            <button key={m.id} type="button" onClick={() => openMine(m)} className="flex items-center gap-4 rounded-xl border bg-card p-4 text-left shadow-sm transition-colors hover:bg-accent/40">
              <span className="text-3xl">📕</span>
              <span className="min-w-0">
                <span className="block truncate font-medium">{m.name}</span>
                <span className="block text-xs text-muted-foreground">{m.added || ''}</span>
              </span>
            </button>
          ))}
        </div>
      )}
      {reader ? (
        <Dialog open onOpenChange={(o) => { if (!o) { if (reader.url.startsWith('blob:')) URL.revokeObjectURL(reader.url); setReader(null); } }}>
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
    </div>
  );
}
