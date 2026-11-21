import type { Metadata } from 'next';
import { Providers } from '@/components/providers';
import { Nav } from '@/components/nav';
import './globals.css';

export const metadata: Metadata = {
  title: 'Japanese Learning —  日本語',
  description: 'Learn Japanese: kanji, vocabulary, grammar, listening, writing practice and tests — with Myanmar translations and cloud sync.',
  icons: { icon: '/assets/favicon.svg' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&family=Noto+Sans+Myanmar:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen antialiased">
        <Providers>
          <Nav />
          <main className="mx-auto w-full max-w-6xl px-4 py-6">{children}</main>
          <footer className="mx-auto max-w-6xl px-4 pb-8 pt-2 text-center text-xs text-muted-foreground">
            Japanese Learning Website 2 — Next.js + TypeScript + Tailwind CSS + shadcn/ui. Same data &amp; cloud sync as the original site.
          </footer>
        </Providers>
      </body>
    </html>
  );
}
