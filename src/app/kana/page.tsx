'use client';

/* Kana — port of kana.html / hiragana.html / katakana.html, unified:
   gojūon rows (incl. voiced + yōon), a kana grid with row filter chips,
   and the writing pad for the selected kana with speak / guide / clear /
   undo — same data (ROWS) as the original pages. */
import * as React from 'react';
import { KANA_ROWS } from '@/lib/kana-data';
import { PageHead } from '@/components/page-head';
import { Pad, PadApi } from '@/components/pad';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useT } from '@/components/providers';
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
  const { t } = useT();
  const [tab, setTab] = React.useState<'hiragana' | 'katakana'>('hiragana');
  const [filter, setFilter] = React.useState('all');
  const [idx, setIdx] = React.useState(0);
  const [showGuide, setShowGuide] = React.useState(true);
  const padRef = React.useRef<PadApi>(null);

  React.useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tv = params.get('tab');
    if (tv === 'katakana' || tv === 'hiragana') setTab(tv);
  }, []);

  const rows = KANA_ROWS[tab] || [];
  const kana = React.useMemo(() => buildKana(rows), [tab]);
  const list = filter === 'all' ? kana : kana.filter((k) => k.row === filter);
  const cur = list[Math.min(idx, list.length - 1)] || kana[0];

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
      <div className="mb-6 grid grid-cols-4 gap-2 sm:grid-cols-8 md:grid-cols-10">
        {list.map((k, i) => (
          <button key={k.c + i} type="button" onClick={() => setIdx(i)}
            className={'flex flex-col items-center rounded-lg border py-2 hover:bg-accent' + (i === idx ? ' border-primary bg-primary text-primary-foreground' : '')}>
            <span className="text-2xl">{k.c}</span>
            <span className="text-[10px] text-muted-foreground">{k.r}</span>
          </button>
        ))}
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
