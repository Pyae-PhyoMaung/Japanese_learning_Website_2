'use client';

/* Study Partner — port of partner.html: a chat partner that understands a
   small set of intents (add vocab, quiz me, flashcards, counts, help) and
   can launch quizzes and decks right in the conversation. Chat history is
   kept in the prefs store (cloud-synced), like the original. */
import * as React from 'react';
import { kanjiList, vocabList, grammarList, sentenceList, useJL, level } from '@/lib/jl';
import { pref, notify, save as saveItem } from '@/lib/store';
import { PageHead } from '@/components/page-head';
import { Quiz } from '@/components/quiz';
import { Flashcards } from '@/components/flashcards';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useT, useToast } from '@/components/providers';
import { uid, pickN, shuffle } from '@/lib/utils';
import type { QuizItem } from '@/lib/types';

interface ChatMsg { who: 'me' | 'bot'; text: string }

export default function PartnerPage() {
  useJL();
  const { t } = useT();
  const toast = useToast();
  const [mounted, setMounted] = React.useState(false);
  const [msgs, setMsgs] = React.useState<ChatMsg[]>([]);
  const [text, setText] = React.useState('');
  const [quiz, setQuiz] = React.useState<QuizItem[] | null>(null);
  const [deck, setDeck] = React.useState<any[] | null>(null);
  const bottom = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    setMounted(true);
    const saved = (pref('pchat') || []) as ChatMsg[];
    if (saved.length) setMsgs(saved);
    else setMsgs([{ who: 'bot', text: 'Hello! I am your study partner. Try: "add 一|one thing", "quiz me kanji", "flashcards vocab", "how many words", or "help".' }]);
  }, []);
  React.useEffect(() => { bottom.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs, quiz, deck]);

  const push = (m: ChatMsg[]) => {
    const all = msgs.concat(m);
    setMsgs(all);
    pref('pchat', all.slice(-80));
  };

  const reply = (input: string): ChatMsg[] => {
    const q = input.trim().toLowerCase();
    /* add vocab: "add <jp>|<mm|en>" */
    const addm = input.match(/^add\s+([^|]+)\|(.+)$/i);
    if (addm) {
      const item = { id: uid('u_'), jp: addm[1].trim(), mm: addm[2].trim(), chapter: 0, chapterTitle: '', level: level() };
      saveItem('vocab', item);
      notify();
      return [{ who: 'bot', text: '✅ Added「' + item.jp + '」to your vocabulary. It is already synced.' }];
    }
    /* quiz me [kanji|vocab|grammar] */
    const qm = q.match(/quiz\s*me\s*(kanji|vocab|grammar|words)?/);
    if (qm) {
      const kind = qm[1] === 'kanji' ? 'kanji' : qm[1] === 'grammar' ? 'grammar' : 'vocab';
      if (kind === 'grammar') {
        const ex: QuizItem[] = [];
        grammarList().forEach((g) => (g.exercises || []).forEach((e) => ex.push({ q: e.q, opts: e.opts, ans: e.ans })));
        if (ex.length) { setQuiz(pickN(ex, 10)); return [{ who: 'bot', text: 'Here is a grammar quiz — tap the right answer 👇' }]; }
        return [{ who: 'bot', text: 'No grammar exercises found.' }];
      }
      const pool = kind === 'kanji' ? kanjiList() : vocabList();
      if (pool.length < 4) return [{ who: 'bot', text: 'Not enough ' + kind + ' for a quiz yet.' }];
      const items: QuizItem[] = pickN(pool as any[], 10).map((it: any) => {
        const others = pickN(pool as any[], 3).filter((o) => o.id !== it.id).slice(0, 3);
        const a = kind === 'kanji' ? (it.kun || (it.on || [])[0] || it.kanji) : (it.mm || it.en || '');
        const opts = shuffle([a].concat(others.map((o: any) => (kind === 'kanji' ? (o.kun || (o.on || [])[0] || o.kanji) : (o.mm || o.en || ''))));
        return { q: it.kanji || it.jp, opts, ans: opts.indexOf(a), say: it.kanji || it.jp };
      });
      setQuiz(items);
      return [{ who: 'bot', text: 'Quiz time! 📝 10 questions about ' + (kind === 'kanji' ? 'kanji' : 'words') + ' 👇' }];
    }
    /* flashcards [kanji|vocab] */
    const fm = q.match(/flashcards?\s*(kanji|vocab|words)?/);
    if (fm) {
      const kind = fm[1] === 'kanji' ? 'kanji' : 'vocab';
      const pool = kind === 'kanji' ? kanjiList() : vocabList();
      if (!pool.length) return [{ who: 'bot', text: 'Nothing to practice yet.' }];
      setDeck(pickN(pool as any[], 12).map((it: any) => ({
        front: it.kanji || it.jp,
        back: kind === 'kanji' ? (it.kun || (it.on || [])[0] || '') + ' — ' + (it.en || '') : (it.rd || '') + ' ' + (it.mm || it.en || ''),
        say: it.kanji || it.jp,
      })));
      return [{ who: 'bot', text: '🗂 Flashcards ready — tap a card to flip 👇' }];
    }
    /* counts */
    if (/(how many|count|stats)/.test(q)) {
      return [{
        who: 'bot',
        text: 'Your ' + level() + ' library: ' + kanjiList().length + ' kanji, ' + vocabList().length + ' words, ' + grammarList().length + ' grammar points, ' + sentenceList().length + ' sentences.',
      }];
    }
    if (/help/.test(q)) {
      return [{ who: 'bot', text: 'I can: "add <japanese>|<meaning>" · "quiz me kanji|vocab|grammar" · "flashcards kanji|vocab" · "how many words" — try one!' }];
    }
    return [{ who: 'bot', text: 'Hmm, I did not catch that. Type "help" to see what I can do.' }];
  };

  const send = () => {
    const v = text.trim();
    if (!v) return;
    const mine: ChatMsg = { who: 'me', text: v };
    const answer = reply(v);
    setText('');
    const all = msgs.concat([mine]).concat(answer);
    setMsgs(all);
    pref('pchat', all.slice(-80));
  };

  return (
    <div>
      <PageHead icon="🤝" title="Study Partner" subtitle={t('Chat, add items, get quizzed')} />
      <div className="mx-auto max-w-2xl space-y-4">
        <div className="h-80 space-y-2 overflow-y-auto rounded-xl border bg-card p-4 shadow-sm">
          {msgs.map((m, i) => (
            <div key={i} className={'flex ' + (m.who === 'me' ? 'justify-end' : 'justify-start')}>
              <div className={'max-w-[80%] rounded-xl px-3 py-2 text-sm ' + (m.who === 'me' ? 'bg-primary text-primary-foreground' : 'bg-muted')}>
                {m.text}
              </div>
            </div>
          ))}
          <div ref={bottom} />
        </div>
        <div className="flex gap-2">
          <Input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') send(); }} placeholder={t('Type a message…')} />
          <Button onClick={send}>{t('Send')}</Button>
        </div>
        {quiz ? <Quiz items={quiz} title={t('Partner quiz')} /> : null}
        {deck ? <Flashcards cards={deck} title={t('Partner flashcards')} /> : null}
        <Button variant="outline" size="sm" onClick={() => { pref('pchat', []); setMsgs([]); setQuiz(null); setDeck(null); toast('Chat cleared.', 'ok'); }}>
          {t('Clear chat')}
        </Button>
      </div>
    </div>
  );
}
