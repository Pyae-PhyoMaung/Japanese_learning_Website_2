'use client';

/* Add / Edit — port of edit.html: manage your own items on top of the base
   data for every kind (kanji, vocab, grammar, sentences, tests), rename
   chapters (uchapters registry), back up & restore your whole user record,
   and see stats. Deletes use tombstones and can be restored; kex (kanji
   example) words are listed read-only so counts match the Vocabulary page. */
import * as React from 'react';
import { kanjiList, vocabList, grammarList, sentenceList, kexVocab, merged, chapters, chapterTitle, useJL } from '@/lib/jl';
import { pref, save, remove, restore, getUser, setUser } from '@/lib/store';
import { PageHead } from '@/components/page-head';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useT, useToast } from '@/components/providers';
import { uid, download } from '@/lib/utils';
import { fixField } from '@/lib/zg';
import type { UserTest } from '@/lib/types';

const KIND_TABS = ['kanji', 'vocab', 'grammar', 'sentences', 'tests', 'chapters', 'backup', 'stats'] as const;
const KLABEL: Record<string, string> = { kanji: 'Kanji', vocab: 'Vocabulary', grammar: 'Grammar', sentences: 'Sentences', tests: 'Tests', chapters: 'Chapters', backup: 'Backup', stats: 'Stats' };

/* field definitions per kind — [key, label, multiline?] */
const FIELDS: Record<string, Array<[string, string, boolean?]>> = {
  kanji: [['kanji', 'Kanji'], ['on', 'ON (comma-separated)'], ['kun', 'KUN'], ['meaning', 'Myanmar meaning', true], ['en', 'English meaning'], ['chapter', 'Chapter'], ['chapterTitle', 'Chapter title'], ['level', 'Level (N5–N1)']],
  vocab: [['jp', 'Word'], ['rd', 'Reading'], ['mm', 'Myanmar meaning', true], ['en', 'English meaning'], ['syn', 'Synonyms'], ['ant', 'Antonyms'], ['chapter', 'Chapter'], ['chapterTitle', 'Chapter title'], ['level', 'Level (N5–N1)']],
  grammar: [['title', 'Title'], ['pattern', 'Pattern'], ['meaning', 'Meaning'], ['mm', 'Myanmar explanation', true], ['lesson', 'Lesson'], ['chapter', 'Chapter'], ['chapterTitle', 'Chapter title'], ['level', 'Level (N5–N1)'], ['examples', 'Examples (jp | rd | en — one per line)', true]],
  sentences: [['jp', 'Sentence'], ['rd', 'Reading'], ['mm', 'Myanmar', true], ['en', 'English'], ['cat', 'Category'], ['chapter', 'Chapter'], ['chapterTitle', 'Chapter title'], ['level', 'Level (N5–N1)']],
  tests: [['title', 'Test title'], ['kind', 'Type: quiz or deck'], ['level', 'Level (N5–N1)'], ['chapter', 'Chapter'], ['items', 'Items — quiz: q | opt1 | opt2 | … | ANSWER-NUMBER (1-based), one per line; deck: front | back, one per line', true]],
};

function blankItem(kind: string): any {
  const it: any = { id: uid('u_'), level: 'N5', chapter: 0, chapterTitle: '' };
  (FIELDS[kind] || []).forEach(([k]) => { if (!(k in it)) it[k] = ''; });
  return it;
}

function parseSpecial(kind: string, it: any): any {
  const out = { ...it };
  if (kind === 'grammar' && typeof out.examples === 'string') {
    out.examples = (out.examples as string).split('\n').map((l) => l.trim()).filter(Boolean)
      .map((l) => { const [jp, rd = '', en = ''] = l.split('|').map((x) => x.trim()); return { jp, rd, en }; });
  }
  if (kind === 'tests') {
    out.kind = out.kind === 'deck' ? 'deck' : 'quiz';
    if (typeof out.items === 'string') {
      out.items = (out.items as string).split('\n').map((l) => l.trim()).filter(Boolean).map((l) => {
        const parts = l.split('|').map((x) => x.trim());
        if (out.kind === 'deck') return { front: parts[0], back: parts[1] || '' };
        const ans = parseInt(parts[parts.length - 1], 10) || 1;
        const opts = parts.slice(1, parts.length - 1);
        return { q: parts[0], opts, ans: ans - 1 };
      });
    }
  }
  ['chapter', 'lesson'].forEach((k) => { if (out[k] !== '' && out[k] != null) out[k] = Number(out[k]) || 0; });
  return out;
}

