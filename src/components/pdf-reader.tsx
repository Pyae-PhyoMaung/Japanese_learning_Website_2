'use client';

/* Full-page PDF reader for the Library and Files popups. The original site
   rendered PDFs with pdf.js from a CDN; this port used the browser's native
   viewer in an iframe, which made the current page invisible to the app, so
   "remember my last page" was impossible. This component brings pdf.js back:
   pages rendered fit-to-width on canvases, prev/next + page-jump + zoom
   controls, arrow-key navigation, and the last page per book saved to
   localStorage ('jlw2_pdfpos:<bookKey>') so reopening resumes where the
   reader left off. Two reading modes (remembered in 'jlw2_pdfmode'):
   - single: one page at a time (fast, book-like)
   - cont:   all pages in one scrollable column — read continuously like a
             website; the current page follows the scroll, controls jump to
             pages, and canvases render lazily so big books stay smooth.
   The CDN script is injected once on first use. */
import * as React from 'react';
import { Button } from '@/components/ui/button';
import { useT } from '@/components/providers';

const PDFJS_URL = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
const WORKER_URL = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
const ZOOMS = [0.6, 0.8, 1, 1.25, 1.5, 2, 2.5];
const MODE_KEY = 'jlw2_pdfmode';

type Mode = 'single' | 'cont';

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

function zoomOf(zoomIx: number) {
  return ZOOMS[Math.max(0, Math.min(ZOOMS.length - 1, zoomIx))];
}

/* One page in the continuous column — its canvas is painted only while the
   page is near the viewport, so a 500-page book doesn't render at once. */
