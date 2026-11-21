/* Myanmar text: always store real Unicode, never Zawgyi — port of the
   original's zg2uni integration. public/js/zg2uni.js is the same vendored
   copy of Google's myanmar-tools (Zawgyi detector + converter) the original
   site ships; it sets window.JL_ZG = { fix(text) }. */
import { getUser, setUser } from './store';

/* laptop-keyboard fallback (from the original): a few keys emit raw Latin
   letters instead of Myanmar signs — replace only when next to Myanmar */
const KB_FIX: Record<string, string> = { m: '\u102C', g: '\u102B' };

export function kbfix(s: any): any {
  if (typeof s !== 'string' || !s) return s;
  const MM = /[\u1000-\u109F]/;
  let out = '';
  for (let i = 0; i < s.length; i++) {
    const c = s.charAt(i);
    if (KB_FIX[c] && (MM.test(s.charAt(i - 1)) || MM.test(s.charAt(i + 1)))) out += KB_FIX[c];
    else out += c;
  }
  return out;
}

function ZG(): any {
  return (typeof window !== 'undefined') ? (window as any).JL_ZG : null;
}

/* recursively convert Zawgyi/visual-order text inside a value to Unicode;
   leaves Japanese, English and correct Unicode untouched */
export function mmfixValue(v: any): any {
  try {
    const Z = ZG();
    if (!Z) return v;
    if (typeof v === 'string') return Z.fix(kbfix(v));
    if (Array.isArray(v)) {
      for (let i = 0; i < v.length; i++) v[i] = mmfixValue(v[i]);
      return v;
    }
    if (v && typeof v === 'object') {
      for (const k of Object.keys(v)) v[k] = mmfixValue(v[k]);
    }
  } catch (e) {}
  return v;
}

/* lazily load the converter, then run the one-time store migration —
   same guard flag ('jl_zgfix_v1') as the original site */
export function loadZg(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (ZG()) { migrateZg(); return Promise.resolve(); }
  return new Promise((res) => {
    const s = document.createElement('script');
    s.src = '/js/zg2uni.js';
    s.onload = () => { migrateZg(); res(); };
    s.onerror = () => res();
    (document.head || document.getElementsByTagName('head')[0]).appendChild(s);
  });
}

export function migrateZg() {
  try {
    const Z = ZG();
    if (!Z) return;
    if (localStorage.getItem('jl_zgfix_v1')) return;
    localStorage.setItem('jl_zgfix_v1', '1');
    const raw = localStorage.getItem('jl_user_v1');
    if (!raw) return;
    const u: any = getUser();
    mmfixValue(u);
    if (JSON.stringify(u) !== raw) setUser(u);
  } catch (e) {}
}

/* the original auto-converted any text input on blur; React inputs call this
   from onBlur instead — returns the fixed value (or the original) */
export function fixField(v: string): { value: string; fixed: boolean } {
  const Z = ZG();
  if (!Z || typeof v !== 'string') return { value: v, fixed: false };
  const f = Z.fix(kbfix(v));
  return { value: f, fixed: f !== v };
}
