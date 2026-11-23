'use client';

/* Kana — port of kana.html / hiragana.html / katakana.html, unified:
   gojūon rows (incl. voiced + yōon), a kana grid with row filter chips,
   and the writing pad for the selected kana with speak / guide / clear /
   undo — same data (ROWS) as the original pages. */
import * as React from 'react';
import Link from 'next/link';
import { KANA_ROWS } from '@/lib/kana-data';
import { pref } from '@/lib/store';
import { useJL } from '@/lib/jl';
import { PageHead } from '@/components/page-head';
import { Pad, PadApi } from '@/components/pad';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useT, useToast } from '@/components/providers';
import { speak } from '@/lib/tts';

function buildKana(rows: string[][]) {
  const out: Array<{ c: string; r: string; row: string }> = [];
  rows.forEach((row) => {
    const chars = row[1].split('');
    const roms = row[2].split(' ');
    chars.forEach((c, i) => out.push({ c, r: roms[i] || '', row: row[0] }));
  });
  return out;
}

export default function KanaPage() {
  useJL();
  const { t } = useT();
  const toast = useToast();
  const [mounted, setMounted] = React.useState(false);
  const [selectMode, setSelectMode] = React.useState(false);
  const [tab, setTab] = React.useState<'hiragana' | 'katakana'>('hiragana');
  const [filter, setFilter] = React.useState('all');
  const [idx, setIdx] = React.useState(0);
  const [showGuide, setShowGuide] = React.useState(true);
  const padRef = React.useRef<PadApi>(null);

  React.useEffect(() => {
    setMounted(true);
    const params = new URLSearchParams(location.search);
    const tv = params.get('tab');
    if (tv === 'katakana' || tv === 'hiragana') setTab(tv);
  }, []);

  const rows = KANA_ROWS[tab] || [];
  const kana = React.useMemo(() => buildKana(rows), [tab]);
  const list = filter === 'all' ? kana : kana.filter((k) => k.row === filter);
  const cur = list[Math.min(idx, list.length - 1)] || kana[0];

  /* selection — like the Kanji / Vocabulary pages (sel_kana pref) */
  const sel = mounted ? (pref('sel_kana') || []) : [];
  const toggleSel = (c: string) => {
    const s = pref('sel_kana') || [];
    const i = s.indexOf(c);
    if (i < 0) s.push(c); else s.splice(i, 1);
    pref('sel_kana', s);
  };

  React.useEffect(() => { setFilter('all'); setIdx(0); }, [tab]);
  React.useEffect(() => { padRef.current?.clear(); }, [cur && cur.c]);

  return (
    <div>
      <PageHead icon="あ" title="Kana" subtitle={'All 46 basic kana, plus dakuten/handakuten and combined sounds — in both scripts. Tap a kana to load it on the writing grid, or use ← Prev / Next → to practice in order.'} />
      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList className="mb-4">
          <TabsTrigger value="hiragana">{t('Hiragana')} ひらがな</TabsTrigger>
          <TabsTrigger value="katakana">{t('Katakana')} カタカナ</TabsTrigger>
        </TabsList>
      </Tabs>
      <div className="mb-4 flex flex-wrap gap-1">
            <button type="button" onClick={() => { setFilter('all'); setIdx(0); }} className={'rounded-lg border px-3 py-1.5 text-sm hover:bg-accent' + (filter === 'all' ? ' border-primary bg-primary text-primary-foreground' : '')}>
              {t('All')} ({kana.length})
            </button>
            {rows.map((r) => (
              <button key={r[0]} type="button" onClick={() => { setFilter(r[0]); setIdx(0); }} className={'rounded-lg border px-3 py-1.5 text-sm hover:bg-accent' + (filter === r[0] ? ' border-primary bg-primary text-primary-foreground' : '')}>
                {r[0]}
              </button>
            ))}
      </div>
      {/* toolbar — learn your selection / clear it, like the Kanji & Vocabulary pages */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant={selectMode ? 'default' : 'outline'}
          onClick={() => { setSelectMode(!selectMode); if (!selectMode) toast('Select mode: tap kana to add them to your Learn list.', 'ok'); }}
        >
          {selectMode ? '✅ ' + t('Done selecting') : '☑ ' + t('Select')}
        </Button>
        <Link href="/learn?tab=kana" className="inline-flex h-8 items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90">🎯 {t('Learn selected')} ({sel.length})</Link>
        <Button size="sm" variant="ghost" onClick={() => { pref('sel_kana', []); toast('Selection cleared.', 'ok'); }}>
          ✕ {t('Clear selection')} ({sel.length})
        </Button>
      </div>
      <div className="mb-6 grid grid-cols-4 gap-2 sm:grid-cols-8 md:grid-cols-10">
        {list.map((k, i) => {
          const selected = selectMode && sel.includes(k.c);
          return (
            <button key={k.c + i} type="button" onClick={() => (selectMode ? toggleSel(k.c) : setIdx(i))}
              className={'flex flex-col items-center rounded-lg border py-2 hover:bg-accent' + (selected ? ' border-primary bg-primary text-primary-foreground' : i === idx && !selectMode ? ' border-primary bg-primary text-primary-foreground' : '')}>
              <span className="text-2xl">{k.c}</span>
              <span className="text-[10px] text-muted-foreground">{k.r}</span>
            </button>
          );
        })}
      </div>
      {cur ? (
        <div className="mx-auto max-w-md space-y-4 rounded-2xl border bg-card p-6 text-center shadow-sm">
          <div className="text-xs text-muted-foreground">{cur.row} · {t('Kana')} {idx + 1} / {list.length}</div>
          <div className="text-7xl">{cur.c}</div>
          <div className="text-sm text-muted-foreground">{cur.r}</div>
          <div className="flex flex-col items-center gap-3">
            <Pad ref={padRef} char={cur.c} show={showGuide} size={280} />
            <div className="flex flex-wrap justify-center gap-2">
              <Button variant="outline" size="sm" onClick={() => speak(cur.c)}>🔊 {t('Listen')}</Button>
              <Button variant="outline" size="sm" onClick={() => padRef.current?.undo()}>↩ {t('Undo')}</Button>
              <Button variant="outline" size="sm" onClick={() => padRef.current?.clear()}>{t('Clear')}</Button>
              <Button variant="outline" size="sm" onClick={() => setShowGuide(!showGuide)}>{showGuide ? '👁 ' + t('Hide guide') : '👁 ' + t('Show guide')}</Button>
              <Button variant="outline" size="sm" onClick={() => setIdx((idx - 1 + list.length) % list.length)}>←</Button>
              <Button variant="outline" size="sm" onClick={() => setIdx((idx + 1) % list.length)}>→</Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
