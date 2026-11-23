'use client';

/* Files — port of files.html: upload files (category auto-detected by
   name/MIME, like the original), list them per category, preview images /
   PDFs / video / audio in a dialog, and delete (removes metadata, the
   IndexedDB copy, and the cloud object). */
import * as React from 'react';
import { filesList, filePut, fileGet, fileDel, fileCat, type FileRec } from '@/lib/files';
import type { FileMeta } from '@/lib/types';
import { PageHead } from '@/components/page-head';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useT, useToast } from '@/components/providers';
import { fmtSize, uid } from '@/lib/utils';

const CATS = ['image', 'pdf', 'video', 'audio', 'doc', 'other'];
const CAT_ICON: Record<string, string> = { image: '🖼️', pdf: '📕', video: '🎬', audio: '🎵', doc: '📄', other: '📦' };

export default function FilesPage() {
  const { t } = useT();
  const toast = useToast();
  const [mounted, setMounted] = React.useState(false);
  const [files, setFiles] = React.useState<FileMeta[]>([]);
  const [cat, setCat] = React.useState('all');
  const [preview, setPreview] = React.useState<{ url: string; rec: FileRec } | null>(null);

  const refresh = React.useCallback(() => { filesList().then(setFiles).catch(() => setFiles([])); }, []);
  React.useEffect(() => { setMounted(true); refresh(); }, [refresh]);

  const upload = (f: File | null) => {
    if (!f) return;
    if ((f.size || 0) > 40 * 1024 * 1024) { toast('Files up to 40 MB, please.', 'warn'); return; }
    const meta = { id: uid('f_'), cat: fileCat(f.name, f.type), name: f.name, type: f.type, size: f.size, added: new Date().toISOString().slice(0, 10) };
    filePut(meta, f).then(() => { refresh(); toast('File saved ✅', 'ok'); }).catch(() => toast('Upload failed.', 'err'));
  };

  const open = async (m: FileMeta) => {
    try {
      const rec = await fileGet(m.id);
      if (rec && rec.blob) setPreview({ url: URL.createObjectURL(rec.blob), rec: { ...rec, name: m.name || rec.name } });
      else toast('File not found on this device or the server.', 'err');
    } catch (e) {
      toast('File not found on this device or the server.', 'err');
    }
  };

  const del = (m: FileMeta) => {
    fileDel(m.id).then(() => { refresh(); toast('File deleted 🗑', 'ok'); });
  };

  const list = cat === 'all' ? files : files.filter((m) => (m.cat || 'other') === cat);

  return (
    <div>
      <PageHead icon="🗂️" title="Files" subtitle={'Upload study materials for each file type — every category below has its own Upload button. Uploaded files also appear in the Library page (PDFs open in the reader; images, videos, audio and documents have their own buttons there), and everything syncs to your account. Click a category header to open or close it.'} />
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <input type="file" className="hidden" id="f-up" onChange={(e) => upload(e.target.files && e.target.files[0])} />
        <Button onClick={() => (document.getElementById('f-up') as HTMLInputElement)?.click()}>⬆️ {t('Upload file')}</Button>
        <span className="text-xs text-muted-foreground">PDF · image · video · audio · doc — up to 40 MB</span>
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        <button type="button" onClick={() => setCat('all')} className={'rounded-lg border px-3 py-1.5 text-sm hover:bg-accent' + (cat === 'all' ? ' border-primary bg-primary text-primary-foreground' : '')}>
          {t('All')} ({files.length})
        </button>
        {CATS.map((c) => {
          const n = files.filter((m) => (m.cat || 'other') === c).length;
          return (
            <button key={c} type="button" onClick={() => setCat(c)} className={'rounded-lg border px-3 py-1.5 text-sm hover:bg-accent' + (cat === c ? ' border-primary bg-primary text-primary-foreground' : '')}>
              {CAT_ICON[c]} {c} ({n})
            </button>
          );
        })}
      </div>
      {!list.length ? (
        <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">{t('No files yet — upload your first one!')}</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((m) => (
            <div key={m.id} className="flex items-center gap-3 rounded-xl border bg-card p-4 shadow-sm">
              <span className="text-2xl">{CAT_ICON[m.cat || 'other'] || '📦'}</span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{m.name}</div>
                <div className="text-xs text-muted-foreground">{fmtSize(m.size)}{m.added ? ' · ' + m.added : ''}</div>
              </div>
              <Button size="sm" variant="outline" onClick={() => open(m)}>{t('Open')}</Button>
              <Button size="sm" variant="ghost" onClick={() => del(m)}>🗑</Button>
            </div>
          ))}
        </div>
      )}
      {preview ? (
        <Dialog open onOpenChange={(o) => { if (!o) { URL.revokeObjectURL(preview.url); setPreview(null); } }}>
          <DialogContent className="max-w-3xl">
            <DialogTitle className="truncate pr-8">{preview.rec.name || 'File'}</DialogTitle>
            <div className="max-h-[70vh] overflow-auto rounded-lg border">
              {(preview.rec.cat === 'image') ? (
                <img src={preview.url} alt={preview.rec.name} className="w-full" />
              ) : (preview.rec.cat === 'video') ? (
                <video src={preview.url} controls className="w-full" />
              ) : (preview.rec.cat === 'audio') ? (
                <audio src={preview.url} controls className="w-full p-4" />
              ) : (preview.rec.cat === 'pdf') ? (
                <iframe src={preview.url} title={preview.rec.name} className="h-[70vh] w-full" />
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
