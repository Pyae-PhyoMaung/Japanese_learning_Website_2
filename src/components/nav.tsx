'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';
import { useT, useToast } from '@/components/providers';
import { pullUserData } from '@/lib/sync';
import { level, useJL } from '@/lib/jl';

/* Header — same look as the original site: a blue brand bar (日本語 badge +
   site title) on top, and a white nav bar below it with the grouped
   dropdowns, the red Add / Edit pill, and the round sync / language / theme
   controls on the right. Dropdowns open on hover AND click; closing is
   delayed, and a click pins the menu open — it never vanishes while the
   cursor travels to the items. */
const NAV_GROUPS = [
  {
    label: 'Learn',
    items: [
      { href: '/learn', icon: '🎯', label: 'Learn' },
      { href: '/kanji', icon: '漢', label: 'Kanji' },
      { href: '/vocab', icon: '語', label: 'Vocabulary' },
      { href: '/kana', icon: 'あ', label: 'Kana' },
      { href: '/grammar', icon: '文', label: 'Grammar' },
    ],
  },
  {
    label: 'Practice',
    items: [
      { href: '/write', icon: '✍️', label: 'Writing' },
      { href: '/listening', icon: '🎧', label: 'Listening' },
      { href: '/tests', icon: '📝', label: 'Tests' },
    ],
  },
  {
    label: 'Tools',
    items: [
      { href: '/dictionary', icon: '辞', label: 'Dictionary' },
      { href: '/textbook', icon: '📖', label: 'Library' },
      { href: '/files', icon: '🗂️', label: 'Files' },
      { href: '/partner', icon: '🤝', label: 'Study Partner' },
      { href: '/board', icon: '📌', label: 'Cardboard' },
    ],
  },
];

const NAV_LINK = 'inline-flex items-center whitespace-nowrap rounded-[9px] px-[13px] py-[6px] text-[0.92rem] leading-snug';

export function Nav() {
  const path = usePathname() || '/';
  const { t, lang, setLang } = useT();
  const toast = useToast();
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = React.useState<string | null>(null);
  const [pinned, setPinned] = React.useState<string | null>(null); /* a clicked dropdown stays open until a click outside the nav */
  const [mounted, setMounted] = React.useState(false);
  const navRef = React.useRef<HTMLDivElement>(null);
  const closeTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  useJL();

  React.useEffect(() => { setMounted(true); }, []);
  /* close any open dropdown when the route changes */
  React.useEffect(() => { setOpen(null); setPinned(null); }, [path]);
  /* clicks OUTSIDE the nav bar close the dropdowns; Escape too. Clicks inside
     (on a group button or in the open menu) never close it. */
  React.useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) { setOpen(null); setPinned(null); }
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(null); setPinned(null); } };
    document.addEventListener('click', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('click', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, []);
  /* hover keeps the menu open, but CLOSING is delayed — the menu never
     disappears while the cursor crosses the small gap to the menu items */
  const cancelClose = () => { if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null; } };
  const scheduleClose = (label: string) => {
    cancelClose();
    closeTimer.current = setTimeout(() => {
      setOpen((cur) => (cur === label ? null : cur));
      setPinned((cur) => (cur === label ? null : cur));
    }, 400);
  };
  React.useEffect(() => () => { if (closeTimer.current) clearTimeout(closeTimer.current); }, []);

  const lvl = mounted ? level() : 'N5';

  return (
    <header className="sticky top-0 z-50">
      {/* brand bar — 日本語 badge + site title, in the original site's blue gradient */}
      <div className="bg-gradient-to-r from-[#1d3557] to-[#2b507c] shadow-[0_2px_10px_rgba(0,0,0,0.18)]">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-5 py-3">
          <Link href="/" className="flex items-center gap-3 hover:opacity-90" title="Home">
            <span className="jp rounded-[10px] bg-primary px-3 py-0.5 text-[1.25rem] font-bold leading-relaxed text-primary-foreground">日本語</span>
            <span className="text-lg font-semibold tracking-wide text-white">
              Japanese Learning Website <span className="text-white/75">— JLPT {lvl}</span>
            </span>
          </Link>
        </div>
      </div>
      {/* nav bar — grouped dropdowns + red Add / Edit pill on the left, round
          sync / language / theme controls on the right, like the original */}
      <div ref={navRef} className="border-b bg-card shadow-sm">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-0.5 px-3 py-1.5">
          <Link href="/" className={cn(NAV_LINK, 'hover:bg-accent', path === '/' && 'bg-primary text-primary-foreground hover:bg-primary')}>
            {t('Home')}
          </Link>
          {NAV_GROUPS.map((g) => {
            const hasActive = g.items.some((n) => n.href === path);
            return (
              <div
                key={g.label}
                className="relative"
                onMouseEnter={() => { cancelClose(); setOpen(g.label); }}
                onMouseLeave={() => scheduleClose(g.label)}
              >
                <button
                  type="button"
                  className={cn(NAV_LINK, 'hover:bg-accent', open === g.label && 'bg-accent', hasActive && 'font-bold text-primary')}
                  onClick={() => {
                    /* click pins the menu open (stays even when the cursor leaves);
                       clicking the same group again unpins and closes it */
                    cancelClose();
                    if (pinned === g.label) { setPinned(null); setOpen(null); }
                    else { setPinned(g.label); setOpen(g.label); }
                  }}
                >
                  {t(g.label)} <span className="ml-1.5 text-[0.65rem] opacity-55">▾</span>
                </button>
                {open === g.label && (
                  <div className="absolute left-0 top-[calc(100%+8px)] z-[60] min-w-[200px] animate-in fade-in slide-in-from-top-1 rounded-xl border bg-card p-1.5 shadow-[0_10px_26px_rgba(29,53,87,0.18)] duration-150">
                    {g.items.map((n) => (
                      <Link key={n.href} href={n.href} className={cn('flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-[0.92rem] hover:bg-accent', n.href === path && 'bg-primary text-primary-foreground hover:bg-primary')}>
                        <span className="w-5 text-center">{n.icon}</span> {t(n.label)}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          <Link href="/edit" className={cn(NAV_LINK, 'bg-primary font-semibold text-primary-foreground hover:brightness-110', path === '/edit' && 'brightness-90')}>
            {t('Add / Edit')}
          </Link>
          <div className="ml-auto flex items-center gap-2 pl-2">
            <button
              type="button"
              title="Check for new data"
              className="flex h-8 w-8 items-center justify-center rounded-full border bg-card text-sm hover:bg-accent"
              onClick={() => pullUserData((r) => toast(r && r.updated ? 'Data updated ✓' : 'Already up to date', 'ok'))}
            >
              ↻
            </button>
            <button type="button" title="Myanmar / English" className="flex h-8 items-center rounded-full border bg-card px-3 text-sm hover:bg-accent" onClick={() => setLang(lang === 'mm' ? 'en' : 'mm')}>
              {lang === 'mm' ? 'English' : 'မြန်မာ'}
            </button>
            <button type="button" title="Light / dark theme" className="flex h-8 w-8 items-center justify-center rounded-full border bg-card text-sm hover:bg-accent" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
