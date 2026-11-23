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
import { SpeakBtn } from '@/components/words';
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

  const chips = (
    <div className="mb-4 flex flex-wrap gap-2">
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('Search')} className="h-8 w-40 rounded-md border border-input bg-transparent px-3 text-sm" />
      <button type="button" onClick={() => setCh('all')} className={'rounded-lg border px-3 py-1.5 text-sm hover:bg-accent' + (ch === 'all' ? ' border-primary bg-primary text-primary-foreground' : '')}>
        {t('All')} ({tab === 'kanji' ? K.length : V.length})
      </button>
      {(tab === 'kanji' ? kanjiChapters : vocabChapters).map((n) => (
        <button key={n} type="button" onClick={() => setCh(String(n))} className={'rounded-lg border px-3 py-1.5 text-sm hover:bg-accent' + (String(n) === ch ? ' border-primary bg-primary text-primary-foreground' : '')}>
          {n}章 {chapterTitle(tab, n, '')}
        </button>
      ))}
    </div>
  );

  const padArea = (
    <div className="flex flex-col items-center gap-3">
      <Pad ref={padRef} char={tab === 'kanji' ? kChar : curV ? curV.jp : ''} show={showGuide} />
      <div className="flex flex-wrap justify-center gap-2">
        <Button variant="outline" size="sm" onClick={() => padRef.current?.undo()}>↩ {t('Undo')}</Button>
        <Button variant="outline" size="sm" onClick={() => padRef.current?.clear()}>{t('Clear')}</Button>
        <Button variant="outline" size="sm" onClick={() => setShowGuide(!showGuide)}>{showGuide ? '👁 ' + t('Hide guide') : '👁 ' + t('Show guide')}</Button>
        {(tab === 'kanji' ? kChar : curV ? curV.jp : '') ? <SpeakBtn text={tab === 'kanji' ? kChar : curV!.jp} /> : null}
      </div>
      {(tab === 'kanji' ? kChar : curV) ? (
        <div className="text-center text-sm text-muted-foreground">
          {tab === 'kanji'
            ? (K.find((k) => k.kanji === kChar)?.meaning || '')
            : (curV ? (curV.rd || '') + ' · ' + (curV.mm || curV.en || '') : '')}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{t('Pick a character or word to practice.')}</p>
      )}
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
