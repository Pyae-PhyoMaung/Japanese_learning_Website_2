/* Uploaded files — same design as the original: blobs cached in IndexedDB
   ('jl-files'), metadata synced through the user record, and blobs uploaded
   to / downloaded from the Supabase 'jl-files' bucket (<= 40 MB). */
import type { FileMeta, UserRecord } from './types';
import { getUser, setUser, notify } from './store';
import { cloudEnabled, cloudFileUrl, cloudHeaders } from './config';
import { mmfixValue } from './zg';

const FDB_NAME = 'jl-files';

function fdb(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const rq = indexedDB.open(FDB_NAME, 1);
    rq.onupgradeneeded = () => { rq.result.createObjectStore('files'); };
    rq.onsuccess = () => { res(rq.result); };
    rq.onerror = () => { rej(rq.error); };
  });
}

function fop<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest): Promise<T> {
  return fdb().then(
    (db) =>
      new Promise<T>((res, rej) => {
        const tx = db.transaction('files', mode);
        const rq = fn(tx.objectStore('files'));
        rq.onsuccess = () => { res(rq.result as T); };
        rq.onerror = () => { rej(rq.error); };
      })
  );
}

export function fileCat(name: string, mime?: string): string {
  const n = String(name || '').toLowerCase();
  const m = String(mime || '');
  if (m.indexOf('pdf') >= 0 || /\.pdf$/.test(n)) return 'pdf';
  if (m.indexOf('image') >= 0 || /\.(png|jpe?g|gif|webp|bmp|svg)$/.test(n)) return 'image';
  if (m.indexOf('video') >= 0 || /\.(mp4|webm|mov|mkv|avi)$/.test(n)) return 'video';
  if (m.indexOf('audio') >= 0 || /\.(mp3|wav|m4a|ogg|aac)$/.test(n)) return 'audio';
  if (/\.(docx?|xlsx?|pptx?|txt|csv)$/.test(n)) return 'doc';
  return 'other';
}

export interface FileRec extends FileMeta {
  blob?: Blob;
}

function fileMetaAdd(meta: FileMeta) {
  meta = mmfixValue(meta);
  const u: any = getUser();
  if (!u.files || !u.files.added) u.files = { added: [] };
  const i = u.files.added.findIndex((m) => m.id === meta.id);
  if (i >= 0) u.files.added[i] = meta;
  else u.files.added.push(meta);
  setUser(u);
}

function fileMetaRemove(id: string) {
  const u: any = getUser();
  if (u.files && u.files.added) {
    u.files.added = u.files.added.filter((m: FileMeta) => m.id !== id);
    if (Array.isArray(u.files.trashed)) u.files.trashed = u.files.trashed.filter((m: FileMeta) => m.id !== id);
    setUser(u);
  }
}

/* ---------- Trash (prevention net) ----------
   Deleting normally moves the file to a trash list (metadata in the user
   record, blob kept in IndexedDB and on the server) so it can be restored.
   Only "delete forever" actually removes the blob everywhere. */

/* remote-only metadata first, then local IndexedDB rows (deduped by id) */
export async function filesList(): Promise<FileMeta[]> {
  const u: any = getUser();
  const meta = (u.files && u.files.added) || [];
  const gone: Record<string, boolean> = {};
  ((u.files && u.files.trashed) || []).forEach((m: FileMeta) => { gone[m.id] = true; });
  try {
    const rows: any[] = await fop<any>('readonly', (s) => s.getAll());
    const have: Record<string, boolean> = {};
    const local = rows
      .filter((r) => !r.trashed)
      .map((r) => ({ id: r.id, name: r.name, type: r.type, cat: r.cat || fileCat(r.name, r.type), size: r.size, added: r.added }));
    local.forEach((r) => { have[r.id] = true; });
    const remote = meta.filter((m: FileMeta) => !have[m.id] && !gone[m.id]);
    return remote.concat(local);
  } catch (e) {
    return meta.filter((m: FileMeta) => !gone[m.id]);
  }
}

