/* JL data-access layer — port of app.js's merged()/byLevel()/chapters()/
   chapterTitle()/kexVocab()/level()/kimg: base data + user edits merged at
   read time, JLPT levels, chapter registry with renamed titles. */
import { KANJI, VOCAB, GRAMMAR, SENTENCES } from './data';
import { getUser, pref, subscribe, getVersion, notify } from './store';
import type { Kanji, Vocab, Grammar, Sentence } from './types';

export const LEVELS = ['N5', 'N4', 'N3', 'N2', 'N1'];

const base: Record<string, any[]> = { kanji: KANJI, vocab: VOCAB, grammar: GRAMMAR, sentences: SENTENCES };

/* base + user layer — same defensive merge as the original: deleted base
   ids are skipped, edited ids are overridden field-by-field, added items
   appended; corrupt store parts are ignored, never crash */
export function merged<T = any>(kind: string): T[] {
  const u: any = (getUser() as any)[kind];
  const s = (u && typeof u === 'object' && !Array.isArray(u)) ? u : (Array.isArray(u) ? { added: u } : {});
  const del = (s.deleted && typeof s.deleted === 'object' && !Array.isArray(s.deleted) && s.deleted) || {};
  const ed = (s.edited && typeof s.edited === 'object' && !Array.isArray(s.edited) && s.edited) || {};
  const out: any[] = [];
  (base[kind] || []).forEach((it: any, i: number) => {
    if (!it) return;
    /* base sentences carry no ids (like the original data.js, whose pages
       read the raw array) — give id-less base items stable synthetic ids so
       the user edit/delete layers and React keys work uniformly */
    const id = it.id != null ? it.id : 'b_' + kind + '_' + i;
    if (del[id]) return;
    const e = ed[id];
    out.push(e && typeof e === 'object' ? Object.assign({}, it, e, { id }) : { ...it, id });
  });
  (Array.isArray(s.added) ? s.added : []).forEach((it: any) => {
    if (it && typeof it === 'object') out.push(it);
  });
  return out;
}

export function kanjiList(): Kanji[] { return merged<Kanji>('kanji'); }
export function vocabList(): Vocab[] { return merged<Vocab>('vocab'); }
export function grammarList(): Grammar[] { return merged<Grammar>('grammar'); }
export function sentenceList(): Sentence[] { return merged<Sentence>('sentences'); }

export function level(): string {
  const l = pref('level');
  return LEVELS.indexOf(l) >= 0 ? l : 'N5';
}
export function setLevel(l: string) {
  if (LEVELS.indexOf(l) < 0) return;
  pref('level', l);
  notify(); /* subscribers re-render with the new level's data */
}

export function byLevel<T extends { level?: string }>(arr: T[], lvl?: string): T[] {
  const l = lvl || level();
  return (arr || []).filter((it: any) => it && (it.level || 'N5') === l);
}

/* chapter registry across kinds, with user-renamed titles (pref uchapters) */
export function chapters(kind: string, lvl?: string) {
  const LV = lvl || level();
  const seen: Record<number, any> = {};
  const out: any[] = [];
  ['kanji', 'vocab', 'grammar', 'sentences', 'tests'].forEach((k2) => {
    merged(k2).forEach((it: any) => {
      if (it == null) return;
      if ((it.level || 'N5') !== LV) return;
      const n = it.chapter != null ? Number(it.chapter) || 0 : k2 === kind ? 0 : -1;
      if (n < 0) return;
      if (n === 0 && k2 !== kind) return;
      if (!seen[n]) { seen[n] = { n, t: it.chapterTitle || '', count: 0 }; out.push(seen[n]); }
      if (!seen[n].t && it.chapterTitle) seen[n].t = it.chapterTitle;
      if (k2 === kind) seen[n].count++;
    });
  });
  (pref('uchapters') || []).forEach((c: any) => {
    if (!c || c.n == null) return;
    if ((c.lvl || 'N5') !== LV) return;
    const n = Number(c.n);
    if (!seen[n]) { seen[n] = { n, t: c.t || 'Chapter ' + n, count: 0 }; out.push(seen[n]); }
    else seen[n].t = c.t || seen[n].t;
  });
  out.sort((a, b) => a.n - b.n);
  return out;
}

/* renamed chapter (uchapters registry) always wins over the baked-in title */
export function chapterTitle(kind: string, n: number | undefined, fb: string): string {
  const num = Number(n) || 0;
  if (num > 0) {
    const c = (pref('uchapters') || []).filter((x: any) => Number(x.n) === num)[0];
    if (c && c.t) return c.t;
  }
  return fb || '';
}

/* kanji example words surfaced as read-only vocabulary (same derivation as
   the original site — shared by /vocab and /edit so their counts agree) */
export function kexVocab(lvl?: string): Vocab[] {
  const kl = lvl || level();
  const have: Record<string, boolean> = {};
  byLevel(vocabList(), kl).forEach((v) => { if (v.jp) have[v.jp] = true; });
  const out: Vocab[] = [];
  byLevel(kanjiList(), kl).forEach((k) => {
    (k.examples || []).forEach((e, i) => {
      if (!e || !e.word || have[e.word]) return;
      have[e.word] = true;
      out.push({
        id: 'kex_' + (k.id || k.kanji) + '_' + i,
        jp: e.word, rd: e.reading || '', mm: e.meaning || '',
        chapter: k.chapter || 0, chapterTitle: k.chapterTitle || '',
        level: k.level || 'N5', cat: 'kex',
      } as any);
    });
  });
  return out;
}

/* per-kanji memorization images (cloud-synced mapping kanjiId -> fileId) */
export function kimgGet(kanjiId: string): string | null {
  return (pref('kimg') || {})[kanjiId] || null;
}
export function kimgSet(kanjiId: string, fileId: string | null) {
  const m = pref('kimg') || {};
  if (fileId) m[kanjiId] = fileId; else delete m[kanjiId];
  pref('kimg', m);
}

/* React glue: components call useJL() and re-render whenever the store changes */
import { useEffect, useState } from 'react';
export function useJL(): number {
  const [v, setV] = useState(0);
  useEffect(() => subscribe(() => setV(getVersion())) as any, []);
  return v;
}
