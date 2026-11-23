'use client';

/* Learn — port of learn.html: study kanji/words you selected (sel_kanji /
   sel_vocab) or whole chapters, one card at a time — reveal reading &
   meaning, listen, jump to writing practice, shuffle, and see per-kanji
   memorization images. */
import * as React from 'react';
import Link from 'next/link';
import { kanjiList, vocabList, grammarList, chapterTitle, kimgGet, useJL } from '@/lib/jl';
import { pref } from '@/lib/store';
import { fileGet } from '@/lib/files';
import { LevelBar } from '@/components/level-bar';
import { PageHead } from '@/components/page-head';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useT, useToast } from '@/components/providers';
import { speak } from '@/lib/tts';
import { shuffle, cn } from '@/lib/utils';
import { KANA_ROWS, kanaUnits } from '@/lib/kana-data';
import type { Kanji, Vocab, Grammar } from '@/lib/types';

export default function LearnPage() {
  const jlv = useJL(); /* store version — clears/edits elsewhere re-shuffle this session */
  const { t } = useT();
  const toast = useToast();
  const [mounted, setMounted] = React.useState(false);
  const [tab, setTab] = React.useState('kanji');
  /* scope: 'sel' = items ticked on the chapter pages, 'all' = every item of the
     tab, 'chs' = union of one or more chapters picked below (multi-select). */
  const [mode, setMode] = React.useState<'sel' | 'all' | 'chs'>('sel');
  const [picked, setPicked] = React.useState<string[]>([]);
  const [showCats, setShowCats] = React.useState(true);
  const [q, setQ] = React.useState('');
  const [idx, setIdx] = React.useState(0);
  const [revealed, setRevealed] = React.useState(false);
  const [seed, setSeed] = React.useState(0);
  const [imgUrl, setImgUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    setMounted(true);
    const params = new URLSearchParams(location.search);
    const tv = params.get('tab');
    if (tv === 'vocab' || tv === 'kanji' || tv === 'kana' || tv === 'grammar') setTab(tv);
  }, []);

  const K: Kanji[] = mounted ? kanjiList() : [];
  const V: Vocab[] = mounted ? vocabList() : [];
  const G: Grammar[] = mounted ? grammarList() : [];
  const selK = mounted ? (pref('sel_kanji') || []) : [];
  const selV = mounted ? (pref('sel_vocab') || []) : [];
  const selN = mounted ? (pref('sel_kana') || []) : [];
  const selG = mounted ? (pref('sel_grammar') || []) : [];
  /* all kana from both scripts, like the Kana page */
  const KN = React.useMemo(() => {
    const out: Array<{ c: string; r: string; script: string }> = [];
    (['hiragana', 'katakana'] as const).forEach((s) =>
      (KANA_ROWS[s] || []).forEach((row) => {
        const roms = row[2].split(' ');
        kanaUnits(row[1]).forEach((c, i) => out.push({ c, r: roms[i] || '', script: s }));
      })
    );
    return out;
  }, []);

  const kanjiChapters = mounted
    ? Array.from(new Set(K.map((k) => Number(k.chapter) || 0))).filter((n) => n > 0).sort((a, b) => a - b)
    : [];
  const vocabChapters = mounted
    ? Array.from(new Set(V.map((v) => Number(v.chapter) || 0))).filter((n) => n > 0).sort((a, b) => a - b)
    : [];
  const grammarChapters = mounted
    ? Array.from(new Set(G.map((g) => Number(g.chapter) || 0))).filter((n) => n > 0).sort((a, b) => a - b)
    : [];

  const pool =
    tab === 'kanji'
      ? mode === 'sel' ? K.filter((k) => selK.includes(k.id))
        : mode === 'all' ? K
        : K.filter((k) => picked.includes(String(k.chapter || 0)))
      : tab === 'vocab'
      ? mode === 'sel' ? V.filter((v) => selV.includes(v.id))
        : mode === 'all' ? V
        : V.filter((v) => picked.includes(String(v.chapter || 0)))
      : tab === 'kana'
      ? mode === 'sel' ? KN.filter((k) => selN.includes(k.c))
        : mode === 'all' ? KN
        : KN.filter((k) => picked.includes(k.script))
      : mode === 'sel' ? G.filter((g) => selG.includes(g.id))
        : mode === 'all' ? G
        : G.filter((g) => picked.includes(String(g.chapter || 0)));
  const qLower = q.trim().toLowerCase();
  const searchPool: any[] = qLower
    ? (pool as any[]).filter((it) =>
        [it.kanji, it.jp, it.c, it.title, it.kun, it.rd, it.romaji, it.meaning, it.mm, it.en, it.pattern]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(qLower)
      )
    : (pool as any[]);
  const pickedKey = picked.join(',');
  const items = React.useMemo(() => shuffle(searchPool), [tab, mode, pickedKey, seed, mounted, jlv, qLower]);
  const cur: any = items[idx] || null;

  React.useEffect(() => { setIdx(0); setRevealed(false); }, [tab, mode, pickedKey, qLower]);
  React.useEffect(() => {
    setImgUrl(null);
    if (cur && tab === 'kanji' && kimgGet(cur.id)) {
      fileGet(kimgGet(cur.id)!).then((f) => { if (f && f.blob) setImgUrl(URL.createObjectURL(f.blob)); }).catch(() => {});
    }
  }, [cur && cur.id, tab]);

  /* no early return — the chips and the session card must always be visible
     so chapters can be learned directly (like the original learn.html) */

  const selCount = tab === 'kanji' ? selK.length : tab === 'vocab' ? selV.length : tab === 'kana' ? selN.length : selG.length;
  const totalCount = tab === 'kanji' ? K.length : tab === 'vocab' ? V.length : tab === 'kana' ? KN.length : G.length;
  const unit = tab === 'kanji' ? t('Kanji') : tab === 'vocab' ? t('Words') : t('Grammar');
  const scopeChapters: { key: string; n: number; label: string; count: number }[] =
    tab === 'kana'
      ? [
          { key: 'hiragana', n: 0, label: 'あ ' + t('Hiragana'), count: KN.filter((k) => k.script === 'hiragana').length },
          { key: 'katakana', n: 0, label: 'ア ' + t('Katakana'), count: KN.filter((k) => k.script === 'katakana').length },
        ]
      : (tab === 'kanji' ? kanjiChapters : tab === 'vocab' ? vocabChapters : grammarChapters).map((n) => {
          const arr: any[] = tab === 'kanji' ? K : tab === 'vocab' ? V : G;
          return { key: String(n), n, label: chapterTitle(tab, n, '') || 'Chapter ' + n, count: arr.filter((x) => Number(x.chapter) === n).length };
        });
  const togglePicked = (key: string) => {
    /* single-select like the original site: tapping a chapter chip starts
       (or switches to) that chapter's session; tapping it again stops it */
    setMode('chs');
    setPicked((p) => (p.includes(key) ? [] : [key]));
  };
  const chips = (
    <div className="mb-4 space-y-3">
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => setMode('sel')} className={'rounded-lg border px-3 py-1.5 text-sm hover:bg-accent' + (mode === 'sel' ? ' border-primary bg-primary text-primary-foreground' : '')}>
          ★ {t('Selected')} ({selCount})
        </button>
        <button type="button" onClick={() => setMode('all')} className={'rounded-lg border px-3 py-1.5 text-sm hover:bg-accent' + (mode === 'all' ? ' border-primary bg-primary text-primary-foreground' : '')}>
          📖 {t('All')} ({totalCount})
        </button>
        <button type="button" onClick={() => setShowCats(!showCats)} className={'rounded-lg border px-3 py-1.5 text-sm hover:bg-accent' + (showCats ? ' border-primary bg-primary text-primary-foreground' : '')}>
          {showCats ? '▾' : '▸'} {t('🗂️ Categories')}
        </button>
        {selCount > 0 ? (
          <button type="button" onClick={() => { pref('sel_' + tab, []); toast(t('Selection cleared.'), 'ok'); }} className="rounded-lg border border-dashed px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive">
            ✕ {t('Clear selection')} ({selCount})
          </button>
        ) : null}
      </div>
      {showCats ? (
        <div className="flex flex-wrap gap-3">
          {scopeChapters.map((c) => {
            const on = picked.includes(c.key);
            return (
              <button
                key={c.key}
                type="button"
                onClick={() => togglePicked(c.key)}
                className={cn('flex min-w-[120px] flex-col items-center rounded-xl border bg-card px-4 py-3 shadow-sm transition-colors', on ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-accent')}
              >
                {tab === 'kana' ? (
                  <span className="text-xl font-semibold">{c.label}</span>
                ) : (
                  <>
                    <span className={cn('text-2xl font-semibold', on ? 'text-primary-foreground' : 'text-primary')}>{c.n}</span>
                    <span className="text-center text-sm">{c.label}</span>
                  </>
                )}
                <span className={cn('mt-0.5 text-xs', on ? 'text-primary-foreground/70' : 'text-muted-foreground')}>{c.count} {tab === 'kana' ? t('Kana') : unit}</span>
              </button>
            );
          })}
        </div>
      ) : null}
      {mode === 'chs' && !picked.length ? (
        <p className="text-sm text-muted-foreground">{t('Tap a chapter below to learn it.')}</p>
      ) : null}
    </div>
  );
  return (
    <div>
      <PageHead icon="🎯" title="Learn" subtitle={'Study the kanji, words, kana and grammar points you selected on their pages, or learn a whole chapter at once — all in your selected JLPT level. Readings and meanings stay hidden until you tap “Reveal”.'} />
      <LevelBar />
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-4 flex-wrap">
          <TabsTrigger value="kanji">{t('Kanji')}</TabsTrigger>
          <TabsTrigger value="vocab">{t('Vocabulary')}</TabsTrigger>
          <TabsTrigger value="kana">{t('Kana')}</TabsTrigger>
          <TabsTrigger value="grammar">{t('Grammar')}</TabsTrigger>
        </TabsList>
        <TabsContent value="kanji">{chips}</TabsContent>
        <TabsContent value="vocab">{chips}</TabsContent>
        <TabsContent value="kana">{chips}</TabsContent>
        <TabsContent value="grammar">{chips}</TabsContent>
      </Tabs>
      <div className="mb-4">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t('Search') + '…'}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>
      {q ? <p className="mb-2 text-xs text-muted-foreground">{items.length} / {pool.length}</p> : null}
      {items.length ? (
        <div className="mx-auto max-w-md space-y-4 rounded-2xl border bg-card p-8 text-center shadow-sm">
          <div className="text-xs text-muted-foreground">{idx + 1} / {items.length}</div>
          <div className={tab === 'grammar' ? 'text-3xl font-semibold' : 'text-7xl'}>{cur.kanji || cur.jp || cur.c || cur.title}</div>
          {revealed ? (
            <div className="space-y-1">
              {cur.kun || (cur.on && cur.on.length) ? <div className="text-sm text-muted-foreground">{cur.kun || (cur.on || []).join('、')}</div> : null}
              {cur.rd ? <div className="text-sm text-muted-foreground">{cur.rd}</div> : null}
              {tab === 'kana' ? <div className="text-lg font-medium">{cur.r}</div> : null}
              {tab === 'grammar' ? (
                <>
                  {cur.pattern ? <div className="text-sm text-muted-foreground">{cur.pattern}</div> : null}
                  <div className="text-lg font-medium">{cur.mm || cur.meaning || cur.en || ''}</div>
                  {cur.explanation ? <p className="text-sm">{cur.explanation}</p> : null}
                  {cur.examples && cur.examples[0] ? <div className="text-sm text-muted-foreground">{cur.examples[0].jp}{cur.examples[0].en ? ' — ' + cur.examples[0].en : ''}</div> : null}
                </>
              ) : (
                <div className="text-lg font-medium">{cur.mm || cur.meaning || cur.en || ''}</div>
              )}
              {imgUrl ? <img src={imgUrl} alt="" className="mx-auto mt-2 max-h-40 rounded-lg border" /> : null}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t('Try to remember it, then reveal.')}</p>
          )}
          <div className="flex flex-wrap justify-center gap-2">
            <Button variant="outline" onClick={() => speak(cur.kanji || cur.jp || cur.c || (cur.examples && cur.examples[0] ? cur.examples[0].jp : '') || '')}>{t('🔊 Listen')}</Button>
            <Button onClick={() => { setRevealed(!revealed); if (!revealed) speak(cur.kanji || cur.jp || cur.c || (cur.examples && cur.examples[0] ? cur.examples[0].jp : '') || ''); }}>{revealed ? t('🙈 Hide') : t('👀 Reveal')}</Button>
            {(tab === 'kanji' || tab === 'vocab') ? (
              <Link href={'/write?tab=' + tab + '&' + (tab === 'kanji' ? 'k=' + encodeURIComponent(cur.kanji) : 'v=' + cur.id)}>
                <Button variant="outline">{t('✍️ Write')}</Button>
              </Link>
            ) : null}
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            <Button variant="outline" onClick={() => { setIdx((idx - 1 + items.length) % items.length); setRevealed(false); }}>{t('← Prev')}</Button>
            <Button onClick={() => { setIdx((idx + 1) % items.length); setRevealed(false); }}>{t('Next →')}</Button>
            <Button variant="outline" onClick={() => { setSeed((s) => s + 1); setIdx(0); setRevealed(false); }}>{t('🔀 Shuffle')}</Button>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border bg-card p-8 text-center shadow-sm">
          <p className="text-sm text-muted-foreground">
            {mode === 'sel' && !selCount
              ? t('Pick ★ Selected above to study your checked items, or tap a chapter chip to learn that whole chapter.')
              : t('Nothing in this scope.')}
          </p>
        </div>
      )}
    </div>
  );
}
