'use client';

import * as React from 'react';
import { ThemeProvider } from 'next-themes';
import { pref, notify, subscribe, getVersion, migrateShape } from '@/lib/store';
import { loadZg } from '@/lib/zg';
import { startLiveSync, pullUserData } from '@/lib/sync';
import { MM } from '@/lib/mm';

/* ---------- language (English / Myanmar) — pref 'lang', MM dictionary ---------- */
const LangCtx = React.createContext<{ lang: string; setLang: (l: string) => void; t: (s: string) => string }>(
  { lang: 'en', setLang: () => {}, t: (s) => s }
);

export function useT() {
  const { t, lang, setLang } = React.useContext(LangCtx);
  return { t, lang, setLang };
}

export function tt(s: string, lang: string): string {
  return lang === 'mm' && MM[s] ? MM[s] : s;
}

/* ---------- toasts (port of JL.toast) ---------- */
type ToastItem = { id: number; msg: string; kind?: string };
const ToastCtx = React.createContext<{ toasts: ToastItem[]; toast: (m: string, k?: string) => void }>(
  { toasts: [], toast: () => {} }
);
export function useToast() {
  return React.useContext(ToastCtx).toast;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = React.useState('en');
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);
  const [, force] = React.useState(0);

 const toast = React.useCallback((msg: string, kind?: string) => {
    const id = Date.now() + Math.random();
    setToasts((ts) => ts.concat([{ id, msg, kind }]));
    setTimeout(() => setToasts((ts) => ts.filter((x) => x.id !== id)), 2900);
  }, []);

  React.useEffect(() => {
    /* same boot sequence as the original site's app.js */
    migrateShape();
    loadZg();
    pullUserData();
    startLiveSync();
    setLangState(pref('lang') === 'mm' ? 'mm' : 'en');
    return subscribe(() => force((v) => v + 1)); /* store changes re-render t() users */
  }, []);

  const setLang = React.useCallback((l: string) => {
    pref('lang', l === 'mm' ? 'mm' : 'en');
    setLangState(l === 'mm' ? 'mm' : 'en');
    notify();
  }, []);

  const t = React.useCallback((s: string) => tt(s, lang), [lang]);

  const langValue = React.useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);
  const toastValue = React.useMemo(() => ({ toasts, toast }), [toasts, toast]);

  return (
    <ThemeProvider attribute="class" storageKey="jl_theme" defaultTheme="light" enableSystem={false} suppressHydrationWarning>
      <LangCtx.Provider value={langValue}>
        <ToastCtx.Provider value={toastValue}>
          {children}
          <div className="fixed bottom-4 left-1/2 z-[100] flex -translate-x-1/2 flex-col items-center gap-2">
            {toasts.map((x) => (
              <div key={x.id} className="flex items-center gap-2 rounded-lg border bg-background px-4 py-2 text-sm shadow-lg">
                <span>{x.kind === 'ok' ? '✓' : x.kind === 'warn' ? '⚠' : x.kind === 'err' ? '✕' : 'ℹ'}</span>
                <span>{x.msg}</span>
              </div>
            ))}
          </div>
        </ToastCtx.Provider>
      </LangCtx.Provider>
    </ThemeProvider>
  );
}
