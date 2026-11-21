'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';
import { useT, useToast } from '@/components/providers';
import { pullUserData } from '@/lib/sync';

/* grouped header — same structure as the original site's renderNav() */
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

  React.useEffect(() => {
    const close = () => setOpen(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-1 gap-y-2 px-4 py-2">
        <Link href="/" className={cn('mr-1 rounded-md px-2 py-1 text-sm font-medium hover:bg-accent', path === '/' && 'bg-accent')}>
          {t('Home')}
        </Link>
        {NAV_GROUPS.map((g) => {
          const hasActive = g.items.some((n) => n.href === path);
          return (
            <div key={g.label} className="relative">
              <button
                type="button"
                className={cn('rounded-md px-2 py-1 text-sm font-medium hover:bg-accent', open === g.label && 'bg-accent', hasActive && 'text-primary')}
                onClick={(e) => {
                  e.stopPropagation();
                  setOpen(open === g.label ? null : g.label);
                }}
              >
                {t(g.label)} <span className="text-[10px]">▾</span>
              </button>
              {open === g.label && (
                <div className="absolute left-0 top-full z-50 mt-1 w-48 rounded-lg border bg-background p-1 shadow-lg">
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
        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            title="Check for new data"
            className="rounded-md px-2 py-1 text-sm hover:bg-accent"
            onClick={() => pullUserData((r) => toast(r && r.updated ? 'Data updated ✓' : 'Already up to date', 'ok'))}
          >
            ↻
          </button>
          <button type="button" title="Myanmar / English" className="rounded-md px-2 py-1 text-sm hover:bg-accent" onClick={() => setLang(lang === 'mm' ? 'en' : 'mm')}>
            {lang === 'mm' ? 'English' : 'မြန်မာ'}
          </button>
          <button type="button" title="Light / dark theme" className="rounded-md px-2 py-1 text-sm hover:bg-accent" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>
      </div>
    </header>
  );
}
