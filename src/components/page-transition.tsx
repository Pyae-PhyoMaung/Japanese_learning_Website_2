'use client';

/* Wraps every route in a gentle fade-and-rise entrance — replays on each
   navigation by remounting on the pathname key. */
import * as React from 'react';
import { usePathname } from 'next/navigation';

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="animate-in fade-in slide-in-from-bottom-4 duration-300">
      {children}
    </div>
  );
}