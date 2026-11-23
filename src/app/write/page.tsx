'use client';

/* Writing — port of write.html (+ kanji-draw.html / vocab-draw.html, now
   unified): practice writing kanji or words on the pad with an optional
   light-gray guide character, clear/undo, chapter chips, search, and deep
   links ?tab=kanji|vocab&k=<char>&v=<vocab id> from other pages. */
import * as React from 'react';
import { kanjiList, vocabList, chapterTitle, useJL } from '@/lib/jl';
import { LevelBar } from '@/components/level-bar';
import { PageHead } from '@/components/page-head';
import { Pad, PadApi } from '@/components/pad';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useT } from '@/components/providers';
import { speak } from '@/lib/tts';
import type { Kanji, Vocab } from '@/lib/types';

export default function WritePage() {
  useJL();
  const { t } = useT();
  const [mounted, setMounted] = React.useState(false);
  const [tab, setTab] = React.useState<'kanji' | 'vocab'>('kanji');
  const [ch, setCh] = React.useState<string>('all');
  const [q, setQ] = React.useState('');
  const [kChar, setKChar] = React.useState<string>('');
  const [vId, setVId] = React.useState<string>('');
  const [showGuide, setShowGuide] = React.useState(true);
  const [showAll, setShowAll] = React.useState(false); /* item lists stay closed until asked for */
  const [showCats, setShowCats] = React.useState(true);
  const padRef = React.useRef<PadApi>(null);

  const K: Kanji[] = mounted ? kanjiList() : [];
  const V: Vocab[] = mounted ? vocabList() : [];

  /* deep links: ?tab=… & ?k=<kanji char> & ?v=<vocab id> */
  React.useEffect(() => {
    setMounted(true);
    const params = new URLSearchParams(location.search);
    const tv = params.get('tab');
    const kv = params.get('k');
    const vv = params.get('v');
    if (tv === 'vocab') setTab('vocab');
    if (kv) { setTab('kanji'); setKChar(kv); }
    if (vv) { setTab('vocab'); setVId(vv); }
  }, []);

  const kanjiChapters = mounted ? Array.from(new Set(K.map((k) => Number(k.chapter) || 0))).filter((n) => n > 0).sort((a, b) => a - b) : [];
  const vocabChapters = mounted ? Array.from(new Set(V.map((v) => Number(v.chapter) || 0))).filter((n) => n > 0).sort((a, b) => a - b) : [];

  const kList = (ch === 'all' ? K : K.filter((k) => String(k.chapter || 0) === ch))
    .filter((k) => !q || (k.kanji + ' ' + (k.on || []).join(' ') + ' ' + (k.kun || '') + ' ' + (k.en || '') + ' ' + (k.meaning || '')).toLowerCase().includes(q.toLowerCase()));
  const vList = (ch === 'all' ? V : V.filter((v) => String(v.chapter || 0) === ch))
    .filter((v) => !q || (v.jp + ' ' + (v.rd || '') + ' ' + (v.en || '') + ' ' + (v.mm || '')).toLowerCase().includes(q.toLowerCase()));

  const curV = V.find((v) => v.id === vId) || null;
  const curK = K.find((k) => k.kanji === kChar) || null;

  /* auto-select the first item of the scope so the pad is never empty */
  React.useEffect(() => {
    if (!mounted) return;
    if (tab === 'kanji' && !kChar && kList.length) setKChar(kList[0].kanji);
    if (tab === 'vocab' && !vId && vList.length) setVId(vList[0].id);
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [mounted, tab, ch, q]);

  /* Prev / Next walk the current scope (chapter + search results) */
  const gotoItem = (dir: number) => {
    if (tab === 'kanji') {
      if (!kList.length) return;
      const i = kList.findIndex((k) => k.kanji === kChar);
      const next = i < 0 ? 0 : (i + dir + kList.length) % kList.length;
      setKChar(kList[next].kanji);
    } else {
      if (!vList.length) return;
      const i = vList.findIndex((v) => v.id === vId);
      const next = i < 0 ? 0 : (i + dir + vList.length) % vList.length;
      setVId(vList[next].id);
    }
    padRef.current?.clear();
  };
  const pos = tab === 'kanji' ? Math.max(0, kList.findIndex((k) => k.kanji === kChar)) : Math.max(0, vList.findIndex((v) => v.id === vId));
  const total = tab === 'kanji' ? kList.length : vList.length;

  const chips = (
    <div className="mb-4 space-y-2">
      <button type="button" onClick={() => setShowCats(!showCats)} className="rounded-lg border px-3 py-1.5 text-sm hover:bg-accent">
        {showCats ? '▾' : '▸'} {t('🗂️ Categories')}
      </button>
      {showCats ? (
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setCh('all')} className={'rounded-lg border px-3 py-1.5 text-sm hover:bg-accent' + (ch === 'all' ? ' border-primary bg-primary text-primary-foreground' : '')}>
            {t('All')} ({tab === 'kanji' ? K.length : V.length})
          </button>
          {(tab === 'kanji' ? kanjiChapters : vocabChapters).map((n) => (
            <button key={n} type="button" onClick={() => setCh(String(n))} className={'rounded-lg border px-3 py-1.5 text-sm hover:bg-accent' + (String(n) === ch ? ' border-primary bg-primary text-primary-foreground' : '')}>
              {n}章 {chapterTitle(tab, n, '')} ({tab === 'kanji' ? K.filter((x) => String(x.chapter || 0) === String(n)).length : V.filter((x) => String(x.chapter || 0) === String(n)).length})
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );

  const padChar = tab === 'kanji' ? kChar : curV ? curV.jp : '';
  const padArea = (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      <div className="mx-auto shrink-0 lg:mx-0">
        <Pad ref={padRef} char={padChar} show={showGuide} />
      </div>
      <div className="flex-1 space-y-3">
        {padChar ? (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <div className="text-2xl font-medium">
                {tab === 'kanji'
                  ? [(curK && curK.on && curK.on.length ? curK.on.join(' · ') : ''), (curK && curK.kun) || ''].filter(Boolean).join(' / ') || kChar
                  : curV ? [curV.jp, curV.rd || ''].filter(Boolean).join(' · ') : ''}
              </div>
              <Button variant="outline" size="sm" onClick={() => speak(padChar)}>🔊 {t('Listen')}</Button>
            </div>
            <div className="text-muted-foreground">
              {tab === 'kanji'
                ? curK ? [curK.en || '', curK.meaning || ''].filter(Boolean).join(' · ') : ''
                : curV ? [curV.en || '', curV.mm || ''].filter(Boolean).join(' · ') : ''}
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">{t('Pick a character or word to practice.')}</p>
        )}
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => gotoItem(-1)}>{t('← Prev')}</Button>
          <Button variant="outline" size="sm" onClick={() => gotoItem(1)}>{t('Next →')}</Button>
          <Button variant="outline" size="sm" onClick={() => padRef.current?.clear()}>🖌 {t('Clear')}</Button>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => padRef.current?.undo()}>{t('↩ Undo stroke')}</Button>
          <Button variant="outline" size="sm" onClick={() => setShowGuide(!showGuide)}>{showGuide ? t('👁 Hide guide') : t('👁 Show guide')}</Button>
        </div>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={tab === 'kanji' ? 'Search kanji, reading or meaning…' : 'Search words, reading or meaning…'}
          className="h-9 w-full max-w-sm rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
        />
        {padChar && total ? (
          <div className="text-sm text-muted-foreground">{tab === 'kanji' ? t('Kanji') : t('Words')} {pos + 1} of {total}</div>
        ) : null}
      </div>
    </div>
  );

  return (
    <div>
      <PageHead icon="✍️" title="Writing" subtitle={'Practice writing kanji and whole words by hand on the guided grid — pick a chapter and work through it, or search for any kanji or word in your selected level. Trace the light-gray guide, or hide it to test yourself.'} />
      <LevelBar />
      <Tabs value={tab} onValueChange={(v) => { setTab(v as any); setCh('all'); setQ(''); setShowAll(false); }}>
        <TabsList className="mb-4">
          <TabsTrigger value="kanji">{t('Kanji')}</TabsTrigger>
          <TabsTrigger value="vocab">{t('Vocabulary')}</TabsTrigger>
        </TabsList>
        <TabsContent value="kanji">
          {chips}
          {q || showAll ? (
            <div className="mb-6">
              <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
                <span>{kList.length} {t('kanji')}</span>
                {!q && showAll ? <Button size="sm" variant="ghost" onClick={() => setShowAll(false)}>🙈 {t('Hide')}</Button> : null}
              </div>
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-8 md:grid-cols-10">
                {kList.map((k) => (
                  <button key={k.id} type="button" onClick={() => { setKChar(k.kanji); padRef.current?.clear(); }}
                    className={'rounded-lg border py-2 text-2xl hover:bg-accent' + (k.kanji === kChar ? ' border-primary bg-primary text-primary-foreground' : '')}>
                    {k.kanji}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="mb-6">
              <Button variant="outline" onClick={() => setShowAll(true)}>👁 {t('Show all kanji')} ({kList.length})</Button>
            </div>
          )}
          {padArea}
        </TabsContent>
        <TabsContent value="vocab">
          {chips}
          {q || showAll ? (
            <div className="mb-6">
              <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
                <span>{vList.length} {t('words')}</span>
                {!q && showAll ? <Button size="sm" variant="ghost" onClick={() => setShowAll(false)}>🙈 {t('Hide')}</Button> : null}
              </div>
              <div className="flex flex-wrap gap-2">
                {vList.map((v) => (
                  <button key={v.id} type="button" onClick={() => { setVId(v.id); padRef.current?.clear(); }}
                    className={'rounded-lg border px-3 py-1.5 text-sm hover:bg-accent' + (v.id === vId ? ' border-primary bg-primary text-primary-foreground' : '')}>
                    {v.jp}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="mb-6">
              <Button variant="outline" onClick={() => setShowAll(true)}>👁 {t('Show all words')} ({vList.length})</Button>
            </div>
          )}
          {padArea}
        </TabsContent>
      </Tabs>
    </div>
  );
}
