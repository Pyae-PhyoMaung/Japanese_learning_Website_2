'use client';

/* Files — port of files.html: upload files (category auto-detected by
   name/MIME, like the original), list them per category, preview images /
   PDFs / video / audio in a dialog, and delete — deleting moves the file to
   a Trash (metadata + blob kept, restorable) so nothing is lost by mistake;
   "delete forever" from the Trash actually removes metadata, the IndexedDB
   copy and the cloud object. */
import * as React from 'react';
import { filesList, filesTrashed, filePut, fileGet, fileTrash, fileRestore, fileDel, fileCat, type FileRec } from '@/lib/files';
import { FileThumb } from '@/components/file-thumb';
import type { FileMeta } from '@/lib/types';
import { PageHead } from '@/components/page-head';
import { PdfReader } from '@/components/pdf-reader';
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
  const [confirmDel, setConfirmDel] = React.useState<FileMeta | null>(null);
  const [trash, setTrash] = React.useState<FileMeta[]>([]);
  const [trashView, setTrashView] = React.useState(false);
  const [confirmPurge, setConfirmPurge] = React.useState<FileMeta | null>(null);

  const refresh = React.useCallback(() => {
    filesList().then(setFiles).catch(() => setFiles([]));
    filesTrashed().then(setTrash).catch(() => setTrash([]));
  }, []);
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
    fileTrash(m.id).then(() => { refresh(); toast('Moved to Trash ♻️', 'ok'); });
  };
  const restore = (m: FileMeta) => {
    fileRestore(m.id).then(() => { refresh(); toast('File restored ♻️', 'ok'); });
  };
  const purge = (m: FileMeta) => {
    fileDel(m.id).then(() => { refresh(); toast('Deleted forever 🗑', 'ok'); });
  };

  const list = cat === 'all' ? files : files.filter((m) => (m.cat || 'other') === cat);

  return (
    <div>
      <PageHead icon="🗂️" title="Files" subtitle={'Upload study materials for each file type — every category below has its own Upload button. Uploaded files also appear in the Library page (PDFs open in the reader; images, videos, audio and documents have their own buttons there), and everything syncs to your account. Click a category header to open or close it.'} />
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <input type="file" className="hidden" id="f-up" onChange={(e) => upload(e.target.files && e.target.files[0])} />
        <Button onClick={() => (document.getElementById('f-up') as HTMLInputElement)?.click()}>⬆️ {t('Upload file')}</Button>
        <Button variant="outline" onClick={() => setTrashView(!trashView)}>🗑 {t('Trash')} ({trash.length})</Button>
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
      {!trashView ? !list.length ? (
        <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">{t('No files yet — upload your first one!')}</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {list.map((m) => (
            <div key={m.id} className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm">
              <FileThumb m={m} />
              <div className="min-w-0">
                <div className="truncate text-sm font-medium" title={m.name}>{m.name}</div>
                <div className="text-xs text-muted-foreground">{fmtSize(m.size)}{m.added ? ' · ' + m.added : ''}</div>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => open(m)}>{t('Open')}</Button>
                <Button size="sm" variant="ghost" className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive" title={t('Move to Trash?')} aria-label={t('Delete')} onClick={() => setConfirmDel(m)}>🗑</Button>
              </div>
            </div>
          ))}
        </div>
      ) : null}
      {trashView ? (
        trash.length ? (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">{t('Trashed files are kept (also on the server) until you delete them forever.')}</p>
            {trash.map((m) => (
              <div key={m.id} className="flex items-center gap-3 rounded-xl border bg-card p-3 shadow-sm">
                <span className="text-2xl">🗑</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium" title={m.name}>{m.name}</div>
                  <div className="text-xs text-muted-foreground">{fmtSize(m.size)}{m.added ? ' · ' + m.added : ''}</div>
                </div>
                <Button size="sm" variant="outline" onClick={() => restore(m)}>♻️ {t('Restore')}</Button>
                <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10" title={t('Delete forever')} aria-label={t('Delete forever')} onClick={() => setConfirmPurge(m)}>🗑</Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">{t('Trash is empty.')}</p>
        )
      ) : null}
      {preview ? (
        <Dialog open onOpenChange={(o) => { if (!o) { URL.revokeObjectURL(preview.url); setPreview(null); } }}>
          <DialogContent className={preview.rec.cat === 'pdf' ? 'flex h-[94vh] max-h-[94vh] w-[96vw] max-w-[96vw] flex-col overflow-hidden p-4' : 'max-w-3xl'}>
            <DialogTitle className="truncate pr-8">{preview.rec.name || 'File'}</DialogTitle>
            {preview.rec.cat === 'pdf' ? (
              <PdfReader url={preview.url} bookKey={preview.rec.id} name={preview.rec.name || 'PDF'} />
            ) : (
            <div className="max-h-[70vh] overflow-auto rounded-lg border">
              {(preview.rec.cat === 'image') ? (
                <img src={preview.url} alt={preview.rec.name} className="w-full" />
              ) : (preview.rec.cat === 'video') ? (
                <video src={preview.url} controls className="w-full" />
              ) : (preview.rec.cat === 'audio') ? (
                <audio src={preview.url} controls className="w-full p-4" />
              ) : (
                <div className="p-6 text-center">
                  <Badge variant="outline">{preview.rec.cat || 'other'}</Badge>
                  <p className="mt-2 text-sm text-muted-foreground">{t('No inline preview for this file type.')}</p>
                  <a href={preview.url} download={preview.rec.name || 'file'} className="mt-3 inline-block"><Button size="sm">{t('Download')}</Button></a>
                </div>
              )}
            </div>
            )}
          </DialogContent>
        </Dialog>
      ) : null}
      {confirmDel ? (
        <Dialog open onOpenChange={(o) => { if (!o) setConfirmDel(null); }}>
          <DialogContent className="max-w-md">
            <DialogTitle>{t('Move to Trash?')}</DialogTitle>
            <p className="text-sm text-muted-foreground">
              {confirmDel.name} — {t('You can restore it from Trash.')}
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setConfirmDel(null)}>{t('Cancel')}</Button>
              <Button variant="destructive" onClick={() => { const m = confirmDel; setConfirmDel(null); del(m); }}>{t('Move to Trash')}</Button>
            </div>
          </DialogContent>
        </Dialog>
      ) : null}
      {confirmPurge ? (
        <Dialog open onOpenChange={(o) => { if (!o) setConfirmPurge(null); }}>
          <DialogContent className="max-w-md">
            <DialogTitle>{t('Delete forever?')}</DialogTitle>
            <p className="text-sm text-muted-foreground">
              {confirmPurge.name} — {t("This can't be undone.")}
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setConfirmPurge(null)}>{t('Cancel')}</Button>
              <Button variant="destructive" onClick={() => { const m = confirmPurge; setConfirmPurge(null); purge(m); }}>{t('Delete forever')}</Button>
            </div>
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  );
}