export default function EditPage() {
  useJL();
  const { t } = useT();
  const toast = useToast();
  const [mounted, setMounted] = React.useState(false);
  const [tab, setTab] = React.useState<string>('kanji');
  const [editing, setEditing] = React.useState<any>(null);
  const [editKind, setEditKind] = React.useState<string>('kanji');
  const [q, setQ] = React.useState('');
  const [ren, setRen] = React.useState<{ n: number; t: string } | null>(null);

  React.useEffect(() => setMounted(true), []);

  const lists: Record<string, any[]> = mounted
    ? {
        kanji: kanjiList(),
        vocab: vocabList().concat(kexVocab()),
        grammar: grammarList(),
        sentences: sentenceList(),
        tests: merged<UserTest>('tests'),
      }
    : { kanji: [], vocab: [], grammar: [], sentences: [], tests: [] };

  const startAdd = () => { setEditKind(tab); setEditing(blankItem(tab)); };
  const startEdit = (it: any) => {
    const copy = { ...it };
    if (editKindOrTab(it) === 'grammar' && copy.examples) copy.examples = (copy.examples as any[]).map((e) => [e.jp, e.rd, e.en].join(' | ')).join('\n');
    if (copy.kind === 'quiz' && copy.items) copy.items = copy.items.map((i: any) => [i.q].concat(i.opts).concat([String(i.ans + 1)]).join(' | ')).join('\n');
    if (copy.kind === 'deck' && copy.items) copy.items = copy.items.map((i: any) => [i.front, i.back].join(' | ')).join('\n');
    if (Array.isArray(copy.on)) copy.on = copy.on.join(', ');
    setEditKind(editKindOrTab(it)); setEditing(copy);
  };
  const editKindOrTab = (it: any): string =>
    it.kind === 'quiz' || it.kind === 'deck' ? 'tests' : String(it.id || '').startsWith('kex_') ? 'vocab' : it.kanji ? 'kanji' : it.title ? (it.pattern != null || it.lesson != null ? 'grammar' : 'tests') : it.jp ? (it.rd != null && it.cat != null ? 'vocab' : 'sentences') : tab;
  const commit = () => {
    if (!editing) return;
    const item = parseSpecial(editKind, editing);
    if (!item.jp && !item.kanji && !item.title && !item.q) { toast('Fill the main field first.', 'warn'); return; }
    save(editKind, item);
    toast('Saved ✅ (synced to your cloud)', 'ok');
    setEditing(null);
  };

  const searchHit = (it: any) =>
    !q || JSON.stringify(it).toLowerCase().includes(q.toLowerCase());

  const renderList = (kind: string) => {
    const list = (lists[kind] || []).filter(searchHit);
    return (
      <div>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('Search')} className="h-8 w-48" />
          <Button size="sm" onClick={startAdd}>➕ {t('Add new')}</Button>
          <span className="text-xs text-muted-foreground">{list.length} {t('items')}</span>
        </div>
        <div className="space-y-2">
          {list.map((it) => {
            const isKex = String(it.id).startsWith('kex_');
            const main = it.kanji || it.jp || it.title || '?';
            const sub = it.kind ? it.kind + ' · ' + (it.items ? it.items.length + ' items' : '') : [it.mm, it.en, it.meaning, it.rd, it.kun].filter(Boolean).join(' · ');
            const isDeleted = !isKex && (getUser() as any)[kind] && (getUser() as any)[kind].deleted && (getUser() as any)[kind].deleted[it.id];
            return (
              <div key={it.id} className={'flex items-center gap-2 rounded-lg border bg-card px-3 py-2 shadow-sm' + (isDeleted ? ' opacity-60' : '')}>
                <span className="w-24 truncate font-medium">{main}</span>
                <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">{sub}</span>
                {isKex ? <Badge variant="outline">kex</Badge> : null}
                {!isKex && !isDeleted ? (
                  <>
                    <Button size="sm" variant="ghost" onClick={() => startEdit(it)}>✏️</Button>
                    <Button size="sm" variant="ghost" onClick={() => { remove(kind, it.id); toast('Removed (you can restore it below). 🗑', 'ok'); }}>🗑</Button>
                  </>
                ) : null}
                {isDeleted ? (
                  <Button size="sm" variant="outline" onClick={() => { restore(kind, it.id); toast('Restored ♻️', 'ok'); }}>{t('Restore')}</Button>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const chs = mounted ? chapters(tab === 'grammar' ? 'grammar' : 'kanji') : [];
  const uchapters: Array<{ n: number; t: string; lvl: string }> = (mounted ? pref('uchapters') : []) || [];

  const backupExport = () => {
    download('japanese-learning-backup-' + new Date().toISOString().slice(0, 10) + '.json', JSON.stringify(getUser(), null, 1));
    toast('Backup downloaded 📥', 'ok');
  };
  const backupImport = (f: File | null) => {
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const data = JSON.parse(String(r.result));
        if (!data || typeof data !== 'object') throw new Error('bad');
        setUser(data); /* merges on next cloud push — nothing is lost */
        toast('Backup restored 📤 (it will merge into your cloud data)', 'ok');
      } catch (e) { toast('That file is not a valid backup.', 'err'); }
    };
    r.readAsText(f);
  };

  const stats = mounted
    ? (() => {
        const u: any = getUser();
        const n = (k: string, f: string) => ((u[k] || {})[f] || []).length || Object.keys((u[k] || {})[f] || {}).length;
        return {
          added: KIND_TABS.slice(0, 5).map((k) => n(k, 'added')),
          edited: KIND_TABS.slice(0, 5).map((k) => n(k, 'edited')),
          deleted: KIND_TABS.slice(0, 5).map((k) => n(k, 'deleted')),
        };
      })()
    : { added: [0, 0, 0, 0, 0], edited: [0, 0, 0, 0, 0], deleted: [0, 0, 0, 0, 0] };

  return (
    <div>
      <PageHead icon="✏️" title="Add / Edit" subtitle={'Add your own vocabulary, grammar, kanji and practice tests — or edit any existing entry. Every form saves automatically as you type (the 💾 buttons still work), and each entry belongs to a JLPT level.'} />
      <Tabs value={tab} onValueChange={(v) => { setTab(v); setQ(''); setEditing(null); }}>
        <TabsList className="mb-4 flex-wrap">
          {KIND_TABS.map((k) => (
            <TabsTrigger key={k} value={k}>{t(KLABEL[k])}</TabsTrigger>
          ))}
        </TabsList>
        {KIND_TABS.slice(0, 5).map((k) => (
          <TabsContent key={k} value={k}>{renderList(k)}</TabsContent>
        ))}
        <TabsContent value="chapters">
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{t('Rename a chapter — the new title shows everywhere (kanji, vocab, grammar).')}</p>
            <div className="flex flex-wrap gap-2">
              {chs.map((c) => {
                const cur = chapterTitle(tab === 'grammar' ? 'grammar' : 'kanji', c.n, c.t);
                return (
                  <button key={c.n} type="button" className="rounded-lg border px-3 py-2 text-sm hover:bg-accent" onClick={() => setRen({ n: c.n, t: cur })}>
                    {c.n}章 {cur || c.t} ✏️
                  </button>
                );
              })}
            </div>
            {ren ? (
              <div className="flex items-center gap-2 rounded-xl border bg-card p-3 shadow-sm">
                <Label>{t('Chapter')} {ren.n}</Label>
                <Input value={ren.t} onChange={(e) => setRen({ ...ren, t: e.target.value })} onBlur={(e) => { const fx = fixField(e.target.value); setRen({ ...ren, t: fx.value }); }} className="flex-1" />
                <Button size="sm" onClick={() => {
                  const arr = (pref('uchapters') || []).filter((x: any) => Number(x.n) !== ren.n);
                  arr.push({ n: ren.n, t: ren.t.trim(), lvl: 'N5' });
                  pref('uchapters', arr);
                  toast('Chapter renamed ✅', 'ok'); setRen(null);
                }}>{t('Save')}</Button>
                <Button size="sm" variant="ghost" onClick={() => setRen(null)}>{t('Close')}</Button>
              </div>
            ) : null}
            {uchapters.length ? (
              <div className="flex flex-wrap gap-2">
                {uchapters.map((c) => (
                  <Badge key={c.n} variant="secondary">{c.n}章 {c.t}</Badge>
                ))}
              </div>
            ) : null}
          </div>
        </TabsContent>
        <TabsContent value="backup">
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{t('Download everything you added, edited and deleted as one JSON file — or restore it on any device. Restoring merges, so nothing is lost.')}</p>
            <div className="flex flex-wrap gap-2">
              <Button onClick={backupExport}>📥 {t('Download backup')}</Button>
              <input type="file" accept="application/json" className="hidden" id="b-in" onChange={(e) => backupImport(e.target.files && e.target.files[0])} />
              <Button variant="outline" onClick={() => (document.getElementById('b-in') as HTMLInputElement)?.click()}>📤 {t('Restore backup')}</Button>
            </div>
          </div>
        </TabsContent>
        <TabsContent value="stats">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {['added', 'edited', 'deleted'].map((f, i) => (
              <div key={f} className="rounded-xl border bg-card p-4 shadow-sm">
                <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">{t(f)}</h3>
                {KIND_TABS.slice(0, 5).map((k, j) => (
                  <div key={k} className="flex justify-between text-sm">
                    <span>{k}</span><span className="font-medium">{(stats as any)[f][j]}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
      {editing ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setEditing(null)}>
          <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-xl border bg-background p-6 shadow-lg" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-4 text-lg font-semibold">{editing.id && String(editing.id).startsWith('u_') === false ? t('Edit') : t('Add new')} — {editKind}</h3>
            <div className="space-y-3">
              {(FIELDS[editKind] || []).map(([k, label, multi]) => (
                <div key={k} className="space-y-1">
                  <Label htmlFor={'f-' + k}>{label}</Label>
                  {multi ? (
                    <Textarea id={'f-' + k} value={editing[k] || ''} onChange={(e) => setEditing({ ...editing, [k]: e.target.value })} onBlur={(e) => { const fx = fixField(e.target.value); setEditing({ ...editing, [k]: fx.value }); }} />
                  ) : (
                    <Input id={'f-' + k} value={editing[k] || ''} onChange={(e) => setEditing({ ...editing, [k]: e.target.value })} onBlur={(e) => { const fx = fixField(e.target.value); setEditing({ ...editing, [k]: fx.value }); }} />
                  )}
                </div>
              ))}
            </div>
            <div className="mt-4 flex gap-2">
              <Button onClick={commit}>{t('Save')}</Button>
              <Button variant="ghost" onClick={() => setEditing(null)}>{t('Close')}</Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
