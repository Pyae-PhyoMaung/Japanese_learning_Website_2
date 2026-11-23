'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';
import { useT, useToast } from '@/components/providers';
import { pullUserData } from '@/lib/sync';
import { level, useJL } from '@/lib/jl';

/* Header — same structure as the original site: a brand bar (logo + title)
   on top, and the nav links (grouped dropdowns) in a bar below it. */
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

export function Nav() {
  const path = usePathname() || '/';
  const { t, lang, setLang } = useT();
  const toast = useToast();
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = React.useState<string | null>(null);
  const [pinned, setPinned] = React.useState<string | null>(null); /* a clicked dropdown stays open until outside click */
  const [mounted, setMounted] = React.useState(false);
  useJL();

  React.useEffect(() => { setMounted(true); }, []);
  /* close any open dropdown when the route changes */
  React.useEffect(() => { setOpen(null); setPinned(null); }, [path]);
  /* outside click / Escape closes the dropdowns */
  React.useEffect(() => {
    const onDoc = () => { setOpen(null); setPinned(null); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(null); setPinned(null); } };
    document.addEventListener('click', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('click', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  const lvl = mounted ? level() : 'N5';

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
      {/* brand bar — logo + site title on the top left, in the original site's blue gradient */}
      <div className="bg-gradient-to-r from-[#1d3557] to-[#2b507c] shadow-md">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2.5">
        <Link href="/" className="flex items-center gap-2.5 rounded-md pr-1 hover:opacity-90" title="Home">
          <span className="jp flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-base font-bold text-primary-foreground">日本語</span>
          <span className="text-sm font-semibold text-white sm:text-base">
            Japanese Learning Website <span className="text-white/70">— JLPT {lvl}</span>
          </span>
        </Link>
        <div className="ml-auto flex items-center gap-1 text-white">
          <button
            type="button"
            title="Check for new data"
            className="rounded-md px-2 py-1 text-sm hover:bg-white/15"
            onClick={() => pullUserData((r) => toast(r && r.updated ? 'Data updated ✓' : 'Already up to date', 'ok'))}
          >
            ↻
          </button>
          <button type="button" title="Myanmar / English" className="rounded-md px-2 py-1 text-sm hover:bg-white/15" onClick={() => setLang(lang === 'mm' ? 'en' : 'mm')}>
            {lang === 'mm' ? 'English' : 'မြန်မာ'}
          </button>
          <button type="button" title="Light / dark theme" className="rounded-md px-2 py-1 text-sm hover:bg-white/15" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>
      </div>
      </div>
      {/* nav bar — below the brand, with the grouped dropdowns */}
      <div className="border-t bg-card shadow-sm">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-1 gap-y-1 px-4 py-1.5">
          <Link href="/" className={cn('rounded-md px-2 py-1 text-sm font-medium hover:bg-accent', path === '/' && 'bg-accent')}>
            {t('Home')}
          </Link>
          {NAV_GROUPS.map((g) => {
            const hasActive = g.items.some((n) => n.href === path);
            return (
              <div
                key={g.label}
                className="relative"
                onMouseEnter={() => setOpen(g.label)}
                onMouseLeave={() => { if (pinned !== g.label) setOpen(null); }}
              >
                <button
                  type="button"
                  className={cn('rounded-md px-2 py-1 text-sm font-medium hover:bg-accent', open === g.label && 'bg-accent', hasActive && 'text-primary')}
                  onClick={(e) => {
                    /* clicking pins the menu open (it stays); hover keeps working */
                    e.stopPropagation();
                    e.preventDefault();
                    setOpen(g.label);
                    setPinned(g.label);
                  }}
                >
                  {t(g.label)} <span className="text-[10px]">▾</span>
                </button>
                {open === g.label && (
                  <div className="absolute left-0 top-full z-[60] mt-1 w-48 animate-in fade-in slide-in-from-top-1 duration-150 rounded-lg border bg-background p-1 shadow-lg">
                    {g.items.map((n) => (
                      <Link key={n.href} href={n.href} className={cn('flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent', n.href === path && 'bg-accent font-medium')}>
                        <span className="w-5 text-center">{n.icon}</span> {t(n.label)}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          <Link href="/edit" className={cn('rounded-md px-2 py-1 text-sm font-medium hover:bg-accent', path === '/edit' && 'bg-accent')}>
            {t('Add / Edit')}
          </Link>
        </div>
      </div>
    </header>
  );
}
