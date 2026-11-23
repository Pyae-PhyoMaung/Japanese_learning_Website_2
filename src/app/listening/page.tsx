'use client';

/* Listening — port of listening.html: speed slider, chapter select, and three
   practice modes — Words and Sentences session cards (play, slow, replay,
   reveal, next) and Dictation (type what you hear, punctuation-insensitive
   comparison via norm()) over words and sentences. */
import * as React from 'react';
import { byLevel, vocabList, sentenceList, kexVocab, chapterTitle, useJL } from '@/lib/jl';
import { LevelBar } from '@/components/level-bar';
import { PageHead } from '@/components/page-head';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useT, useToast } from '@/components/providers';
import { speak, hasJaVoice, ttsSupported } from '@/lib/tts';
import { pickN, norm } from '@/lib/utils';
import type { Vocab, Sentence } from '@/lib/types';

export default function ListeningPage() {
  useJL();
  const { t } = useT();
  const toast = useToast();
  const [mounted, setMounted] = React.useState(false);
  const [rate, setRate] = React.useState(1);
  const [tab, setTab] = React.useState<'words' | 'sents' | 'dict'>('words');
  const [dictKind, setDictKind] = React.useState<'words' | 'sents'>('words');
  const [ch, setCh] = React.useState('all');
  /* session card state */
  const [idx, setIdx] = React.useState(0);
  const [revealed, setRevealed] = React.useState(false);
  /* dictation state */
  const [dPool, setDPool] = React.useState<Array<{ jp: string; mm?: string; en?: string }>>([]);
  const [dIdx, setDIdx] = React.useState(0);
  const [dAns, setDAns] = React.useState('');
  const [dState, setDState] = React.useState<'typing' | 'right' | 'wrong'>('typing');
  const [dScore, setDScore] = React.useState(0);

  const words: Vocab[] = mounted ? byLevel(vocabList()).concat(byLevel(kexVocab())) : [];
  const sents: Sentence[] = mounted ? byLevel(sentenceList()) : [];

  React.useEffect(() => {
    setMounted(true);
    if (!ttsSupported() || !hasJaVoice()) {
      toast('No Japanese voice on this device — listening needs one (try Chrome, or add a Japanese voice in your system settings).', 'warn');
    }
  }, []);

  const inCh = (x: { chapter?: number }) => ch === 'all' || String(x.chapter || 0) === ch;
  const pool = tab === 'sents' ? sents : words;
  const session = tab === 'sents' ? sents.filter(inCh) : words.filter(inCh);
  const dictPool = dictKind === 'sents' ? sents.filter(inCh) : words.filter(inCh);
  const chapters = Array.from(
    new Set((tab === 'sents' ? sents.map((x) => Number(x.chapter) || 0) : words.map((x) => Number(x.chapter) || 0)))
  ).filter((n) => n > 0).sort((a, b) => a - b);
  const chCount = (n: string) => (tab === 'sents' ? sents.filter((x) => String(x.chapter || 0) === n).length : words.filter((x) => String(x.chapter || 0) === n).length);
  const chTitle = (n: number) => {
    const first: any = tab === 'sents' ? sents.find((x) => String(x.chapter || 0) === String(n)) : words.find((x) => String(x.chapter || 0) === String(n));
    return chapterTitle(tab === 'sents' ? 'sentences' : 'vocab', n, first ? first.chapterTitle || '' : '');
  };

  const cur = session[idx];

  /* reset position when the scope changes */
  React.useEffect(() => {
    setIdx(0);
    setRevealed(false);
  }, [tab, ch, mounted]);

  /* auto-play the current item — only for the user's own moves (Next,
     tab/chapter change); never on page entry, so visiting Listening is
     silent until you press something */
  const firstPlay = React.useRef(true);
  React.useEffect(() => {
    if (!mounted || tab === 'dict') return;
    if (firstPlay.current) {
      firstPlay.current = false;
      return;
    }
    if (cur) speak(cur.jp, rate);
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [idx, tab, ch, mounted]);

  const goto = (dir: number) => {
    if (!session.length) return;
    const i = (idx + dir + session.length) % session.length;
    setIdx(i);
    setRevealed(false);
  };

  const startDictation = () => {
    if (!dictPool.length) { toast('Not enough items.', 'warn'); return; }
    setDPool(pickN(dictPool as any[], Math.min(10, dictPool.length)).map((x: any) => ({ jp: x.jp, mm: x.mm, en: x.en })));
    setDIdx(0);
    setDAns('');
    setDState('typing');
    setDScore(0);
  };

  const check = () => {
    const dcur = dPool[dIdx];
    if (!dcur) return;
    const ok = norm(dAns) === norm(dcur.jp);
    setDState(ok ? 'right' : 'wrong');
    if (ok) setDScore((s) => s + 1);
  };
  const next = () => {
    if (dIdx + 1 >= dPool.length) return;
    setDIdx(dIdx + 1);
    setDAns('');
    setDState('typing');
  };
  const dcur = dPool[dIdx];

  const sessionCard = (kind: 'words' | 'sents') => (
    <div className="space-y-4 rounded-xl border bg-card p-6 shadow-sm">
      <p className="text-center text-sm text-muted-foreground">
        {kind === 'words'
          ? t('Listen carefully, then reveal the word. Use the replay buttons as often as you like.')
          : t('Listen carefully, then reveal the sentence. Use the replay buttons as often as you like.')}
      </p>
      <div className="text-center">
        <button type="button" onClick={() => cur && speak(cur.jp, rate)} className="text-5xl" title={t('🔁 Replay')}>🔊</button>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <Button variant="outline" onClick={() => cur && speak(cur.jp, Math.max(0.5, rate - 0.4))}>{t('🐢 Slow')}</Button>
        <Button variant="outline" onClick={() => cur && speak(cur.jp, rate)}>{t('🔁 Replay')}</Button>
        <Button variant="outline" onClick={() => setRevealed(true)}>{kind === 'words' ? t('👀 Show word') : t('👀 Show sentence')}</Button>
        <Button onClick={() => goto(1)}>{kind === 'words' ? t('Next word →') : t('Next sentence →')}</Button>
      </div>
      <div className="min-h-[4rem] text-center">
        {cur && revealed ? (
          <div>
            <div className="text-2xl font-semibold">{cur.jp}</div>
            {cur.rd ? <div className="text-sm text-muted-foreground">{cur.rd}</div> : null}
            <div className="text-sm">{[cur.mm || '', cur.en || ''].filter(Boolean).join(' · ')}</div>
          </div>
        ) : (
          <div className="text-2xl text-muted-foreground">…</div>
        )}
      </div>
      <div className="text-center text-xs text-muted-foreground">{session.length ? idx + 1 : 0} / {session.length}</div>
    </div>
  );

  return (
    <div>
      <PageHead icon="🎧" title="Listening" subtitle={'Train your ear with words and full sentences using Japanese speech synthesis — replay, slow down, and test yourself with dictation.'} />
      <LevelBar />
      <div className="mb-4 flex items-center gap-3 rounded-lg border bg-muted/40 p-3">
        <span className="text-sm font-medium">🐢 {t('Speed')}</span>
        <input type="range" min={0.5} max={1.5} step={0.05} value={rate} onChange={(e) => setRate(Number(e.target.value))} className="w-48 accent-primary" />
        <span className="text-sm font-medium">🐰</span>
        <span className="text-xs text-muted-foreground">{rate.toFixed(2)}</span>
      </div>
      <div className="mb-4">
        <div className="mb-1 text-sm font-medium">{t('Chapter')}</div>
        <select value={ch} onChange={(e) => setCh(e.target.value)} className="h-9 rounded-md border border-input bg-transparent px-3 text-sm">
          <option value="all">{t('All chapters')} ({pool.length})</option>
          {chapters.map((n) => (
            <option key={n} value={String(n)}>
              {n}章 {chTitle(n)} ({chCount(String(n))})
            </option>
          ))}
        </select>
      </div>
      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList className="mb-4">
          <TabsTrigger value="words">{t('Words')}</TabsTrigger>
          <TabsTrigger value="sents">{t('Sentences')}</TabsTrigger>
          <TabsTrigger value="dict">{t('Dictation')}</TabsTrigger>
        </TabsList>
        <TabsContent value="words">{sessionCard('words')}</TabsContent>
        <TabsContent value="sents">{sessionCard('sents')}</TabsContent>
        <TabsContent value="dict">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => { setDictKind('words'); setDPool([]); }} className={'rounded-lg border px-3 py-1.5 text-sm hover:bg-accent' + (dictKind === 'words' ? ' border-primary bg-primary text-primary-foreground' : '')}>
              {t('Words')}
            </button>
            <button type="button" onClick={() => { setDictKind('sents'); setDPool([]); }} className={'rounded-lg border px-3 py-1.5 text-sm hover:bg-accent' + (dictKind === 'sents' ? ' border-primary bg-primary text-primary-foreground' : '')}>
              {t('Sentences')}
            </button>
            <Button onClick={startDictation}>{t('Start')}</Button>
          </div>
          {dPool.length ? (
            <div className="mx-auto max-w-lg space-y-4 rounded-xl border bg-card p-6 shadow-sm">
              <div className="text-xs text-muted-foreground">{dIdx + 1} / {dPool.length} · {t('Score')}: {dScore}</div>
              <div className="flex justify-center">
                <Button variant="outline" onClick={() => dcur && speak(dcur.jp, rate)}>🔊 {t('Play')}</Button>
              </div>
              <Input
                value={dAns}
                onChange={(e) => { setDAns(e.target.value); setDState('typing'); }}
                placeholder={t('Type what you hear…')}
                onKeyDown={(e) => { if (e.key === 'Enter' && dState === 'typing') check(); else if (e.key === 'Enter') next(); }}
              />
              {dState !== 'typing' ? (
                <div className={dState === 'right' ? 'text-green-600' : 'text-red-600'}>
                  {dState === 'right' ? '✓ ' + t('Correct!') : '✕ ' + (dcur ? dcur.jp : '')}
                  {dcur && (dcur.mm || dcur.en) ? <span className="ml-2 text-muted-foreground">{dcur.mm || dcur.en}</span> : null}
                </div>
              ) : null}
              <div className="flex justify-center gap-2">
                {dState === 'typing' ? <Button onClick={check}>{t('Check')}</Button> : <Button onClick={next}>{dIdx + 1 >= dPool.length ? t('Finish') : t('Next')}</Button>}
                {dState === 'typing' ? <Button variant="outline" onClick={() => dcur && speak(dcur.jp, 0.7)}>{t('🐢 Slow')}</Button> : null}
              </div>
            </div>
          ) : null}
        </TabsContent>
      </Tabs>
      <div className="mt-8 border-t pt-4 text-center text-xs text-muted-foreground">
        {t("Audio is generated by your browser's Japanese speech-synthesis voice (ja-JP). For best quality install a Japanese voice in your system settings (Windows: Settings → Time & language → Speech; macOS: System Settings → Spoken Content → System Voice).")}
      </div>
    </div>
  );
}
