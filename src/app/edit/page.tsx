'use client';

/* Add / Edit — port of edit.html: inline add/edit forms per tab (Vocabulary,
   Grammar, Kanji) with example/exercise repeaters, category chips, search
   tables and a Show level filter, plus Chapters (rename/add), Tests (quiz
   and flashcard deck builders) and Backup. Entries save as you type once
   they have an id (the 💾 buttons still work); deletes use tombstones and
   kex (kanji example) words are listed read-only so counts match the
   Vocabulary page. */
import * as React from 'react';
import { kanjiList, vocabList, grammarList, sentenceList, kexVocab, merged, chapters, chapterTitle, useJL } from '@/lib/jl';
import { pref, save, remove, getUser, setUser, notify } from '@/lib/store';
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
import Link from 'next/link';

const selectCls = 'h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm';
const cellCls = 'h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm';

const F = ({ label, children }: any) => (
  <div className="space-y-1">
    <Label className="text-xs font-normal text-muted-foreground">{label}</Label>
    {children}
  </div>
);

const Th = ({ children }: any) => (
  <th className="border-b px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{children}</th>
);

export default function EditPage() {
  const storeVer = useJL(); /* store version — dep for the memoized lists below, so they refresh after saves/deletes but NOT on every keystroke */
  const { t } = useT();
  const toast = useToast();
  const [mounted, setMounted] = React.useState(false);
  const [tab, setTab] = React.useState<string>('vocab');
  const [showLvl, setShowLvl] = React.useState('all');

  /* forms — blank builders give each form its legacy field set */
  const blankV = () => ({ id: '', jp: '', rd: '', romaji: '', en: '', mm: '', cat: '', ch: 0, lvl: 'N5', syn: '', ant: '' });
  const blankK = () => ({ id: '', kanji: '', on: '', kun: '', mm: '', en: '', ch: 1, lvl: 'N5', exs: [{ w: '', r: '', m: '' }] });
  const blankG = () => ({ id: '', ch: 1, lvl: 'N5', lesson: '', title: '', pattern: '', meaning: '', mm: '', expl: '', exs: [{ jp: '', rd: '', en: '' }], exer: [{ q: '', c: '', w1: '', w2: '' }] });
  const [vf, setVf] = React.useState<any>(blankV);
  const [kf, setKf] = React.useState<any>(blankK);
  const [gf, setGf] = React.useState<any>(blankG);

  /* tests builders */
  const [qzT, setQzT] = React.useState('');
  const [qzCh, setQzCh] = React.useState(0);
  const [qzLvl, setQzLvl] = React.useState('N5');
  const [qz, setQz] = React.useState<any[]>([{ q: '', c: '', w1: '', w2: '' }]);
  const [dkT, setDkT] = React.useState('');
  const [dkCh, setDkCh] = React.useState(0);
  const [dkLvl, setDkLvl] = React.useState('N5');
  const [dk, setDk] = React.useState<any[]>([{ front: '', back: '' }]);

  /* list filters */
  const [vq, setVq] = React.useState('');
  const [kq, setKq] = React.useState('');
  const [gq, setGq] = React.useState('');
  const [vCh, setVCh] = React.useState('all');
  const [kCh, setKCh] = React.useState('all');
  const [gCh, setGCh] = React.useState('all');
  const [showCats, setShowCats] = React.useState(true);

  /* chapters tab */
  const [ren, setRen] = React.useState<{ n: number; t: string } | null>(null);
  const [nchN, setNchN] = React.useState('');
  const [nchT, setNchT] = React.useState('');

  React.useEffect(() => { setMounted(true); }, []);

  const lvls = ['N5', 'N4', 'N3', 'N2', 'N1'];
  const lvlOf = (arr: any[]) => (showLvl === 'all' ? arr : arr.filter((x) => (x.level || 'N5') === showLvl));
  /* these data lists used to be rebuilt on EVERY render — and every keystroke
     re-renders the page — which is what made typing here feel laggy. They are
     memoized now: they only recompute when the store actually changes
     (storeVer), when the level filter changes, or on mount. */
  /* eslint-disable react-hooks/exhaustive-deps */
  const vocabAll: any[] = React.useMemo(() => (mounted ? lvlOf(vocabList()) : []), [mounted, showLvl, storeVer]);
  const kexAll: any[] = React.useMemo(
    () => (mounted ? (showLvl === 'all' ? lvls.flatMap((l) => kexVocab(l)) : kexVocab(showLvl)) : []),
    [mounted, showLvl, storeVer]
  );
  const kanjiAll: any[] = React.useMemo(() => (mounted ? lvlOf(kanjiList()) : []), [mounted, showLvl, storeVer]);
  const gramAll: any[] = React.useMemo(() => (mounted ? lvlOf(grammarList()) : []), [mounted, showLvl, storeVer]);
  const testsList: UserTest[] = React.useMemo(() => (mounted ? lvlOf(merged<UserTest>('tests')) : []), [mounted, showLvl, storeVer]);
  const chBook: any[] = React.useMemo(() => (mounted ? chapters('kanji') : []), [mounted, storeVer]);
  const uchapters: Array<{ n: number; t: string; lvl?: string }> = React.useMemo(
    () => (mounted ? pref('uchapters') : []) || [],
    [mounted, storeVer]
  );
  /* eslint-enable react-hooks/exhaustive-deps */

  const chT = (n: number) => {
    const c = chBook.find((x) => Number(x.n) === Number(n));
    return chapterTitle('kanji', n, c ? c.t || '' : '');
  };

  /* ---------- parse forms into stored items ---------- */
  const parseVocab = (f: any) => {
    const it: any = {
      id: f.id || uid('u_'),
      jp: f.jp.trim(), rd: f.rd.trim(), romaji: f.romaji.trim(),
      en: f.en.trim(), mm: f.mm.trim(), syn: f.syn.trim(), ant: f.ant.trim(),
      level: f.lvl, chapter: 0, chapterTitle: '', cat: '',
    };
    if (Number(f.ch) > 0) { it.chapter = Number(f.ch); it.chapterTitle = chT(it.chapter); }
    else if (f.cat.trim()) it.cat = f.cat.trim();
    return it;
  };
  const parseKanji = (f: any) => ({
    id: f.id || uid('u_'),
    kanji: f.kanji.trim(),
    on: f.on.split(/[,,、]/).map((s: string) => s.trim()).filter(Boolean),
    kun: f.kun.trim(),
    meaning: f.mm.trim(),
    en: f.en.trim(),
    chapter: Number(f.ch) || 0,
    chapterTitle: chT(Number(f.ch) || 0),
    level: f.lvl,
    examples: f.exs.filter((e: any) => e.w.trim()).map((e: any) => ({ word: e.w.trim(), reading: e.r.trim(), meaning: e.m.trim() })),
  });
  const parseGrammar = (f: any) => ({
    id: f.id || uid('u_'),
    chapter: Number(f.ch) || 0,
    chapterTitle: chT(Number(f.ch) || 0),
    level: f.lvl,
    lesson: Number(f.lesson) || 0,
    title: f.title.trim(), pattern: f.pattern.trim(), meaning: f.meaning.trim(), mm: f.mm.trim(), explanation: f.expl.trim(),
    examples: f.exs.filter((e: any) => e.jp.trim()).map((e: any) => ({ jp: e.jp.trim(), rd: e.rd.trim(), en: e.en.trim() })),
    exercises: f.exer.filter((e: any) => e.q.trim() && e.c.trim()).map((e: any) => ({ q: e.q.trim(), opts: [e.c, e.w1, e.w2].map((x) => x.trim()).filter(Boolean), ans: 0 })),
  });

  /* ---------- autosave as you type (entries that have an id) ---------- */
  const saveTimer = React.useRef<any>(null);
  React.useEffect(() => {
    if (!mounted) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      ([['vocab', vf], ['kanji', kf], ['grammar', gf]] as Array<[string, any]>).forEach(([kind, f]) => {
        const item = kind === 'vocab' ? parseVocab(f) : kind === 'kanji' ? parseKanji(f) : parseGrammar(f);
        if (!item.jp && !item.kanji && !item.title) return;
        /* NEW entries too: parseX assigns an id the first time, and we write
           it back into the form state so every later keystroke keeps editing
           that same record. Before, brand-new words were only stored when the
           💾 button was pressed — now typing alone is enough (legacy
           behaviour). */
        /* autosave is silent (no notify) — like the legacy edit.html, typing
           never re-renders the lists; they refresh on manual save, tab
           switch, level change or other store actions */
        if (!f.id) {
          save(kind, item, true);
          if (kind === 'vocab') setVf((g: any) => ({ ...g, id: item.id }));
          else if (kind === 'kanji') setKf((g: any) => ({ ...g, id: item.id }));
          else setGf((g: any) => ({ ...g, id: item.id }));
          return;
        }
        save(kind, item, true);
      });
    }, 700);
    return () => clearTimeout(saveTimer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vf, kf, gf, mounted]);

  const manualSave = (kind: 'vocab' | 'kanji' | 'grammar') => {
    const f = kind === 'vocab' ? vf : kind === 'kanji' ? kf : gf;
    const item = kind === 'vocab' ? parseVocab(f) : kind === 'kanji' ? parseKanji(f) : parseGrammar(f);
    if (!item.jp && !item.kanji && !item.title) { toast('Fill the main field first.', 'warn'); return; }
    if (kind === 'vocab') setVf((g: any) => ({ ...g, id: item.id }));
    else if (kind === 'kanji') setKf((g: any) => ({ ...g, id: item.id }));
    else setGf((g: any) => ({ ...g, id: item.id }));
    save(kind, item);
    toast('Saved ✅ (synced to your cloud)', 'ok');
  };

  const loadVocab = React.useCallback((it: any) => setVf({
    id: it.id, jp: it.jp || '', rd: it.rd || '', romaji: it.romaji || '', en: it.en || '', mm: it.mm || '',
    cat: it.cat || '', ch: it.chapter || 0, lvl: it.level || 'N5', syn: it.syn || '', ant: it.ant || '',
  }), []);
  const loadKanji = React.useCallback((it: any) => setKf({
    id: it.id, kanji: it.kanji || '', on: Array.isArray(it.on) ? it.on.join(', ') : it.on || '', kun: it.kun || '',
    mm: it.meaning || '', en: it.en || '', ch: it.chapter || 1, lvl: it.level || 'N5',
    exs: it.examples && it.examples.length ? it.examples.map((e: any) => ({ w: e.word || '', r: e.reading || '', m: e.meaning || '' })) : [{ w: '', r: '', m: '' }],
  }), []);
  const loadGrammar = React.useCallback((it: any) => setGf({
    id: it.id, ch: it.chapter || 1, lvl: it.level || 'N5', lesson: it.lesson ? String(it.lesson) : '',
    title: it.title || '', pattern: it.pattern || '', meaning: it.meaning || '', mm: it.mm || '', expl: it.explanation || '',
    exs: it.examples && it.examples.length ? it.examples.map((e: any) => ({ jp: e.jp || '', rd: e.rd || '', en: e.en || '' })) : [{ jp: '', rd: '', en: '' }],
    exer: it.exercises && it.exercises.length ? it.exercises.map((e: any) => ({ q: e.q || '', c: e.opts[0] || '', w1: e.opts[1] || '', w2: e.opts[2] || '' })) : [{ q: '', c: '', w1: '', w2: '' }],
  }), []);

  /* ---------- tests builders ---------- */
  const saveQuiz = () => {
    const items = qz.filter((r) => r.q.trim()).map((r) => ({
      q: r.q.trim(), opts: [r.c, r.w1, r.w2].map((x) => x.trim()).filter(Boolean), ans: 0,
    }));
    if (!qzT.trim() || !items.length) { toast('Fill the main field first.', 'warn'); return; }
    save('tests', { id: uid('u_'), title: qzT.trim(), kind: 'quiz', items, level: qzLvl, chapter: Number(qzCh) || 0 });
    toast('Test saved.', 'ok');
    setQzT(''); setQzCh(0); setQz([{ q: '', c: '', w1: '', w2: '' }]);
  };
  const saveDeck = () => {
    const items = dk.filter((r) => r.front.trim()).map((r) => ({ front: r.front.trim(), back: r.back.trim() }));
    if (!dkT.trim() || !items.length) { toast('Fill the main field first.', 'warn'); return; }
    save('tests', { id: uid('u_'), title: dkT.trim(), kind: 'deck', items, level: dkLvl, chapter: Number(dkCh) || 0 });
    toast('Test saved.', 'ok');
    setDkT(''); setDkCh(0); setDk([{ front: '', back: '' }]);
  };
  const loadTest = (ut: UserTest) => {
    if (ut.kind === 'deck') {
      setDkT(ut.title); setDkCh(ut.chapter || 0); setDkLvl(ut.level || 'N5');
      setDk(ut.items && ut.items.length ? ut.items.map((i: any) => ({ front: i.front || '', back: i.back || '' })) : [{ front: '', back: '' }]);
    } else {
      setQzT(ut.title); setQzCh(ut.chapter || 0); setQzLvl(ut.level || 'N5');
      setQz(ut.items && ut.items.length ? ut.items.map((i: any) => ({ q: i.q || '', c: i.opts[0] || '', w1: i.opts[1] || '', w2: i.opts[2] || '' })) : [{ q: '', c: '', w1: '', w2: '' }]);
    }
  };

  /* ---------- chapters ---------- */
  const saveChapter = () => {
    const n = Number(nchN);
    const tt = nchT.trim();
    if (!n || !tt) { toast('Fill the main field first.', 'warn'); return; }
    const arr = uchapters.filter((x) => Number(x.n) !== n);
    arr.push({ n, t: tt, lvl: showLvl === 'all' ? undefined : showLvl });
    pref('uchapters', arr);
    toast('Chapter saved.', 'ok');
    setNchN(''); setNchT('');
  };
  const delChapter = (n: number) => {
    const c = chBook.find((x) => Number(x.n) === n);
    const total = (kCounts[n] || 0) + (vCounts[n] || 0) + (gCounts[n] || 0);
    const label = c ? n + '章 ' + (chT(n) || c.t) : String(n);
    if (!window.confirm(t('Delete chapter') + ' ' + label + '?' + (total ? ' ' + t('Its items will move to chapter 0 (unassigned).') : ''))) return;
    ([['kanji', kanjiList()], ['vocab', vocabList()], ['grammar', grammarList()]] as Array<[string, any[]]>).forEach(([kind, arr]) => {
      arr.filter((it: any) => Number(it.chapter) === n).forEach((it: any) => {
        save(kind, { ...it, chapter: 0, chapterTitle: kind === 'grammar' ? 'Lesson 0' : '' });
      });
    });
    pref('uchapters', uchapters.filter((x) => Number(x.n) !== n));
    toast('Chapter deleted. Its items moved to chapter 0.', 'ok');
  };
  const saveRen = () => {
    if (!ren) return;
    const arr = uchapters.filter((x) => Number(x.n) !== ren.n);
    arr.push({ n: ren.n, t: ren.t.trim(), lvl: showLvl === 'all' ? undefined : showLvl });
    pref('uchapters', arr);
    toast('Chapter saved.', 'ok');
    setRen(null);
  };

  /* ---------- backup ---------- */
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
        setUser(data);
        toast('Backup restored 📤 (it will merge into your cloud data)', 'ok');
      } catch (e) { toast('That file is not a valid backup.', 'err'); }
    };
    r.readAsText(f);
  };
  const restoreAllDeleted = () => {
    const u: any = getUser();
    ['kanji', 'vocab', 'grammar', 'sentences', 'tests'].forEach((k) => { if (u[k]) u[k].deleted = {}; });
    setUser(u);
    toast('Restored all deleted base items ♻️', 'ok');
  };
  const resetAll = () => {
    if (!window.confirm(t('Reset ALL your changes? This restores the original book data.'))) return;
    const blank: any = {};
    ['kanji', 'vocab', 'grammar', 'sentences', 'tests'].forEach((k) => { blank[k] = { added: [], edited: {}, deleted: {} }; });
    setUser(blank);
    toast('All changes reset 🗑', 'ok');
  };

  /* backup stats line — like the original site: "kanji: 2 added, 1 edited, 0 deleted · …".
     Computed on demand (only when the Backup tab is open) instead of on every render. */
  const backupStats = () => {
    if (!mounted) return '';
    return (['kanji', 'vocab', 'grammar', 'tests'] as const)
      .map((k) => {
        const u: any = getUser();
        const s = (u && u[k]) || {};
        return k + ': ' + (s.added || []).length + ' added, ' + Object.keys(s.edited || {}).length + ' edited, ' + Object.keys(s.deleted || {}).length + ' deleted';
      })
      .join(' · ');
  };

  /* ---------- filters, chips, tables ---------- */
  const hit = (it: any, q: string) => !q || [it.jp, it.rd, it.romaji, it.mm, it.en, it.kanji, it.meaning, it.title, it.pattern].some((v) => v && String(v).toLowerCase().includes(q.toLowerCase()));
  /* counts and filtered lists are memoized too (same reason as the data lists above) */
  /* eslint-disable react-hooks/exhaustive-deps */
  const vRows: any[] = React.useMemo(() => vocabAll.concat(kexAll), [vocabAll, kexAll]);
  const vCounts = React.useMemo(() => {
    const c: Record<number, number> = {};
    vRows.forEach((it) => { const n = Number(it.chapter) || 0; if (n) c[n] = (c[n] || 0) + 1; });
    return c;
  }, [vRows]);
  const vFiltered = React.useMemo(() => vRows.filter((it) => hit(it, vq) && (vCh === 'all' || String(it.chapter || 0) === vCh)), [vRows, vq, vCh]);
  const kCounts = React.useMemo(() => {
    const c: Record<number, number> = {};
    kanjiAll.forEach((it) => { const n = Number(it.chapter) || 0; if (n) c[n] = (c[n] || 0) + 1; });
    return c;
  }, [kanjiAll]);
  const kFiltered = React.useMemo(() => kanjiAll.filter((it) => hit(it, kq) && (kCh === 'all' || String(it.chapter || 0) === kCh)), [kanjiAll, kq, kCh]);
  const gCounts = React.useMemo(() => {
    const c: Record<number, number> = {};
    gramAll.forEach((it) => { const n = Number(it.chapter) || 0; if (n) c[n] = (c[n] || 0) + 1; });
    return c;
  }, [gramAll]);
  const gFiltered = React.useMemo(() => gramAll.filter((it) => hit(it, gq) && (gCh === 'all' || String(it.chapter || 0) === gCh)), [gramAll, gq, gCh]);
  const sCounts = React.useMemo(() => {
    const c: Record<number, number> = {};
    (mounted ? lvlOf(sentenceList()) : []).forEach((it: any) => { const n = Number(it.chapter) || 0; if (n) c[n] = (c[n] || 0) + 1; });
    return c;
  }, [mounted, showLvl, storeVer]);
  const tCounts = React.useMemo(() => {
    const c: Record<number, number> = {};
    testsList.forEach((it) => { const n = Number(it.chapter) || 0; if (n) c[n] = (c[n] || 0) + 1; });
    return c;
  }, [testsList]);
  /* eslint-enable react-hooks/exhaustive-deps */

  const chips = (val: string, set: (v: string) => void, counts: Record<number, number>) => (
    <div className="flex flex-wrap gap-2">
      <button type="button" onClick={() => set('all')} className={'rounded-full border px-3 py-1 text-sm ' + (val === 'all' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent')}>{t('All')}</button>
      {chBook.map((c) => (
        <button key={c.n} type="button" onClick={() => set(String(c.n))} className={'rounded-full border px-3 py-1 text-sm ' + (val === String(c.n) ? 'bg-primary text-primary-foreground' : 'hover:bg-accent')}>
          {c.n}章 {chT(c.n) || c.t} ({counts[c.n] || 0})
        </button>
      ))}
    </div>
  );

  const lvlBadge = (it: any) => <Badge variant="outline" className="ml-1 text-[10px]">{it.level || 'N5'}</Badge>;
  const editDelete = (load: () => void, kind: string, id: string) => (
    <span className="flex justify-end gap-1">
      <Button size="sm" variant="ghost" onClick={load}>✏️</Button>
      <Button size="sm" variant="ghost" onClick={() => { remove(kind, id); toast('Removed (you can restore it below). 🗑', 'ok'); }}>🗑</Button>
    </span>
  );

  /* the heavy tables are memoized as JSX row arrays — the legacy edit.html
     re-renders NOTHING while you type (plain DOM inputs, silent saves). The
     React equivalent: a keystroke re-renders the form only; these arrays keep
     their element identity between renders, so React skips re-rendering the
     whole table on every keystroke and only rebuilds it when the data,
     filters or language actually change. */
  /* eslint-disable react-hooks/exhaustive-deps */
  const vTableRows = React.useMemo(() => vFiltered.map((it) => {
    const isKex = String(it.id || '').startsWith('kex_');
    return (
      <tr key={it.id} className="border-b last:border-b-0">
        <td className="px-3 py-2"><span className="font-medium">{it.jp}</span>{lvlBadge(it)}</td>
        <td className="px-3 py-2 text-muted-foreground">{it.rd}</td>
        <td className="px-3 py-2">{it.mm || it.en}</td>
        <td className="px-3 py-2 text-muted-foreground">{it.chapter ? it.chapter + '章 ' + chapterTitle('vocab', it.chapter, it.chapterTitle || '') : (it.cat || '')}</td>
        <td className="px-3 py-2 text-right">
          {isKex ? <span className="text-xs text-muted-foreground">{t('read-only')}</span> : editDelete(() => loadVocab(it), 'vocab', it.id)}
        </td>
      </tr>
    );
  }), [vFiltered, t, loadVocab, toast]);
  const gTableRows = React.useMemo(() => gFiltered.map((it) => (
    <tr key={it.id} className="border-b last:border-b-0">
      <td className="px-3 py-2"><span className="font-medium">{it.title}</span>{lvlBadge(it)}</td>
      <td className="px-3 py-2 text-muted-foreground">{it.pattern}</td>
      <td className="px-3 py-2">{it.mm || it.meaning}</td>
      <td className="px-3 py-2 text-muted-foreground">{it.chapter || ''}</td>
      <td className="px-3 py-2 text-right">{editDelete(() => loadGrammar(it), 'grammar', it.id)}</td>
    </tr>
  )), [gFiltered, t, loadGrammar, toast]);
  const kTableRows = React.useMemo(() => kFiltered.map((it) => (
    <tr key={it.id} className="border-b last:border-b-0">
      <td className="px-3 py-2"><span className="font-medium">{it.kanji}</span>{lvlBadge(it)}</td>
      <td className="px-3 py-2 text-muted-foreground">{Array.isArray(it.on) ? it.on.join('・') : it.on}</td>
      <td className="px-3 py-2 text-muted-foreground">{it.kun}</td>
      <td className="px-3 py-2">{it.en || it.meaning}</td>
      <td className="px-3 py-2 text-muted-foreground">{it.chapter || ''}</td>
      <td className="px-3 py-2 text-right">{editDelete(() => loadKanji(it), 'kanji', it.id)}</td>
    </tr>
  )), [kFiltered, t, loadKanji, toast]);
  /* eslint-enable react-hooks/exhaustive-deps */

  const tabLabel = (k: string) => (k === 'vocab' ? t('Vocabulary') : k === 'grammar' ? t('Grammar') : k === 'kanji' ? t('Kanji') : k === 'chapters' ? t('Chapters') : k === 'tests' ? t('Tests') : t('Backup'));

  return (
    <div>
      <PageHead icon="⚙️" title="Add / Edit Content" subtitle={'Add your own vocabulary, grammar, kanji and practice tests — or edit any existing entry. Every form saves automatically as you type (the 💾 buttons still work), and each entry belongs to a JLPT level.'} />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="text-xs text-muted-foreground">{t('Show level')}</div>
        <select value={showLvl} onChange={(e) => setShowLvl(e.target.value)} className="h-8 rounded-md border border-input bg-transparent px-2 text-sm">
          <option value="all">{t('All levels')}</option>
          {lvls.map((l) => <option key={l} value={l}>{l}</option>)}
        </select>
        <span className="text-xs text-muted-foreground">{t('New entries get the level chosen inside each form. Base book data is N5.')}</span>
      </div>
      <Tabs value={tab} onValueChange={(v) => { setTab(v); setRen(null); notify(); /* refresh lists after silent autosaves */ }}>
        <TabsList className="mb-4 flex-wrap">
          {['vocab', 'grammar', 'kanji', 'chapters', 'tests', 'backup'].map((k) => (
            <TabsTrigger key={k} value={k}>{tabLabel(k)}</TabsTrigger>
          ))}
        </TabsList>

        {/* ---- Vocabulary ---- */}
        <TabsContent value="vocab">
          <div className="mb-4 rounded-xl border bg-card p-4 shadow-sm">
            <h3 className="mb-3 font-semibold">➕ {t('Add vocabulary')}</h3>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
              <F label={t('Japanese (word)')}><input value={vf.jp} onChange={(e) => setVf({ ...vf, jp: e.target.value })} placeholder="例：お弁当" className={cellCls} /></F>
              <F label={t('Reading (kana)')}><input value={vf.rd} onChange={(e) => setVf({ ...vf, rd: e.target.value })} placeholder="おべんとう" className={cellCls} /></F>
              <F label={t('Romaji')}><input value={vf.romaji} onChange={(e) => setVf({ ...vf, romaji: e.target.value })} placeholder="obentou" className={cellCls} /></F>
              <F label={t('English meaning')}><input value={vf.en} onChange={(e) => setVf({ ...vf, en: e.target.value })} placeholder="boxed lunch" className={cellCls} /></F>
              <F label={t('Burmese meaning')}><input value={vf.mm} onChange={(e) => setVf({ ...vf, mm: e.target.value })} onBlur={(e) => { const fx = fixField(e.target.value); setVf({ ...vf, mm: fx.value }); }} placeholder="ထမင်းထုပ်" className={cellCls} /></F>
              <F label={t('Category')}><input value={vf.cat} onChange={(e) => setVf({ ...vf, cat: e.target.value })} placeholder={t('My words')} className={cellCls} /></F>
              <F label={t('Chapter (book chapters)')}>
                <select value={String(vf.ch || 0)} onChange={(e) => setVf({ ...vf, ch: Number(e.target.value) })} className={selectCls}>
                  <option value="0">{t('— keep category —')}</option>
                  {chBook.map((c) => <option key={c.n} value={String(c.n)}>{c.n}章 {chT(c.n) || c.t}</option>)}
                </select>
              </F>
              <F label={t('Level')}>
                <select value={vf.lvl} onChange={(e) => setVf({ ...vf, lvl: e.target.value })} className={selectCls}>
                  {lvls.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
              </F>
              <F label={t('Synonyms (comma separated)')}><input value={vf.syn} onChange={(e) => setVf({ ...vf, syn: e.target.value })} placeholder="例：昼ごはん, lunch" className={cellCls} /></F>
              <F label={t('Antonyms (comma separated)')}><input value={vf.ant} onChange={(e) => setVf({ ...vf, ant: e.target.value })} placeholder="例：夜, dinner" className={cellCls} /></F>
            </div>
            <div className="mt-4 flex gap-2">
              <Button onClick={() => manualSave('vocab')}>💾 {t('Save word')}</Button>
              <Button variant="outline" onClick={() => setVf(blankV())}>✨ {t('New / clear')}</Button>
            </div>
          </div>
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <Input value={vq} onChange={(e) => setVq(e.target.value)} placeholder={t('Search your words…')} className="h-9 min-w-56 flex-1" />
            <span className="text-xs text-muted-foreground">{vocabAll.length} {t('words total')} + {kexAll.length} {t('kanji examples (read-only)')} ({t('showing')} {vFiltered.length})</span>
          </div>
          <button type="button" onClick={() => setShowCats(!showCats)} className="mb-2 rounded-md border px-2 py-1 text-xs">{showCats ? '▾' : '▸'} {t('Categories')}</button>
          {showCats ? <div className="mb-3">{chips(vCh, setVCh, vCounts)}</div> : null}
          <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
            <table className="w-full text-sm">
              <thead><tr><Th>{t('JAPANESE')}</Th><Th>{t('READING')}</Th><Th>{t('MEANING')}</Th><Th>{t('CATEGORY')}</Th><Th /></tr></thead>
              <tbody>
                {vTableRows}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* ---- Grammar ---- */}
        <TabsContent value="grammar">
          <div className="mb-4 rounded-xl border bg-card p-4 shadow-sm">
            <h3 className="mb-3 font-semibold">➕ {t('Add grammar point')}</h3>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
              <F label={t('Chapter')}>
                <select value={String(gf.ch || 1)} onChange={(e) => setGf({ ...gf, ch: Number(e.target.value) })} className={selectCls}>
                  {chBook.map((c) => <option key={c.n} value={String(c.n)}>{c.n}章 {chT(c.n) || c.t}</option>)}
                </select>
              </F>
              <F label={t('Level')}>
                <select value={gf.lvl} onChange={(e) => setGf({ ...gf, lvl: e.target.value })} className={selectCls}>
                  {lvls.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
              </F>
              <F label={t('Lesson no. (reference)')}><input value={gf.lesson} onChange={(e) => setGf({ ...gf, lesson: e.target.value })} placeholder="1" className={cellCls} /></F>
              <F label={t('Title')}><input value={gf.title} onChange={(e) => setGf({ ...gf, title: e.target.value })} placeholder="〜てください" className={cellCls} /></F>
              <F label={t('Pattern')}><input value={gf.pattern} onChange={(e) => setGf({ ...gf, pattern: e.target.value })} placeholder="〜てください" className={cellCls} /></F>
              <F label={t('Meaning')}><input value={gf.meaning} onChange={(e) => setGf({ ...gf, meaning: e.target.value })} placeholder="please do…" className={cellCls} /></F>
              <F label={t('Burmese meaning')}><input value={gf.mm} onChange={(e) => setGf({ ...gf, mm: e.target.value })} onBlur={(e) => { const fx = fixField(e.target.value); setGf({ ...gf, mm: fx.value }); }} placeholder="…လုပ်ပေးပါ" className={cellCls} /></F>
            </div>
            <div className="mt-3">
              <F label={t('Explanation')}><Textarea value={gf.expl} onChange={(e) => setGf({ ...gf, expl: e.target.value })} className="min-h-20" /></F>
            </div>
            <h4 className="mb-2 mt-4 text-sm font-semibold">{t('Examples')}</h4>
            <div className="space-y-2">
              {gf.exs.map((e: any, i: number) => (
                <div key={i} className="flex flex-wrap items-center gap-2">
                  <input value={e.jp} onChange={(ev) => { const exs = [...gf.exs]; exs[i] = { ...e, jp: ev.target.value }; setGf({ ...gf, exs }); }} placeholder="Japanese 例：学校へ行きます。" className={cellCls + ' min-w-40 flex-1'} />
                  <input value={e.rd} onChange={(ev) => { const exs = [...gf.exs]; exs[i] = { ...e, rd: ev.target.value }; setGf({ ...gf, exs }); }} placeholder={t('Reading')} className={cellCls + ' min-w-32 flex-1'} />
                  <input value={e.en} onChange={(ev) => { const exs = [...gf.exs]; exs[i] = { ...e, en: ev.target.value }; setGf({ ...gf, exs }); }} placeholder={t('English')} className={cellCls + ' min-w-32 flex-1'} />
                  <Button size="sm" variant="ghost" onClick={() => setGf({ ...gf, exs: gf.exs.filter((_: any, j: number) => j !== i) })}>✕</Button>
                </div>
              ))}
            </div>
            <Button size="sm" variant="outline" className="mt-2" onClick={() => setGf({ ...gf, exs: gf.exs.concat([{ jp: '', rd: '', en: '' }]) })}>+ {t('Add example')}</Button>
            <h4 className="mb-2 mt-4 text-sm font-semibold">{t('Exercises (first option = correct answer)')}</h4>
            <div className="space-y-2">
              {gf.exer.map((e: any, i: number) => (
                <div key={i} className="flex flex-wrap items-center gap-2">
                  <input value={e.q} onChange={(ev) => { const exer = [...gf.exer]; exer[i] = { ...e, q: ev.target.value }; setGf({ ...gf, exer }); }} placeholder="Question 例：学校___行きます。" className={cellCls + ' min-w-40 flex-1'} />
                  <input value={e.c} onChange={(ev) => { const exer = [...gf.exer]; exer[i] = { ...e, c: ev.target.value }; setGf({ ...gf, exer }); }} placeholder="✓ Correct option" className={cellCls + ' min-w-28 flex-1'} />
                  <input value={e.w1} onChange={(ev) => { const exer = [...gf.exer]; exer[i] = { ...e, w1: ev.target.value }; setGf({ ...gf, exer }); }} placeholder={t('Wrong option')} className={cellCls + ' min-w-28 flex-1'} />
                  <input value={e.w2} onChange={(ev) => { const exer = [...gf.exer]; exer[i] = { ...e, w2: ev.target.value }; setGf({ ...gf, exer }); }} placeholder={t('Wrong option')} className={cellCls + ' min-w-28 flex-1'} />
                  <Button size="sm" variant="ghost" onClick={() => setGf({ ...gf, exer: gf.exer.filter((_: any, j: number) => j !== i) })}>✕</Button>
                </div>
              ))}
            </div>
            <Button size="sm" variant="outline" className="mt-2" onClick={() => setGf({ ...gf, exer: gf.exer.concat([{ q: '', c: '', w1: '', w2: '' }]) })}>+ {t('Add exercise')}</Button>
            <div className="mt-4 flex gap-2">
              <Button onClick={() => manualSave('grammar')}>💾 {t('Save grammar point')}</Button>
              <Button variant="outline" onClick={() => setGf(blankG())}>✨ {t('New / clear')}</Button>
            </div>
          </div>
          <div className="mb-3"><Input value={gq} onChange={(e) => setGq(e.target.value)} placeholder={t('Search grammar points…')} className="h-9" /></div>
          <button type="button" onClick={() => setShowCats(!showCats)} className="mb-2 rounded-md border px-2 py-1 text-xs">{showCats ? '▾' : '▸'} {t('Categories')}</button>
          {showCats ? <div className="mb-3">{chips(gCh, setGCh, gCounts)}</div> : null}
          <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
            <table className="w-full text-sm">
              <thead><tr><Th>{t('TITLE')}</Th><Th>{t('PATTERN')}</Th><Th>{t('MEANING')}</Th><Th>{t('CH.')}</Th><Th /></tr></thead>
              <tbody>
                {gTableRows}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* ---- Kanji ---- */}
        <TabsContent value="kanji">
          <div className="mb-4 rounded-xl border bg-card p-4 shadow-sm">
            <h3 className="mb-3 font-semibold">➕ {t('Add kanji')}</h3>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
              <F label={t('Kanji')}><input value={kf.kanji} onChange={(e) => setKf({ ...kf, kanji: e.target.value })} placeholder="食" className={cellCls} /></F>
              <F label={t('On readings (comma separated)')}><input value={kf.on} onChange={(e) => setKf({ ...kf, on: e.target.value })} placeholder="ショク" className={cellCls} /></F>
              <F label={t('Kun reading')}><input value={kf.kun} onChange={(e) => setKf({ ...kf, kun: e.target.value })} placeholder="た(べる)" className={cellCls} /></F>
              <F label={t('Burmese meaning')}><input value={kf.mm} onChange={(e) => setKf({ ...kf, mm: e.target.value })} onBlur={(e) => { const fx = fixField(e.target.value); setKf({ ...kf, mm: fx.value }); }} placeholder="စားသည်" className={cellCls} /></F>
              <F label={t('English meaning')}><input value={kf.en} onChange={(e) => setKf({ ...kf, en: e.target.value })} placeholder="eat" className={cellCls} /></F>
              <F label={t('Chapter')}>
                <select value={String(kf.ch || 1)} onChange={(e) => setKf({ ...kf, ch: Number(e.target.value) })} className={selectCls}>
                  {chBook.map((c) => <option key={c.n} value={String(c.n)}>{c.n}章 {chT(c.n) || c.t}</option>)}
                </select>
              </F>
              <F label={t('Level')}>
                <select value={kf.lvl} onChange={(e) => setKf({ ...kf, lvl: e.target.value })} className={selectCls}>
                  {lvls.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
              </F>
            </div>
            <h4 className="mb-2 mt-4 text-sm font-semibold">{t('Example words')}</h4>
            <div className="space-y-2">
              {kf.exs.map((e: any, i: number) => (
                <div key={i} className="flex flex-wrap items-center gap-2">
                  <input value={e.w} onChange={(ev) => { const exs = [...kf.exs]; exs[i] = { ...e, w: ev.target.value }; setKf({ ...kf, exs }); }} placeholder="Word 例：食べます" className={cellCls + ' min-w-40 flex-1'} />
                  <input value={e.r} onChange={(ev) => { const exs = [...kf.exs]; exs[i] = { ...e, r: ev.target.value }; setKf({ ...kf, exs }); }} placeholder={t('Reading')} className={cellCls + ' min-w-32 flex-1'} />
                  <input value={e.m} onChange={(ev) => { const exs = [...kf.exs]; exs[i] = { ...e, m: ev.target.value }; setKf({ ...kf, exs }); }} placeholder={t('Burmese/English meaning')} className={cellCls + ' min-w-32 flex-1'} />
                  <Button size="sm" variant="ghost" onClick={() => setKf({ ...kf, exs: kf.exs.filter((_: any, j: number) => j !== i) })}>✕</Button>
                </div>
              ))}
            </div>
            <Button size="sm" variant="outline" className="mt-2" onClick={() => setKf({ ...kf, exs: kf.exs.concat([{ w: '', r: '', m: '' }]) })}>+ {t('Add example word')}</Button>
            <div className="mt-4 flex gap-2">
              <Button onClick={() => manualSave('kanji')}>💾 {t('Save kanji')}</Button>
              <Button variant="outline" onClick={() => setKf(blankK())}>✨ {t('New / clear')}</Button>
            </div>
          </div>
          <div className="mb-3"><Input value={kq} onChange={(e) => setKq(e.target.value)} placeholder={t('Search kanji, readings or meanings…')} className="h-9" /></div>
          <button type="button" onClick={() => setShowCats(!showCats)} className="mb-2 rounded-md border px-2 py-1 text-xs">{showCats ? '▾' : '▸'} {t('Categories')}</button>
          {showCats ? <div className="mb-3">{chips(kCh, setKCh, kCounts)}</div> : null}
          <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
            <table className="w-full text-sm">
              <thead><tr><Th>{t('KANJI')}</Th><Th>{t('ON')}</Th><Th>{t('KUN')}</Th><Th>{t('MEANING')}</Th><Th>{t('CH.')}</Th><Th /></tr></thead>
              <tbody>
                {kTableRows}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* ---- Chapters ---- */}
        <TabsContent value="chapters">
          <div className="space-y-4">
            <div className="rounded-xl border bg-card p-4 shadow-sm">
              <h3 className="mb-3 font-semibold">📚 {t('Chapters')}</h3>
              <p className="mb-3 text-sm text-muted-foreground">
                {t('Add, rename or delete chapters. They appear on the Kanji, Vocabulary, Grammar and Writing pages, and in every form on this page.')}
                {' '}<b>{showLvl === 'all' ? t('All levels') : showLvl}</b>
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <F label={t('Chapter no.')}>
                  <input type="number" min={1} value={nchN} onChange={(e) => setNchN(e.target.value)} className={cellCls} />
                </F>
                <F label={t('Title')}><input value={nchT} onChange={(e) => setNchT(e.target.value)} onBlur={(e) => { const fx = fixField(e.target.value); setNchT(fx.value); }} placeholder="例：Numbers / နံပါတ်များ" className={cellCls} /></F>
                <div className="flex items-end"><Button onClick={saveChapter}>💾 {t('Add / update chapter')}</Button></div>
              </div>
            </div>
            {ren ? (
              <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-card p-3 shadow-sm">
                <Label>{t('Chapter')} {ren.n}</Label>
                <Input value={ren.t} onChange={(e) => setRen({ ...ren, t: e.target.value })} onBlur={(e) => { const fx = fixField(e.target.value); setRen({ ...ren, t: fx.value }); }} className="flex-1" />
                <Button size="sm" onClick={saveRen}>{t('Save')}</Button>
                <Button size="sm" variant="ghost" onClick={() => setRen(null)}>{t('Close')}</Button>
              </div>
            ) : null}
            <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
              <table className="w-full text-sm">
                <thead><tr><Th>CH</Th><Th>{t('TITLE')}</Th><Th>{t('KANJI')}</Th><Th>{t('VOCAB')}</Th><Th>{t('GRAMMAR')}</Th><Th>{t('LISTEN')}</Th><Th>{t('TESTS')}</Th><Th /></tr></thead>
                <tbody>
                  {chBook.map((c) => (
                    <tr key={c.n} className="border-b last:border-b-0">
                      <td className="px-3 py-2 font-bold">{c.n}</td>
                      <td className="px-3 py-2">{chT(c.n) || c.t}</td>
                      <td className="px-3 py-2 text-center">{kCounts[c.n] || 0}</td>
                      <td className="px-3 py-2 text-center">{vCounts[c.n] || 0}</td>
                      <td className="px-3 py-2 text-center">{gCounts[c.n] || 0}</td>
                      <td className="px-3 py-2 text-center">{sCounts[c.n] || 0}</td>
                      <td className="px-3 py-2 text-center">{tCounts[c.n] || 0}</td>
                      <td className="px-3 py-2 text-right">
                        <span className="flex justify-end gap-1">
                          <Button size="sm" variant="ghost" onClick={() => setRen({ n: c.n, t: chT(c.n) || c.t || '' })}>✏️ {t('Rename')}</Button>
                          <Button size="sm" variant="ghost" onClick={() => delChapter(c.n)}>🗑 {t('Delete')}</Button>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* ---- Tests ---- */}
        <TabsContent value="tests">
          <div className="grid grid-cols-1 gap-4">
            <div className="rounded-xl border bg-card p-4 shadow-sm">
              <h3 className="mb-3 font-semibold">➕ {t('Build your own quiz')}</h3>
              <div className="space-y-3">
                <F label={t('Quiz title')}><input value={qzT} onChange={(e) => setQzT(e.target.value)} placeholder={t('My N5 word test')} className={cellCls} /></F>
                <div className="grid grid-cols-2 gap-2">
                  <F label={t('Chapter')}>
                    <select value={String(qzCh)} onChange={(e) => setQzCh(Number(e.target.value))} className={selectCls}>
                      <option value="0">{t('— no chapter —')}</option>
                      {chBook.map((c) => <option key={c.n} value={String(c.n)}>{c.n}章 {chT(c.n) || c.t}</option>)}
                    </select>
                  </F>
                  <F label={t('Level')}>
                    <select value={qzLvl} onChange={(e) => setQzLvl(e.target.value)} className={selectCls}>
                      {lvls.map((l) => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </F>
                </div>
                {qz.map((r, i) => (
                  <div key={i} className="flex flex-wrap items-center gap-2">
                    <input value={r.q} onChange={(e) => { const a = [...qz]; a[i] = { ...r, q: e.target.value }; setQz(a); }} placeholder="Question 例：学校___行きます。" className={cellCls + ' min-w-40 flex-1'} />
                    <input value={r.c} onChange={(e) => { const a = [...qz]; a[i] = { ...r, c: e.target.value }; setQz(a); }} placeholder="✓ Correct option" className={cellCls + ' min-w-28 flex-1'} />
                    <input value={r.w1} onChange={(e) => { const a = [...qz]; a[i] = { ...r, w1: e.target.value }; setQz(a); }} placeholder={t('Wrong option')} className={cellCls + ' min-w-28 flex-1'} />
                    <input value={r.w2} onChange={(e) => { const a = [...qz]; a[i] = { ...r, w2: e.target.value }; setQz(a); }} placeholder={t('Wrong option')} className={cellCls + ' min-w-28 flex-1'} />
                    <Button size="sm" variant="ghost" onClick={() => setQz(qz.filter((_: any, j: number) => j !== i))}>✕</Button>
                  </div>
                ))}
                <Button size="sm" variant="outline" onClick={() => setQz(qz.concat([{ q: '', c: '', w1: '', w2: '' }]))}>+ {t('Add question')}</Button>
                <div className="flex gap-2">
                  <Button onClick={saveQuiz}>💾 {t('Save quiz')}</Button>
                  <Button variant="outline" onClick={() => { setQzT(''); setQzCh(0); setQzLvl('N5'); setQz([{ q: '', c: '', w1: '', w2: '' }]); }}>✨ {t('New / clear')}</Button>
                </div>
              </div>
            </div>
            <div className="rounded-xl border bg-card p-4 shadow-sm">
              <h3 className="mb-3 font-semibold">➕ {t('Build a flashcard deck')}</h3>
              <div className="space-y-3">
                <F label={t('Deck title')}><input value={dkT} onChange={(e) => setDkT(e.target.value)} placeholder={t('My hard words')} className={cellCls} /></F>
                <div className="grid grid-cols-2 gap-2">
                  <F label={t('Chapter')}>
                    <select value={String(dkCh)} onChange={(e) => setDkCh(Number(e.target.value))} className={selectCls}>
                      <option value="0">{t('— no chapter —')}</option>
                      {chBook.map((c) => <option key={c.n} value={String(c.n)}>{c.n}章 {chT(c.n) || c.t}</option>)}
                    </select>
                  </F>
                  <F label={t('Level')}>
                    <select value={dkLvl} onChange={(e) => setDkLvl(e.target.value)} className={selectCls}>
                      {lvls.map((l) => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </F>
                </div>
                {dk.map((r, i) => (
                  <div key={i} className="flex flex-wrap items-center gap-2">
                    <input value={r.front} onChange={(e) => { const a = [...dk]; a[i] = { ...r, front: e.target.value }; setDk(a); }} placeholder={t('Front')} className={cellCls + ' min-w-40 flex-1'} />
                    <input value={r.back} onChange={(e) => { const a = [...dk]; a[i] = { ...r, back: e.target.value }; setDk(a); }} placeholder={t('Back')} className={cellCls + ' min-w-40 flex-1'} />
                    <Button size="sm" variant="ghost" onClick={() => setDk(dk.filter((_: any, j: number) => j !== i))}>✕</Button>
                  </div>
                ))}
                <Button size="sm" variant="outline" onClick={() => setDk(dk.concat([{ front: '', back: '' }]))}>+ {t('Add card')}</Button>
                <div className="flex gap-2">
                  <Button onClick={saveDeck}>💾 {t('Save deck')}</Button>
                  <Button variant="outline" onClick={() => { setDkT(''); setDkCh(0); setDkLvl('N5'); setDk([{ front: '', back: '' }]); }}>✨ {t('New / clear')}</Button>
                </div>
              </div>
            </div>
          </div>
          <h3 className="mb-3 mt-6 font-semibold">{t('Your tests')}</h3>
          {!testsList.length ? (
            <p className="text-sm text-muted-foreground">{t('No tests yet — build them above.')}</p>
          ) : (
            <div className="space-y-3">
              {testsList.map((ut) => (
                <div key={ut.id} className="flex items-center justify-between rounded-xl border bg-card p-4 shadow-sm">
                  <div>
                    <div className="font-medium">{ut.title}</div>
                    <div className="text-xs text-muted-foreground">{ut.kind === 'deck' ? '🗂 deck' : '❓ quiz'} · {ut.items ? ut.items.length : 0} items{ut.level ? ' · ' + ut.level : ''}</div>
                  </div>
                  <div className="flex gap-2">
                    <Link href="/tests" className="inline-flex h-8 items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90">▶ {t('Take')}</Link>
                    <Button size="sm" variant="ghost" onClick={() => loadTest(ut)}>✏️</Button>
                    <Button size="sm" variant="ghost" onClick={() => { remove('tests', ut.id); toast('Removed (you can restore it below). 🗑', 'ok'); }}>🗑</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ---- Backup ---- */}
        <TabsContent value="backup">
          <div className="space-y-4 rounded-xl border bg-card p-4 shadow-sm">
            <h3 className="font-semibold">💾 {t('Backup your additions')}</h3>
            <p className="text-sm text-muted-foreground">{t('Your additions and edits are stored only in this browser. Export a backup file before switching computers or clearing browser data.')}</p>
            <div className="flex flex-wrap gap-2">
              <Button onClick={backupExport}>⬇ {t('Export my data (JSON)')}</Button>
              <input type="file" accept="application/json" className="hidden" id="b-in" onChange={(e) => backupImport(e.target.files && e.target.files[0])} />
              <Button variant="outline" onClick={() => (document.getElementById('b-in') as HTMLInputElement)?.click()}>⬆ {t('Import backup')}</Button>
              <Button variant="outline" onClick={restoreAllDeleted}>♻️ {t('Restore all deleted base items')}</Button>
              <Button variant="destructive" onClick={resetAll}>🗑 {t('Reset ALL my changes')}</Button>
            </div>
            <p className="text-xs text-muted-foreground">{backupStats()}</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
