'use client';

/* Listening — port of listening.html: three practice modes over words and
   sentences — Listen & pick (hear it, choose it), Listen & dictate (type what
   you hear, punctuation-insensitive comparison via norm()), and a speed
   control for the speech rate. */
import * as React from 'react';
import { byLevel, vocabList, sentenceList, kexVocab, useJL, level } from '@/lib/jl';
import { LevelBar } from '@/components/level-bar';
import { PageHead } from '@/components/page-head';
import { Quiz } from '@/components/quiz';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useT, useToast } from '@/components/providers';
import { speak, hasJaVoice, ttsSupported } from '@/lib/tts';
import { pickN, shuffle, norm } from '@/lib/utils';
import type { QuizItem, Vocab, Sentence } from '@/lib/types';

export default function ListeningPage() {
  useJL();
  const { t } = useT();
  const toast = useToast();
  const [mounted, setMounted] = React.useState(false);
  const [rate, setRate] = React.useState(1);
  const [quiz, setQuiz] = React.useState<QuizItem[] | null>(null);
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

  const startPick = (kind: 'words' | 'sentences') => {
    const pool = kind === 'words' ? words : sents;
    if (pool.length < 4) { toast('Not enough items.', 'warn'); return; }
    const qs: QuizItem[] = pickN(pool as any[], Math.min(10, pool.length)).map((it: any) => {
      const others = pickN(pool as any[], 3).filter((o) => o.jp !== it.jp).slice(0, 3);
      const opts = shuffle([it.jp].concat(others.map((o) => o.jp)));
      return { q: '🔊 ' + t('Tap to listen'), opts, ans: opts.indexOf(it.jp), say: it.jp, note: (it.rd || '') + ' ' + (it.mm || it.en || '') };
    });
    setQuiz(qs);
  };

  const startDictation = (kind: 'words' | 'sentences') => {
    const pool = kind === 'words' ? words : sents;
    setDPool(pickN(pool as any[], 10).map((x: any) => ({ jp: x.jp, mm: x.mm, en: x.en })));
    setDIdx(0);
    setDAns('');
    setDState('typing');
    setDScore(0);
  };

  const check = () => {
    const cur = dPool[dIdx];
    if (!cur) return;
    const ok = norm(dAns) === norm(cur.jp);
    setDState(ok ? 'right' : 'wrong');
    if (ok) setDScore((s) => s + 1);
  };
  const next = () => {
    if (dIdx + 1 >= dPool.length) return;
    setDIdx(dIdx + 1);
    setDAns('');
    setDState('typing');
  };

  const cur = dPool[dIdx];

  return (
    <div>
      <PageHead icon="🎧" title="Listening" subtitle={(mounted ? level() : '') + ' · ' + words.length + ' words / ' + sents.length + ' sentences'} />
      <LevelBar />
      <div className="mb-4 flex items-center gap-3 rounded-lg border bg-muted/40 p-3">
        <span className="text-sm font-medium">🐢</span>
        <input type="range" min={0.5} max={1.5} step={0.05} value={rate} onChange={(e) => setRate(Number(e.target.value))} className="w-48" />
        <span className="text-sm font-medium">🐰</span>
        <span className="text-xs text-muted-foreground">{rate.toFixed(2)}×</span>
      </div>
      <Tabs defaultValue="pick-words">
        <TabsList className="mb-4 flex-wrap">
          <TabsTrigger value="pick-words">{t('Listen & pick — words')}</TabsTrigger>
          <TabsTrigger value="pick-sents">{t('Listen & pick — sentences')}</TabsTrigger>
          <TabsTrigger value="dict-words">{t('Dictation — words')}</TabsTrigger>
          <TabsTrigger value="dict-sents">{t('Dictation — sentences')}</TabsTrigger>
        </TabsList>
        <TabsContent value="pick-words">
          <Button onClick={() => startPick('words')}>{t('Start')}</Button>
          <div className="mt-4">{quiz ? <Quiz items={quiz.map((q) => ({ ...q, say: undefined }))} title={t('Listen & pick')} /> : null}</div>
        </TabsContent>
        <TabsContent value="pick-sents">
          <Button onClick={() => startPick('sentences')}>{t('Start')}</Button>
          <div className="mt-4">{quiz ? <Quiz items={quiz.map((q) => ({ ...q, say: undefined }))} title={t('Listen & pick')} /> : null}</div>
        </TabsContent>
        <TabsContent value="dict-words">
          <Button onClick={() => startDictation('words')}>{t('Start')}</Button>
        </TabsContent>
        <TabsContent value="dict-sents">
          <Button onClick={() => startDictation('sentences')}>{t('Start')}</Button>
        </TabsContent>
      </Tabs>
      {/* dictation runner — shared by both dictation tabs (buttons set the pool) */}
      {dPool.length ? (
        <div className="mx-auto mt-6 max-w-lg space-y-4 rounded-xl border bg-card p-6 shadow-sm">
          <div className="text-xs text-muted-foreground">{dIdx + 1} / {dPool.length} · {t('score')}: {dScore}</div>
          <div className="flex justify-center">
            <Button variant="outline" onClick={() => cur && speak(cur.jp, rate)}>🔊 {t('Play')}</Button>
          </div>
          <Input
            value={dAns}
            onChange={(e) => { setDAns(e.target.value); setDState('typing'); }}
            placeholder={t('Type what you hear…')}
            onKeyDown={(e) => { if (e.key === 'Enter' && dState === 'typing') check(); else if (e.key === 'Enter') next(); }}
          />
          {dState !== 'typing' ? (
            <div className={dState === 'right' ? 'text-green-600' : 'text-red-600'}>
              {dState === 'right' ? '✓ ' + t('Correct!') : '✕ ' + (cur ? cur.jp : '')}
              {cur && (cur.mm || cur.en) ? <span className="ml-2 text-muted-foreground">{cur.mm || cur.en}</span> : null}
            </div>
          ) : null}
          <div className="flex justify-center gap-2">
            {dState === 'typing' ? <Button onClick={check}>{t('Check')}</Button> : <Button onClick={next}>{dIdx + 1 >= dPool.length ? t('Finish') : t('Next')}</Button>}
            {dState === 'typing' ? <Button variant="outline" onClick={() => cur && speak(cur.jp, 0.7)}>🔊 {t('Slow')}</Button> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
