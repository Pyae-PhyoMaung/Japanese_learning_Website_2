/* User store — same localStorage key, same shape, same merge rules as the
   original site's js/app.js. A tiny pub/sub lets React re-render on change
   (the old site re-ran the page; here components subscribe instead). */
import type { UserRecord, KindStore } from './types';
import { mmfixValue } from './zg';
import { schedulePush } from './sync';

export const STORE_KEY = 'jl_user_v1';
export const KINDS = ['kanji', 'vocab', 'grammar', 'sentences', 'tests'] as const;

type Listener = () => void;
const listeners = new Set<Listener>();
let version = 0;

export function subscribe(cb: Listener): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
export function getVersion(): number { return version; }
export function notify() { version++; listeners.forEach((l) => { try { l(); } catch (e) {} }); }

export function getUser(): UserRecord {
  try { return JSON.parse(localStorage.getItem(STORE_KEY) || '{}') || {}; } catch (e) { return {}; }
}

export function setUser(u: UserRecord) {
  u._sync = { at: Date.now(), dev: String(navigator.userAgent || '').slice(0, 40) };
  try { localStorage.setItem(STORE_KEY, JSON.stringify(u)); } catch (e) {}
  notify();
  schedulePush();
}

/* prefs live inside the user record (so they cloud-sync), exactly like the original */
export function pref(key: string, val?: any): any {
  const u = getUser();
  if (!u.prefs) u.prefs = {};
  if (typeof val === 'undefined') return u.prefs[key];
  u.prefs[key] = mmfixValue(val);
  setUser(u);
  return val;
}

function kindStore(kind: string): KindStore {
  const u = getUser();
  if (!u[kind]) (u as any)[kind] = { added: [], edited: {}, deleted: {} };
  return u as any;
}

export function save(kind: string, item: any) {
  item = mmfixValue(item);
  const u = kindStore(kind);
  const s: KindStore = (u as any)[kind];
  if (String(item.id).indexOf('u_') === 0) {
    const i = s.added.findIndex((x) => x.id === item.id);
    if (i >= 0) s.added[i] = item; else s.added.push(item);
  } else {
    s.edited[item.id] = item; // full override of the base entry
  }
  setUser(u);
}

export function remove(kind: string, id: string) {
  const u = kindStore(kind);
  const s: KindStore = (u as any)[kind];
  if (String(id).indexOf('u_') === 0) {
    s.added = s.added.filter((x) => x.id !== id);
  } else {
    s.deleted[id] = true;
    if (s.edited) delete s.edited[id];
  }
  setUser(u);
}

export function restore(kind: string, id: string) {
  const u = getUser();
  const s: any = (u as any)[kind];
  if (s && s.deleted && s.deleted[id]) { delete s.deleted[id]; setUser(u); }
}

/* one-time repair of saved user data (same guard flag as the original site;
   local write only — never a cloud push) */
export function migrateShape() {
  try {
    if (typeof window === 'undefined') return;
    if (localStorage.getItem('jl_shapefix_v2')) return;
    localStorage.setItem('jl_shapefix_v2', '1');
    if (!localStorage.getItem(STORE_KEY)) return;
    const u: any = getUser();
    let changed = false;
    (KINDS as readonly string[]).forEach((k) => {
      const s = u[k];
      let fixed: KindStore;
      if (Array.isArray(s)) {
        fixed = { added: s.filter((it: any) => it && typeof it === 'object'), edited: {}, deleted: {} };
      } else if (!s || typeof s !== 'object') {
        fixed = { added: [], edited: {}, deleted: {} };
      } else {
        const edited: Record<string, any> = {};
        const se = (s.edited && typeof s.edited === 'object' && !Array.isArray(s.edited)) ? s.edited : {};
        for (const id of Object.keys(se)) if (se[id] && typeof se[id] === 'object') edited[id] = se[id];
        const deleted: Record<string, boolean> = {};
        const sd = (s.deleted && typeof s.deleted === 'object' && !Array.isArray(s.deleted)) ? s.deleted : {};
        for (const id of Object.keys(sd)) if (sd[id]) deleted[id] = true;
        fixed = {
          added: (Array.isArray(s.added) ? s.added : []).filter((it: any) => it && typeof it === 'object'),
          edited, deleted,
        };
      }
      if (JSON.stringify(u[k]) !== JSON.stringify(fixed)) { u[k] = fixed; changed = true; }
    });
    if (u.files && !Array.isArray(u.files.added)) {
      u.files = { added: (u.files && Array.isArray(u.files)) ? u.files : [] };
      changed = true;
    } else if (Array.isArray(u.files)) {
      u.files = { added: (u.files as any).filter((m: any) => m && typeof m === 'object') };
      changed = true;
    }
    if (changed) { try { localStorage.setItem(STORE_KEY, JSON.stringify(u)); } catch (e2) {} }
  } catch (e) {}
}