/* everything currently in the Trash (metadata list + flagged local blobs) */
export async function filesTrashed(): Promise<FileMeta[]> {
  const u: any = getUser();
  const meta: FileMeta[] = (u.files && u.files.trashed) || [];
  const ids: Record<string, boolean> = {};
  meta.forEach((m) => { ids[m.id] = true; });
  try {
    const rows: any[] = await fop<any>('readonly', (s) => s.getAll());
    const flagged = rows
      .filter((r) => r && r.trashed && !ids[r.id])
      .map((r) => ({ id: r.id, name: r.name, type: r.type, cat: r.cat || fileCat(r.name, r.type), size: r.size, added: r.added }));
    return meta.concat(flagged);
  } catch (e) {
    return meta.slice();
  }
}

export async function filePut(meta: FileMeta, blob?: Blob): Promise<FileMeta> {
  try {
    await fop('readwrite', (s) => s.put({ id: meta.id, name: meta.name, type: meta.type, cat: meta.cat, size: meta.size, added: meta.added, blob }));
  } catch (e) {}
  fileMetaAdd(meta);
  /* also upload the blob to cloud storage when configured and not too big */
  if (blob && (blob.size || meta.size || 0) <= 40 * 1024 * 1024 && cloudEnabled()) {
    fetch(cloudFileUrl(meta.id), {
      method: 'POST',
      headers: cloudHeaders({ 'x-upsert': 'true', 'Content-Type': meta.type || 'application/octet-stream' }),
      body: blob,
    }).catch(() => {});
  }
  return meta;
}

export async function fileGet(id: string): Promise<FileRec> {
  const fromServer = async (): Promise<FileRec> => {
    if (!cloudEnabled()) throw new Error('File not found on this device and cloud sync is not configured');
    const r = await fetch(cloudFileUrl(id), { headers: cloudHeaders() });
    if (!r.ok) throw new Error('File not found on this device or the server');
    const b = await r.blob();
    const meta = ((getUser().files && getUser().files!.added) || []).filter((m) => m.id === id)[0] || ({} as FileMeta);
    return { id, name: meta.name || 'file', type: meta.type || '', cat: meta.cat || 'other', size: meta.size || b.size, added: meta.added || '', blob: b };
  };
  try {
    const rec: any = await fop<any>('readonly', (s) => s.get(id));
    if (rec && rec.blob) return rec;
  } catch (e) {}
  return fromServer();
}

export async function fileTrash(id: string) {
  const u: any = getUser();
  if (!u.files || !Array.isArray(u.files.added)) u.files = { added: [] };
  const added = u.files.added as FileMeta[];
  const ix = added.findIndex((m) => m.id === id);
  let meta: FileMeta | null = ix >= 0 ? added[ix] : null;
  if (ix >= 0) added.splice(ix, 1);
  /* keep the local blob, just flag the row */
  try {
    const rec: any = await fop<any>('readonly', (s) => s.get(id));
    if (rec) {
      meta = { id, name: rec.name, type: rec.type, cat: rec.cat || fileCat(rec.name, rec.type), size: rec.size, added: rec.added };
      rec.trashed = true;
      await fop('readwrite', (s) => s.put(rec));
    }
  } catch (e) {}
  if (meta) {
    const trashed: FileMeta[] = Array.isArray(u.files.trashed) ? u.files.trashed : [];
    u.files.trashed = trashed.filter((x) => x.id !== id).concat([meta]);
  }
  setUser(u);
}

export async function fileRestore(id: string) {
  const u: any = getUser();
  const trashed: FileMeta[] = (u.files && Array.isArray(u.files.trashed)) ? u.files.trashed : [];
  const m = trashed.filter((x) => x.id === id)[0];
  if (m) {
    if (!u.files || !Array.isArray(u.files.added)) u.files = { added: [] };
    (u.files.added as FileMeta[]).push(m);
    u.files.trashed = trashed.filter((x) => x.id !== id);
    setUser(u);
  }
  try {
    const rec: any = await fop<any>('readonly', (s) => s.get(id));
    if (rec) {
      delete rec.trashed;
      await fop('readwrite', (s) => s.put(rec));
    }
  } catch (e) {}
}

export function fileDel(id: string) {
  fileMetaRemove(id);
  if (cloudEnabled()) {
    try { fetch(cloudFileUrl(id), { method: 'DELETE', headers: cloudHeaders() }).catch(() => {}); } catch (e) {}
  }
  return fop('readwrite', (s) => s.delete(id)).catch(() => {});
}

/* metadata for external use (name/category by id), without loading the blob */
export function fileMetaById(id: string): FileMeta | null {
  return ((getUser().files && getUser().files!.added) || []).filter((m) => m.id === id)[0] || null;
}
