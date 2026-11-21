'use client';

/* Cardboard — port of board.html: a task board backed by the prefs store
   (cloud-synced like the original): add tasks with an optional due date,
   finish, edit, delete; sections for Today / Overdue / Upcoming / Someday /
   Finished. */
import * as React from 'react';
import { pref, notify, subscribe } from '@/lib/store';
import { useJL as useJLLevel } from '@/lib/jl';
import { PageHead } from '@/components/page-head';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useT, useToast } from '@/components/providers';

interface Task { id: string; text: string; due?: string; done?: boolean; doneAt?: string }

const today = () => new Date().toISOString().slice(0, 10);

function loadTasks(): Task[] {
  return (pref('tasks') || []) as Task[];
}
function saveTasks(ts: Task[]) {
  pref('tasks', ts);
}

export default function BoardPage() {
  useJLLevel();
  const { t } = useT();
  const toast = useToast();
  const [mounted, setMounted] = React.useState(false);
  const [text, setText] = React.useState('');
  const [due, setDue] = React.useState('');
  const [editing, setEditing] = React.useState<string | null>(null);
  const [editText, setEditText] = React.useState('');
  const [editDue, setEditDue] = React.useState('');
  const [, force] = React.useState(0);
  const rerender = () => force((v) => v + 1);

  React.useEffect(() => { setMounted(true); }, []);
  React.useEffect(() => subscribe(() => force((v) => v + 1)) as any, []);

  if (!mounted) return null;
  const tasks = loadTasks();
  const active = tasks.filter((x) => !x.done);
  const finished = tasks.filter((x) => x.done);
  const td = today();
  const groups = [
    { key: 'overdue', label: 'Overdue', items: active.filter((x) => x.due && x.due < td) },
    { key: 'today', label: 'Today', items: active.filter((x) => !x.due || x.due === td) },
    { key: 'upcoming', label: 'Upcoming', items: active.filter((x) => x.due && x.due > td) },
    { key: 'someday', label: 'Someday', items: [] },
  ];

  const add = () => {
    if (!text.trim()) { toast('Type a task first.', 'warn'); return; }
    saveTasks(loadTasks().concat([{ id: 't' + Date.now() + Math.random().toString(36).slice(2, 5), text: text.trim(), due: due || undefined }]));
    setText(''); setDue('');
    toast('Task pinned 📌', 'ok');
    notify();
  };
  const finish = (id: string) => {
    saveTasks(loadTasks().map((x) => (x.id === id ? { ...x, done: true, doneAt: today() } : x)));
    notify();
  };
  const unfinish = (id: string) => {
    saveTasks(loadTasks().map((x) => (x.id === id ? { ...x, done: false, doneAt: undefined } : x)));
    notify();
  };
  const del = (id: string) => {
    saveTasks(loadTasks().filter((x) => x.id !== id));
    notify();
  };
  const startEdit = (x: Task) => { setEditing(x.id); setEditText(x.text); setEditDue(x.due || ''); };
  const saveEdit = () => {
    if (!editing) return;
    saveTasks(loadTasks().map((x) => (x.id === editing ? { ...x, text: editText.trim() || x.text, due: editDue || undefined } : x)));
    setEditing(null);
    toast('Task updated ✏️', 'ok');
    notify();
  };

  return (
    <div>
      <PageHead icon="📌" title="Cardboard" subtitle={t('Pin tasks to plan, finish them, and look back on what you did.')} />
      <div className="mb-6 flex flex-wrap items-center gap-2 rounded-xl border bg-card p-3 shadow-sm">
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder={t('What needs doing?')} className="flex-1" onKeyDown={(e) => { if (e.key === 'Enter') add(); }} />
        <input type="date" value={due} onChange={(e) => setDue(e.target.value)} className="h-9 rounded-md border border-input bg-transparent px-3 text-sm" />
        <Button onClick={add}>{t('Add / Edit')}</Button>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {groups.map((g) => (
          <div key={g.key} className="rounded-xl border bg-card p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {t(g.label)} ({g.items.length})
            </h2>
            {!g.items.length ? <p className="text-sm text-muted-foreground">{t('No tasks yet — pin your first one!')}</p> : null}
            <div className="space-y-2">
              {g.items.map((x) => (
                <div key={x.id} className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2">
                  {editing === x.id ? (
                    <>
                      <Input value={editText} onChange={(e) => setEditText(e.target.value)} className="h-8 flex-1" />
                      <input type="date" value={editDue} onChange={(e) => setEditDue(e.target.value)} className="h-8 rounded-md border border-input bg-transparent px-2 text-sm" />
                      <Button size="sm" onClick={saveEdit}>✓</Button>
                    </>
                  ) : (
                    <>
                      <button type="button" title={t('Finish')} onClick={() => finish(x.id)} className="text-lg">⬜</button>
                      <span className="flex-1 text-sm">{x.text}</span>
                      {x.due ? <span className="text-xs text-muted-foreground">{x.due}</span> : null}
                      <button type="button" title={t('Edit')} onClick={() => startEdit(x)} className="rounded px-1 hover:bg-accent">✏️</button>
                      <button type="button" title={t('Delete')} onClick={() => del(x.id)} className="rounded px-1 hover:bg-accent">🗑</button>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
        <div className="rounded-xl border bg-card p-4 shadow-sm md:col-span-2">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">{t('Finished')} ({finished.length})</h2>
          {!finished.length ? <p className="text-sm text-muted-foreground">{t('Nothing finished yet.')}</p> : null}
          <div className="space-y-2">
            {finished.map((x) => (
              <div key={x.id} className="flex items-center gap-2 rounded-lg border bg-muted/20 px-3 py-2">
                <button type="button" title={t('Undo')} onClick={() => unfinish(x.id)} className="text-lg">✅</button>
                <span className="flex-1 text-sm line-through opacity-70">{x.text}</span>
                {x.doneAt ? <span className="text-xs text-muted-foreground">{x.doneAt}</span> : null}
                <button type="button" title={t('Delete')} onClick={() => del(x.id)} className="rounded px-1 hover:bg-accent">🗑</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
