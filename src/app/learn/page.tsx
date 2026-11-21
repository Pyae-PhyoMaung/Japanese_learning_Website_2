'use client';

/* Learn — port of learn.html: study kanji/words you selected (sel_kanji /
   sel_vocab) or whole chapters, one card at a time — reveal reading &
   meaning, listen, jump to writing practice, shuffle, and see per-kanji
   memorization images. */
import * as React from 'react';
import Link from 'next/link';
import { kanjiList, vocabList, chapterTitle, kimgGet, useJL, level } from '@/lib/jl';
import { pref } from '@/lib/store';
import { fileGet } from '@/lib/files';
import { LevelBar } from '@/components/level-bar';
import { PageHead } from '@/components/page-head';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { SpeakBtn } from '@/components/words';
import { useT, useToast } from '@/components/providers';
import { speak } from '@/lib/tts';
import { shuffle } from '@/lib/utils';
import type { Kanji, Vocab } from '@/lib/types';

export default function LearnPage() {
  useJL();
  const { t } = useT();
  const toast = useToast();
  const [mounted, setMounted] = React.useState(false);
  const [tab, setTab] = React.useState('kanji');
  const [ch, setCh] = React.useState<string>('sel');
  const [idx, setIdx] = React.useState(0);
  const [revealed, setRevealed] = React.useState(false);
  const [seed, setSeed] = React.useState(0);
  const [imgUrl, setImgUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    setMounted(true);
    const params = new URLSearchParams(location.search);
    const tv = params.get('tab');
    if (tv === 'vocab' || tv === 'kanji') setTab(tv);
  }, []);

  const K: Kanji[] = mounted ? kanjiList() : [];
  const V: Vocab[] = mounted ? vocabList() : [];
  const selK = mounted ? (pref('sel_kanji') || []) : [];
  const selV = mounted ? (pref('sel_vocab') || []) : [];

  const kanjiChapters = mounted
    ? Array.from(new Set(K.map((k) => Number(k.chapter) || 0))).filter((n) => n > 0).sort((a, b) => a - b)
    : [];
  const vocabChapters = mounted
    ? Array.from(new Set(V.map((v) => Number(v.chapter) || 0))).filter((n) => n > 0).sort((a, b) => a - b)
    : [];

  const pool =
    tab === 'kanji'
      ? ch === 'sel' ? K.filter((k) => selK.includes(k.id)) : K.filter((k) => String(k.chapter || 0) === ch)
      : ch === 'sel' ? V.filter((v) => selV.includes(v.id)) : V.filter((v) => String(v.chapter || 0) === ch);
  const items = React.useMemo(() => shuffle(pool), [tab, ch, seed, mounted]);
  const cur: any = items[idx] || null;

  React.useEffect(() => { setIdx(0); setRevealed(false); }, [tab, ch]);
  React.useEffect(() => {
    setImgUrl(null);
    if (cur && tab === 'kanji' && kimgGet(cur.id)) {
      fileGet(kimgGet(cur.id)!).then((f) => { if (f && f.blob) setImgUrl(URL.createObjectURL(f.blob)); }).catch(() => {});
    }
  }, [cur && cur.id, tab]);

  if (mounted && ch === 'sel' && !items.length) {
    return (
      <div>
        <PageHead icon="🎯" title="Learn" />
        <LevelBar />
        <div className="rounded-xl border bg-card p-8 text-center shadow-sm">
          <p className="mb-2 font-medium">{t('Nothing selected yet')}</p>
          <p className="mb-4 text-sm text-muted-foreground">{t('Use ☑ Select on the Kanji or Vocabulary page to build your Learn list.')}</p>
          <div className="flex justify-center gap-2">
            <Link href="/kanji"><Button variant="outline">{t('Kanji')}</Button></Link>
            <Link href="/vocab"><Button variant="outline">{t('Vocabulary')}</Button></Link>
          </div>
        </div>
      </div>
    );
  }

  const chips = (
    <div className="mb-4 flex flex-wrap gap-2">
      <button type="button" onClick={() => { setCh('sel'); }} className={'rounded-lg border px-3 py-1.5 text-sm hover:bg-accent' + (ch === 'sel' ? ' border-primary bg-primary text-primary-foreground' : '')}>
        ★ {t('Selected')} ({tab === 'kanji' ? selK.length : selV.length})
      </button>
      {(tab === 'kanji' ? kanjiChapters : vocabChapters).map((n) => (
        <button key={n} type="button" onClick={() => setCh(String(n))} className={'rounded-lg border px-3 py-1.5 text-sm hover:bg-accent' + (String(n) === ch ? ' border-primary bg-primary text-primary-foreground' : '')}>
          {n}章 {chapterTitle(tab, n, '')}
        </button>
      ))}
    </div>
  );

  return (
    <div>
      <PageHead icon="🎯" title="Learn" subtitle={(mounted ? level() : '') + ' · ' + items.length + ' items'} />
      <LevelBar />
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="kanji">{t('Kanji')}</TabsTrigger>
          <TabsTrigger value="vocab">{t('Vocabulary')}</TabsTrigger>
        </TabsList>
        <TabsContent value="kanji">{chips}</TabsContent>
        <TabsContent value="vocab">{chips}</TabsContent>
      </Tabs>
      {items.length ? (
        <div className="mx-auto max-w-md space-y-4 rounded-2xl border bg-card p-8 text-center shadow-sm">
          <div className="text-xs text-muted-foreground">{idx + 1} / {items.length}</div>
          <div className="text-7xl">{cur.kanji || cur.jp}</div>
          <div className="flex items-center justify-center gap-2">
            <SpeakBtn text={cur.kanji || cur.jp} className="text-lg" />
            <button type="button" className="rounded-md px-2 py-1 text-sm hover:bg-accent" onClick={() => setSeed((s) => s + 1)}>🔀</button>
          </div>
          {revealed ? (
            <div className="space-y-1">
              {cur.kun || (cur.on && cur.on.length) ? <div className="text-sm text-muted-foreground">{cur.kun || (cur.on || []).join('、')}</div> : null}
              {cur.rd ? <div className="text-sm text-muted-foreground">{cur.rd}</div> : null}
              <div className="text-lg font-medium">{cur.mm || cur.meaning || cur.en || ''}</div>
              {imgUrl ? <img src={imgUrl} alt="" className="mx-auto mt-2 max-h-40 rounded-lg border" /> : null}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t('Try to remember it, then reveal.')}</p>
          )}
          <div className="flex justify-center gap-2">
            <Button onClick={() => { setRevealed(true); speak(cur.kanji || cur.jp); }}>{t('Reveal')}</Button>
            <Button variant="outline" onClick={() => { setIdx((idx + 1) % items.length); setRevealed(false); }}>{t('Next')}</Button>
            <Link href={'/write?tab=' + tab + '&' + (tab === 'kanji' ? 'k=' + encodeURIComponent(cur.kanji) : 'v=' + cur.id)}>
              <Button variant="ghost">✍️</Button>
            </Link>
          </div>
        </div>
      ) : (
        <p className="text-center text-sm text-muted-foreground">{t('Nothing in this scope.')}</p>
      )}
    </div>
  );
}
