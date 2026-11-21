/* Cross-device sync — exact port of the original push/pull/merge logic
   (Supabase `user_data` row, same API and Prefer headers). Differences from
   the original: instead of reloading the page when the server is newer,
   we write the merged record and notify subscribers, so React re-renders
   in place without losing in-progress form/quiz state. */
import { JL_CLOUD, cloudEnabled, cloudHeaders } from './config';
import { STORE_KEY, getUser, notify, KINDS } from './store';
import type { UserRecord } from './types';

function qs(): string {
  return JL_CLOUD.url + '/rest/v1/user_data?select=data&user_id=eq.' + encodeURIComponent(JL_CLOUD.user || 'main');
}

/* a record with no user content at all must never be pushed — pushing
   emptiness can only destroy the newer cloud copy */
export function userHasContent(u: any): boolean {
  try {
    for (const kind of KINDS) {
      const s = u[kind];
      if (!s || typeof s !== 'object') continue;
      if (Array.isArray(s.added) && s.added.length) return true;
      if (s.edited && typeof s.edited === 'object' && !Array.isArray(s.edited) && Object.keys(s.edited).length) return true;
      if (s.deleted && typeof s.deleted === 'object' && !Array.isArray(s.deleted) && Object.keys(s.deleted).length) return true;
    }
    if (u.files && Array.isArray(u.files.added) && u.files.added.length) return true;
    const p = u.prefs || {};
    for (const pk of Object.keys(p)) { if (pk !== 'level') return true; }
  } catch (e) {}
  return false;
}

/* Merge two user records — items ACCUMULATE by id, deletions accumulate as
   tombstones, `overlay` wins per id. Nothing is ever dropped. */
export function mergeRecords(base: any, overlay: any): UserRecord {
  let out: any = {};
  try { out = JSON.parse(JSON.stringify(base && typeof base === 'object' ? base : {})); } catch (e) { out = {}; }
  for (const kind of KINDS) {
    const b = (base && base[kind]) || {};
    const o = (overlay && overlay[kind]) || {};
    const adds = (x: any) => (x && Array.isArray(x.added) ? x.added.filter((it: any) => it && typeof it === 'object' && it.id != null) : []);
    const map = (x: any) => (x && typeof x === 'object' && !Array.isArray(x) ? x : {});
    const byId: Record<string, any> = {};
    adds(b).forEach((it: any) => { byId[it.id] = it; });
    adds(o).forEach((it: any) => { byId[it.id] = it; });
    const del: Record<string, boolean> = {};
    for (const id of Object.keys(map(b.deleted))) if (map(b.deleted)[id]) del[id] = true;
    for (const id of Object.keys(map(o.deleted))) if (map(o.deleted)[id]) del[id] = true;
    const added: any[] = [];
    for (const id of Object.keys(byId)) if (!del[id]) added.push(byId[id]);
    const edited: Record<string, any> = {};
    for (const id of Object.keys(map(b.edited))) edited[id] = map(b.edited)[id];
    for (const id of Object.keys(map(o.edited))) edited[id] = map(o.edited)[id];
    out[kind] = { added, edited, deleted: del };
  }
  const fB = (base && base.files && Array.isArray(base.files.added)) ? base.files.added : [];
  const fO = (overlay && overlay.files && Array.isArray(overlay.files.added)) ? overlay.files.added : [];
  const fById: Record<string, any> = {};
  fB.concat(fO).forEach((m: any) => { if (m && m.id != null) fById[m.id] = m; });
  out.files = { added: Object.keys(fById).map((id) => fById[id]) };
  out.prefs = Object.assign({}, (base && base.prefs) || {}, (overlay && overlay.prefs) || {});
  return out;
}

export function pushUserData() {
  if (typeof fetch === 'undefined' || !cloudEnabled()) return;
  try {
    const local = JSON.parse(localStorage.getItem(STORE_KEY) || '{}');
    if (!userHasContent(local)) return; /* never push an empty record */
    /* fetch the server copy first and MERGE, so no device can ever remove
       another device's items by pushing */
    fetch(qs(), { headers: cloudHeaders() })
      .then((r) => (r.ok ? r.json() : null))
      .then((rows: any) => {
        const srv = rows && rows[0] && rows[0].data ? rows[0].data : null;
        const merged = srv ? mergeRecords(srv, local) : local;
        merged._sync = { at: Date.now(), dev: String(navigator.userAgent || '').slice(0, 40) };
        return fetch(JL_CLOUD.url + '/rest/v1/user_data', {
          method: 'POST',
          headers: cloudHeaders({ 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates' }),
          body: JSON.stringify({ user_id: JL_CLOUD.user || 'main', data: merged }),
        }).then(() => {
          /* remember that the cloud now matches this browser */
          try {
            const cur = JSON.parse(localStorage.getItem(STORE_KEY) || '{}');
            if (!cur._sync || (cur._sync.at || 0) <= merged._sync.at) {
              cur._sync = merged._sync;
              localStorage.setItem(STORE_KEY, JSON.stringify(cur));
            }
          } catch (e3) {}
        });
      })
      .catch(() => {
        /* server unreadable — fall back to posting local only */
        try {
          fetch(JL_CLOUD.url + '/rest/v1/user_data', {
            method: 'POST',
            headers: cloudHeaders({ 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates' }),
            body: JSON.stringify({ user_id: JL_CLOUD.user || 'main', data: local }),
          }).catch(() => {});
        } catch (e2) {}
      });
  } catch (e) {}
}

let syncTimer: ReturnType<typeof setTimeout> | null = null;
export function schedulePush() {
  if (typeof window === 'undefined') return;
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(pushUserData, 1500);
}

export function pullUserData(done?: (r: { updated: boolean }) => void) {
  if (typeof fetch === 'undefined' || !cloudEnabled()) { if (done) done({ updated: false }); return; }
  fetch(qs(), { headers: cloudHeaders() })
    .then((r) => (r.ok ? r.json() : null))
    .then((rows: any) => {
      const srv = rows && rows[0] && rows[0].data;
      if (!srv || !srv._sync) { if (done) done({ updated: false }); return; }
      const local = getUser();
      const lat = (local && local._sync && local._sync.at) || 0;
      if ((srv._sync.at || 0) > lat) {
        let merged: UserRecord;
        if (!userHasContent(local)) {
          merged = srv; /* nothing here — just take the server copy */
        } else {
          merged = mergeRecords(local, srv);
          merged._sync = srv._sync;
        }
        try { localStorage.setItem(STORE_KEY, JSON.stringify(merged)); } catch (e) {}
        if (JSON.stringify(merged) !== JSON.stringify(srv)) schedulePush();
        notify(); /* React components re-render with the merged data in place */
        if (done) done({ updated: true });
      } else if (done) done({ updated: false });
    })
    .catch(() => { if (done) done({ updated: false }); });
}

export function startLiveSync() {
  if (typeof window === 'undefined') return;
  setInterval(() => pullUserData(), 30000);
}
