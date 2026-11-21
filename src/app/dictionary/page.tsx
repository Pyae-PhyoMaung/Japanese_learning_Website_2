'use client';

/* Dictionary — port of dictionary.html: search words (jp/reading/romaji/
   English/Myanmar), sentences, and kanji in one place; matching words show
   their sentences, synonyms and antonyms, and kanji cards open the kanji
   detail dialog. */
import * as React from 'react';
import { vocabList, sentenceList, kanjiList, useJL } from '@/lib/jl';
import { PageHead } from '@/components/page-head';
import { VocabCard, KanjiCard } from '@/components/words';
import { Input } from '@/components/ui/input';
import { useT } from '@/components/providers';
import type { Vocab, Sentence, Kanji } from '@/lib/types';

export default function DictionaryPage() {
  useJL();
  const { t } = useT();
  const [mounted, setMounted] = React.useState(false);
  const [q, setQ] = React.useState('');

  React.useEffect(() => {
    setMounted(true);
    const params = new URLSearchParams(location.search);
    const qv = params.get('q');
    if (qv) setQ(qv);
  }, []);

  const V: Vocab[] = mounted ? vocabList() : [];
  const S: Sentence[] = mounted ? sentenceList() : [];
  const K: Kanji[] = mounted ? kanjiList() : [];

  const needle = q.trim().toLowerCase();
  const hit = (v: Vocab) =>
    !needle || [v.jp, v.rd, v.romaji, v.en, v.mm, v.syn, v.ant].join(' ').toLowerCase().includes(needle);
  const words = needle ? V.filter(hit).slice(0, 60) : [];
  const sents = needle ? S.filter((s) => [s.jp, s.rd, s.en, s.mm].join(' ').toLowerCase().includes(needle)).slice(0, 20) : [];
  const kanji = needle ? K.filter((k) => [k.kanji, (k.on || []).join(' '), k.kun, k.en, k.meaning].join(' ').toLowerCase().includes(needle)).slice(0, 40) : [];

  return (
    <div>
      <PageHead icon="辞" title="Dictionary" subtitle={t('Search words, sentences and kanji')} />
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('Search…')} className="mb-6 h-11 text-base" />
      {!needle ? (
        <p className="text-sm text-muted-foreground">{t('Type Japanese, romaji, English or Myanmar to look things up.')}</p>
      ) : (
        <div className="space-y-8">
          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">{t('Vocabulary')} ({words.length})</h2>
            {words.length ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {words.map((v) => (
                  <VocabCard key={v.id} v={v} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t('No words found.')}</p>
            )}
          </section>
          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">{t('Kanji')} ({kanji.length})</h2>
            {kanji.length ? (
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-6 md:grid-cols-8">
                {kanji.map((k) => (
                  <KanjiCard key={k.id} k={k} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t('No kanji found.')}</p>
            )}
          </section>
          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">{t('Sentences')} ({sents.length})</h2>
            {sents.length ? (
              <div className="space-y-2">
                {sents.map((s) => (
                  <div key={s.id} className="rounded-lg border bg-card px-4 py-3 shadow-sm">
                    <div className="font-medium">{s.jp}</div>
                    {s.rd ? <div className="text-sm text-muted-foreground">{s.rd}</div> : null}
                    {s.en ? <div className="text-sm">{s.en}</div> : null}
                    {s.mm ? <div className="text-sm">{s.mm}</div> : null}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t('No sentences found.')}</p>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
