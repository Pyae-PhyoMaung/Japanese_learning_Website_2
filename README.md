# Japanese Learning Website 2

A full rewrite of the original Japanese Learning Website (static HTML/JS) as a
**Next.js 14 + TypeScript + Tailwind CSS + shadcn/ui** app — same data, same
Supabase cloud database, same features.

## What is the same as the original

- **Same learning data** — the base kanji / vocabulary / grammar / sentences from the original `js/data.js` (generated from the N5 Kanji Master and Minna no Nihongo N5 Myanmar PDFs), converted to typed TypeScript modules.
- **Same user data & cloud sync** — the identical `jl_user_v1` localStorage record shape, and the identical push/pull/**merge** protocol against the same Supabase `user_data` row: items accumulate by id, deletions are tombstones, nothing is ever dropped when two devices sync. Your additions/edits from the original site appear here and vice versa.
- **Same file storage** — files are cached in the `jl-files` IndexedDB and uploaded to the same `jl-files` Supabase bucket, so your uploaded images/books are shared between both sites.
- **Same prefs** — JLPT level, selected kanji/words (`sel_kanji`/`sel_vocab`), chapter renames (`uchapters`), per-kanji memory images (`kimg`), tasks, partner chat — all in the synced prefs record.
- **Same theme key** (`jl_theme`) and the same Zawgyi→Unicode protection (the vendored Google `zg2uni.js` converter + laptop-keyboard fix) so Myanmar text typed in either site stays clean Unicode.
- **Same page set** — Home, Kanji, Vocabulary, Kana, Grammar, Writing (canvas pad with guide character), Listening (listen & pick / dictation), Tests, Learn, Dictionary, Library (textbook PDFs), Files, Study Partner, Cardboard, Add/Edit.

## Adapted on purpose

- **No server TTS** — the original tried a server `/api/tts` first and fell back to the device's Japanese voice; this app is a static deployment, so it uses the browser's speech synthesis directly (the same fallback path).
- **PDF reading** — the original bundled pdf.js; this app uses the browser's built-in PDF viewer, which handles reading and page navigation the same way on modern browsers.
- **Page reload → in-place re-render** — when cloud data arrives, React re-renders the current page instead of reloading it, so in-progress forms/quiz answers are not lost.
- **The study partner** is a compact intent router (add vocab, quiz me, flashcards, counts, help) with the chat history kept in the synced prefs, like the original.

## Getting started

```bash
npm install
npm run dev      # http://localhost:3000
npm run build     # production build
```

Deploy to Vercel: import the repo, framework preset **Next.js** — no extra
configuration needed (all cloud credentials are the public browser ones the
original site already ships).

## Stack

- Next.js 14 (App Router) + React 18 + TypeScript
- Tailwind CSS + shadcn/ui-style components (Radix primitives, `class-variance-authority`, `tailwind-merge`) in `src/components/ui`
- Data & logic layer in `src/lib` (`store.ts`, `sync.ts`, `jl.ts`, `files.ts`, `tts.ts`, `zg.ts`, generated `data.ts` / `mm.ts` / `kana-data.ts`)
- Noto Sans JP + Noto Sans Myanmar fonts

## Project layout

```
src/app/            one route per original page (kanji, vocab, grammar, listening,
                    tests, edit, learn, write, dictionary, kana, board, partner,
                    files, textbook)
src/components/     nav, level bar, quiz, flashcards, writing pad, chapter grid,
                    kanji/vocab cards + detail dialogs, providers (theme/lang/toasts)
src/components/ui/  button, card, badge, input, label, textarea, dialog, tabs, select
src/lib/            store, sync, data access, files, tts, zawgyi converter glue,
                    generated base data + Myanmar UI dictionary
public/assets/      favicon + the two textbook PDFs
public/js/          zg2uni.js (the same vendored Google myanmar-tools copy)
```