function ContPage({ doc, n, width, zoomIx, fitTick, ratio }: { doc: any; n: number; width: number; zoomIx: number; fitTick: number; ratio: number }) {
  const [near, setNear] = React.useState(n <= 2);
  const boxRef = React.useRef<HTMLDivElement | null>(null);
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const renderSeq = React.useRef(0);

  React.useEffect(() => {
    const el = boxRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') { setNear(true); return; }
    const io = new IntersectionObserver(
      (es) => { es.forEach((e) => setNear(e.isIntersecting)); },
      { rootMargin: '700px 0px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [n]);

  React.useEffect(() => {
    if (!near) return;
    const canvas = canvasRef.current;
    if (!doc || !canvas) return;
    const seq = ++renderSeq.current;
    (async () => {
      try {
        const p = await doc.getPage(n);
        if (seq !== renderSeq.current) return;
        const fit = Math.max(280, (width || 800) - 12);
        const base = p.getViewport({ scale: 1 });
        const scale = (fit / base.width) * zoomOf(zoomIx);
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
    })();
    return () => { renderSeq.current++; };
  }, [near, n, width, zoomIx, fitTick, doc]);

  return (
    <div ref={boxRef} data-page={n} className="mx-auto mb-3 w-fit" style={{ minHeight: width ? Math.round((width - 12) * (ratio || 1.4)) + 8 : 200 }}>
      <canvas ref={canvasRef} className="mx-auto block bg-white shadow" style={{ display: near ? 'block' : 'none' }} />
    </div>
  );
}

export function PdfReader({ url, bookKey, name }: { url: string; bookKey: string; name: string }) {
  const { t } = useT();
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const scrollRef = React.useRef<HTMLDivElement | null>(null);
  const docRef = React.useRef<any>(null);
  const renderSeq = React.useRef(0);
  const pageRef = React.useRef(1);
  const jumpRef = React.useRef(0);
  const [pages, setPages] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [zoomIx, setZoomIx] = React.useState(2); /* 1 = fit to width */
  const [mode, setMode] = React.useState<Mode>('single');
  const [ratio, setRatio] = React.useState(0);
  const [width, setWidth] = React.useState(0);
  const [status, setStatus] = React.useState<'loading' | 'ready' | 'error'>('loading');
  const [err, setErr] = React.useState('');
  const [fitTick, setFitTick] = React.useState(0);
  const posKey = 'jlw2_pdfpos:' + bookKey;

  React.useEffect(() => { pageRef.current = page; }, [page]);

  const setModeAndSave = (m: Mode) => {
    jumpRef.current = pageRef.current; /* land on the page you were reading */
    setMode(m);
    try { localStorage.setItem(MODE_KEY, m); } catch (e) {}
  };

  /* jump to a page (controls) — the scroll tracker never uses this, so the
     continuous column only scrolls for explicit navigation */
  const gotoPage = (n: number) => {
    const v = Math.max(1, Math.min(pages || 1, n));
    jumpRef.current = v;
    setPage(v);
  };

  /* open the document and resume the saved page + reading mode */
  React.useEffect(() => {
    let dead = false;
    let m0: Mode = 'single';
    try { const sm = localStorage.getItem(MODE_KEY); if (sm === 'cont' || sm === 'single') m0 = sm; } catch (e) {}
    setMode(m0);
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
        try {
          const p1 = await doc.getPage(1);
          const b = p1.getViewport({ scale: 1 });
          if (!dead) setRatio(b.height / b.width);
        } catch (e) {}
        let start = 1;
        try {
          const saved = parseInt(localStorage.getItem(posKey) || '', 10);
          if (saved >= 1 && saved <= doc.numPages) start = saved;
        } catch (e) {}
        jumpRef.current = start;
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

  /* single-page mode: render the current page, fit to width × zoom level */
  React.useEffect(() => {
    if (status !== 'ready' || mode !== 'single') return;
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
        const scale = (fit / base.width) * zoomOf(zoomIx);
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
  }, [status, mode, page, zoomIx, fitTick]);

  /* continuous mode: measure the column width and follow the scroll */
  React.useEffect(() => {
    if (status !== 'ready' || mode !== 'cont') return;
    const c = scrollRef.current;
    if (c) setWidth(c.clientWidth || 800);
  }, [status, mode, fitTick]);

  React.useEffect(() => {
    if (status !== 'ready' || mode !== 'cont') return;
    const c = scrollRef.current;
    if (!c) return;
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const cr = c.getBoundingClientRect();
        const mid = cr.top + c.clientHeight / 2;
        let best = 0;
        let bestD = Infinity;
        c.querySelectorAll<HTMLElement>('[data-page]').forEach((el) => {
          const r = el.getBoundingClientRect();
          const d = Math.abs(r.top + r.height / 2 - mid);
          if (d < bestD) { bestD = d; best = Number(el.dataset && el.dataset.page) || 0; }
        });
        if (best && best !== pageRef.current) setPage(best);
      });
    };
    c.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => { c.removeEventListener('scroll', onScroll); if (raf) cancelAnimationFrame(raf); };
  }, [status, mode, pages]);

  /* continuous mode: scroll the column to the requested page */
  React.useEffect(() => {
    if (status !== 'ready' || mode !== 'cont') return;
    if (!jumpRef.current || jumpRef.current !== page) return;
    const c = scrollRef.current;
    const el = c && c.querySelector<HTMLElement>('[data-page="' + page + '"]');
    if (c && el) {
      const top = c.scrollTop + (el.getBoundingClientRect().top - c.getBoundingClientRect().top) - 8;
      c.scrollTo({ top: Math.max(0, top) });
    }
    jumpRef.current = 0;
  }, [page, mode, status]);

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
        gotoPage(pageRef.current - 1);
      } else if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        e.preventDefault();
        gotoPage(pageRef.current + 1);
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, pages]);

  if (status === 'error') {
    return <div className="flex flex-1 items-center justify-center p-8 text-center text-sm text-muted-foreground">{err}</div>;
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <div className="mb-2 flex flex-wrap items-center justify-center gap-2 text-sm">
        <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => gotoPage(page - 1)}>‹ {t('← Prev')}</Button>
        <span className="flex items-center gap-1">
          <span>{t('Page')}</span>
          <input
            type="number"
            min={1}
            max={pages || 1}
            value={page}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              if (v >= 1 && v <= pages) gotoPage(v);
            }}
            className="w-14 rounded-md border bg-background px-1 py-0.5 text-center"
          />
          <span>{t('of')} {pages}</span>
        </span>
        <Button size="sm" variant="outline" disabled={page >= pages} onClick={() => gotoPage(page + 1)}>{t('Next →')} ›</Button>
        <span className="ml-1 flex items-center gap-1">
          <Button size="sm" variant="ghost" disabled={zoomIx <= 0} onClick={() => setZoomIx((z) => Math.max(0, z - 1))}>{t('➖ Zoom out')}</Button>
          <Button size="sm" variant="ghost" disabled={zoomIx >= ZOOMS.length - 1} onClick={() => setZoomIx((z) => Math.min(ZOOMS.length - 1, z + 1))}>{t('➕ Zoom in')}</Button>
        </span>
        <span className="ml-1 flex items-center gap-1">
          <Button size="sm" variant={mode === 'single' ? 'secondary' : 'ghost'} title={t('Single page')} onClick={() => setModeAndSave('single')}>📄</Button>
          <Button size="sm" variant={mode === 'cont' ? 'secondary' : 'ghost'} title={t('Continuous scroll')} onClick={() => setModeAndSave('cont')}>📜</Button>
        </span>
      </div>
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-auto rounded-lg border bg-muted/40 p-2">
        {status === 'loading' ? (
          <div className="p-10 text-center text-sm text-muted-foreground">{t('Loading…')} {name}</div>
        ) : mode === 'single' ? (
          <canvas ref={canvasRef} className="mx-auto block bg-white shadow" />
        ) : (
          Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
            <ContPage key={n} doc={docRef.current} n={n} width={width} zoomIx={zoomIx} fitTick={fitTick} ratio={ratio} />
          ))
        )}
      </div>
    </div>
  );
}
