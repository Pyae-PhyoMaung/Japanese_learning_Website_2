'use client';

/* Full-page PDF reader for the Library and Files popups. The original site
   rendered PDFs with pdf.js from a CDN; this port used the browser's native
   viewer in an iframe, which made the current page invisible to the app, so
   "remember my last page" was impossible. This component brings pdf.js back:
   one page rendered fit-to-width on a canvas, prev/next + page-jump + zoom
   controls, arrow-key navigation, and the last page per book saved to
   localStorage ('jlw2_pdfpos:<bookKey>') so reopening resumes where the
   reader left off. The CDN script is injected once on first use. */
import * as React from 'react';
import { Button } from '@/components/ui/button';
import { useT } from '@/components/providers';

const PDFJS_URL = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
const WORKER_URL = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
const ZOOMS = [0.6, 0.8, 1, 1.25, 1.5, 2, 2.5];

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    pdfjsLib?: any;
  }
}

let pdfjsLoading: Promise<any> | null = null;

function loadPdfJs(): Promise<any> {
  if (typeof window === 'undefined') return Promise.reject(new Error('no window'));
  if (window.pdfjsLib) {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = WORKER_URL;
    return Promise.resolve(window.pdfjsLib);
  }
  if (pdfjsLoading) return pdfjsLoading;
  pdfjsLoading = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = PDFJS_URL;
    s.async = true;
    s.onload = () => {
      const lib = window.pdfjsLib;
      if (!lib) { pdfjsLoading = null; reject(new Error('PDF viewer did not load.')); return; }
      lib.GlobalWorkerOptions.workerSrc = WORKER_URL;
      resolve(lib);
    };
    s.onerror = () => {
      pdfjsLoading = null;
      reject(new Error('Could not load the PDF viewer. Check your internet connection.'));
    };
    document.head.appendChild(s);
  });
  return pdfjsLoading;
}

export function PdfReader({ url, bookKey, name }: { url: string; bookKey: string; name: string }) {
  const { t } = useT();
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const docRef = React.useRef<any>(null);
  const renderSeq = React.useRef(0);
  const [pages, setPages] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [zoomIx, setZoomIx] = React.useState(2); /* 1 = fit to width */
  const [status, setStatus] = React.useState<'loading' | 'ready' | 'error'>('loading');
  const [err, setErr] = React.useState('');
  const [fitTick, setFitTick] = React.useState(0);
  const posKey = 'jlw2_pdfpos:' + bookKey;

  /* open the document and resume the saved page */
  React.useEffect(() => {
    let dead = false;
    setStatus('loading');
    setErr('');
    loadPdfJs()
      .then(async (lib) => {
        const buf = await fetch(url).then((r) => {
          if (!r.ok) throw new Error('Could not load the PDF.');
          return r.arrayBuffer();
        });
        const doc = await lib.getDocument({ data: buf }).promise;
        if (dead) {
          try { doc.destroy(); } catch (e) {}
          return;
        }
        docRef.current = doc;
        setPages(doc.numPages);
        let start = 1;
        try {
          const saved = parseInt(localStorage.getItem(posKey) || '', 10);
          if (saved >= 1 && saved <= doc.numPages) start = saved;
        } catch (e) {}
        setPage(start);
        setZoomIx(2);
        setStatus('ready');
      })
      .catch((e: any) => {
        if (dead) return;
        setErr(e?.message || 'Could not load the PDF.');
        setStatus('error');
      });
    return () => {
      dead = true;
      const doc = docRef.current;
      docRef.current = null;
      try { doc && doc.destroy(); } catch (e) {}
    };
  }, [url, posKey]);

  /* render the current page, fit to width × zoom level */
  React.useEffect(() => {
    if (status !== 'ready') return;
    const doc = docRef.current;
    const canvas = canvasRef.current;
    if (!doc || !canvas) return;
    const seq = ++renderSeq.current;
    const deadSeq = () => seq !== renderSeq.current;
    const paint = async () => {
      try {
        const p = await doc.getPage(page);
        if (deadSeq()) return;
        const wrap = canvas.parentElement as HTMLElement | null;
        const fit = Math.max(280, ((wrap && wrap.clientWidth) || 800) - 12);
        const base = p.getViewport({ scale: 1 });
        const zoom = ZOOMS[Math.max(0, Math.min(ZOOMS.length - 1, zoomIx))];
        const scale = (fit / base.width) * zoom;
        const dpr = window.devicePixelRatio || 1;
        const viewport = p.getViewport({ scale: scale * dpr });
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        canvas.style.width = Math.floor(viewport.width / dpr) + 'px';
        canvas.style.height = Math.floor(viewport.height / dpr) + 'px';
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        await p.render({ canvasContext: ctx, viewport }).promise;
      } catch (e) {}
    };
    paint();
    return () => { renderSeq.current++; };
  }, [status, page, zoomIx, fitTick]);

  /* re-fit on window resize */
  React.useEffect(() => {
    if (status !== 'ready') return;
    let tm: any = null;
    const onResize = () => {
      if (tm) clearTimeout(tm);
      tm = setTimeout(() => setFitTick((n) => n + 1), 200);
    };
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); if (tm) clearTimeout(tm); };
  }, [status]);

  /* remember the page as soon as it changes (also covers closing the popup) */
  React.useEffect(() => {
    if (status !== 'ready') return;
    try { localStorage.setItem(posKey, String(page)); } catch (e) {}
  }, [status, page, posKey]);

  /* ← / → keys walk through pages */
  React.useEffect(() => {
    if (status !== 'ready') return;
    const h = (e: KeyboardEvent) => {
      const tag = ((e.target as HTMLElement) || {}).tagName || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        setPage((p) => Math.max(1, p - 1));
      } else if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        e.preventDefault();
        setPage((p) => Math.min(pages, p + 1));
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [status, pages]);

  if (status === 'error') {
    return <div className="flex flex-1 items-center justify-center p-8 text-center text-sm text-muted-foreground">{err}</div>;
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <div className="mb-2 flex flex-wrap items-center justify-center gap-2 text-sm">
        <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>‹ {t('← Prev')}</Button>
        <span className="flex items-center gap-1">
          <span>{t('Page')}</span>
          <input
            type="number"
            min={1}
            max={pages || 1}
            value={page}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              if (v >= 1 && v <= pages) setPage(v);
            }}
            className="w-14 rounded-md border bg-background px-1 py-0.5 text-center"
          />
          <span>{t('of')} {pages}</span>
        </span>
        <Button size="sm" variant="outline" disabled={page >= pages} onClick={() => setPage((p) => Math.min(pages, p + 1))}>{t('Next →')} ›</Button>
        <span className="ml-1 flex items-center gap-1">
          <Button size="sm" variant="ghost" disabled={zoomIx <= 0} onClick={() => setZoomIx((z) => Math.max(0, z - 1))}>{t('➖ Zoom out')}</Button>
          <Button size="sm" variant="ghost" disabled={zoomIx >= ZOOMS.length - 1} onClick={() => setZoomIx((z) => Math.min(ZOOMS.length - 1, z + 1))}>{t('➕ Zoom in')}</Button>
        </span>
      </div>
      <div className="min-h-0 flex-1 overflow-auto rounded-lg border bg-muted/40 p-2">
        {status === 'loading' ? (
          <div className="p-10 text-center text-sm text-muted-foreground">{t('Loading…')} {name}</div>
        ) : (
          <canvas ref={canvasRef} className="mx-auto block bg-white shadow" />
        )}
      </div>
    </div>
  );
}
