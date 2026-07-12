'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * The ANYFREEBOOK Reader — our own branded document viewer, used everywhere
 * a document appears on the site (publications, class materials, uploads).
 *
 * PDFs render through PDF.js on a canvas with our controls: page turns,
 * zoom, fullscreen, download. Images get a zoomable view. Site pages embed
 * directly; anything else falls back to an iframe so nothing ever dead-ends.
 */

type Mode = 'pdf' | 'image' | 'embed' | 'text';

interface Props {
  url: string;
  title?: string;
  height?: string; // CSS height for the stage, default 65vh
  mode?: Mode;     // optional override (e.g. force 'text' for a Gutenberg .txt)
}

function detectMode(url: string): Mode {
  if (/\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(url)) return 'image';
  if (/\.pdf(\?|$)/i.test(url) || url.includes('supabase.co/storage')) return 'pdf';
  if (/\.(txt|text)(\?|$)/i.test(url)) return 'text';
  return 'embed';
}

/** External http(s) files must be fetched same-origin (CORS) — route them through our book proxy. */
function isExternal(url: string): boolean {
  return /^https?:\/\//i.test(url) && !url.includes('supabase.co/storage');
}
export function proxied(url: string): string {
  return isExternal(url) ? `/api/book-proxy?url=${encodeURIComponent(url)}` : url;
}

export function DocumentReader({ url, title, height = '65vh', mode: modeOverride }: Props) {
  const mode = modeOverride || detectMode(url);
  const [pdfFailed, setPdfFailed] = useState(false);

  if (mode === 'image') return <ImageStage url={url} title={title} height={height} />;
  if (mode === 'text') return <TextStage url={url} title={title} height={height} />;
  if (mode === 'pdf' && !pdfFailed) return <PdfStage url={url} title={title} height={height} onFail={() => setPdfFailed(true)} />;

  // Site-relative pages and unsupported formats: plain embed, Office docs via Google's viewer
  const src = pdfFailed
    ? proxied(url) // a PDF PDF.js couldn't parse — let the browser's native viewer try, same-origin
    : url.startsWith('/')
      ? url
      : /\.(docx?|pptx?|xlsx?)(\?|$)/i.test(url)
        ? `https://docs.google.com/gview?url=${encodeURIComponent(url)}&embedded=true`
        : url;
  return (
    <div className="rounded-2xl overflow-hidden border border-[var(--border-subtle)] bg-[var(--surface)]">
      <ReaderBar title={title} url={url} />
      <iframe src={src} title={title || 'Document'} className="w-full bg-white" style={{ height }} />
    </div>
  );
}

/* ---------- shared branded top bar ---------- */

function ReaderBar({ title, url, children }: { title?: string; url: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)]">
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-sm">📖</span>
        <span className="text-[11px] font-bold text-[var(--text)] whitespace-nowrap">ANYFREEBOOK Reader</span>
        {title && <span className="text-[11px] text-[var(--text-muted)] truncate">· {title}</span>}
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {children}
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          download
          className="px-2 py-1 rounded-md text-[11px] font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
          title="Download / open original"
        >
          ⬇
        </a>
      </div>
    </div>
  );
}

/* ---------- image viewer ---------- */

function ImageStage({ url, title, height }: { url: string; title?: string; height: string }) {
  const [zoomed, setZoomed] = useState(false);
  return (
    <div className="rounded-2xl overflow-hidden border border-[var(--border-subtle)] bg-[var(--surface)]">
      <ReaderBar title={title} url={url}>
        <button
          onClick={() => setZoomed(z => !z)}
          className="px-2 py-1 rounded-md text-[11px] font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
        >
          {zoomed ? '🔍−' : '🔍+'}
        </button>
      </ReaderBar>
      <div className="overflow-auto bg-[var(--bg-secondary)]" style={{ maxHeight: height }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={title || 'Document'}
          onClick={() => setZoomed(z => !z)}
          className={`cursor-zoom-in transition-all ${zoomed ? 'w-[160%] max-w-none cursor-zoom-out' : 'w-full object-contain'}`}
        />
      </div>
    </div>
  );
}

/* ---------- plain-text viewer (Gutenberg .txt etc.) ---------- */

/** Trim Project Gutenberg's license boilerplate to the actual work. */
function cleanGutenbergText(raw: string): string {
  let t = raw.replace(/\r\n/g, '\n');
  const start = t.match(/\*\*\*\s*START OF (THE|THIS) PROJECT GUTENBERG.*?\*\*\*/is);
  if (start) t = t.slice((start.index || 0) + start[0].length);
  const end = t.match(/\*\*\*\s*END OF (THE|THIS) PROJECT GUTENBERG.*?\*\*\*/is);
  if (end) t = t.slice(0, end.index);
  return t.trim();
}

function TextStage({ url, title, height }: { url: string; title?: string; height: string }) {
  const [text, setText] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [fontSize, setFontSize] = useState(18);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(proxied(url));
        if (!res.ok) throw new Error(String(res.status));
        const raw = await res.text();
        if (!cancelled) setText(cleanGutenbergText(raw));
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => { cancelled = true; };
  }, [url]);

  const btn = 'px-2 py-1 rounded-md text-[11px] font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]';

  if (failed) {
    return (
      <div className="rounded-2xl overflow-hidden border border-[var(--border-subtle)] bg-[var(--surface)]">
        <ReaderBar title={title} url={url} />
        <iframe src={proxied(url)} title={title || 'Document'} className="w-full bg-white" style={{ height }} />
      </div>
    );
  }

  return (
    <div className="rounded-2xl overflow-hidden border border-[var(--border-subtle)] bg-[var(--surface)] flex flex-col">
      <ReaderBar title={title} url={url}>
        <button onClick={() => setFontSize(s => Math.max(13, s - 1))} className={btn} title="Smaller text">A−</button>
        <button onClick={() => setFontSize(s => Math.min(28, s + 1))} className={btn} title="Larger text">A+</button>
      </ReaderBar>
      <div className="overflow-auto bg-[var(--bg-secondary)]" style={{ height }}>
        {text === null ? (
          <div className="flex flex-col items-center justify-center gap-3 text-[var(--text-muted)] text-sm h-full">
            <span className="w-8 h-8 rounded-full border-2 border-[var(--border)] border-t-[var(--primary)] animate-spin" />
            Opening in the ANYFREEBOOK Reader…
          </div>
        ) : (
          <article
            className="mx-auto max-w-2xl px-6 py-8 whitespace-pre-wrap font-serif text-[var(--text)] leading-relaxed"
            style={{ fontSize, lineHeight: 1.7 }}
          >
            {text}
          </article>
        )}
      </div>
    </div>
  );
}

/* ---------- PDF viewer (PDF.js) ---------- */

interface PdfDoc {
  numPages: number;
  getPage: (n: number) => Promise<{
    getViewport: (o: { scale: number }) => { width: number; height: number };
    render: (o: { canvasContext: CanvasRenderingContext2D; viewport: { width: number; height: number } }) => { promise: Promise<void> };
  }>;
}

function PdfStage({ url, title, height, onFail }: { url: string; title?: string; height: string; onFail: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const docRef = useRef<PdfDoc | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [page, setPage] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [loading, setLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Load the document once
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const pdfjs = await import('pdfjs-dist');
        // Served from /public — bundling the worker trips Terser on import.meta
        pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
        const doc = await pdfjs.getDocument({ url: proxied(url) }).promise;
        if (cancelled) return;
        docRef.current = doc as unknown as PdfDoc;
        setNumPages(doc.numPages);
        setLoading(false);
      } catch {
        if (!cancelled) onFail(); // CORS or corrupt file → iframe fallback
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  // Render the current page whenever page/zoom changes
  const renderPage = useCallback(async () => {
    const doc = docRef.current;
    const canvas = canvasRef.current;
    const stage = stageRef.current;
    if (!doc || !canvas || !stage) return;
    const pdfPage = await doc.getPage(page);
    const base = pdfPage.getViewport({ scale: 1 });
    const fitScale = (stage.clientWidth - 24) / base.width; // fit width with padding
    const scale = fitScale * zoom;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const viewport = pdfPage.getViewport({ scale: scale * dpr });
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    canvas.style.width = `${viewport.width / dpr}px`;
    canvas.style.height = `${viewport.height / dpr}px`;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    await pdfPage.render({ canvasContext: ctx, viewport }).promise;
  }, [page, zoom]);

  useEffect(() => {
    if (!loading) renderPage();
  }, [loading, renderPage]);

  useEffect(() => {
    const onResize = () => renderPage();
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    window.addEventListener('resize', onResize);
    document.addEventListener('fullscreenchange', onFsChange);
    return () => {
      window.removeEventListener('resize', onResize);
      document.removeEventListener('fullscreenchange', onFsChange);
    };
  }, [renderPage]);

  // Arrow-key page turns while the reader is on screen
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === 'ArrowRight') setPage(p => Math.min(numPages, p + 1));
      if (e.key === 'ArrowLeft') setPage(p => Math.max(1, p - 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [numPages]);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else containerRef.current?.requestFullscreen().catch(() => {});
  };

  const btn = 'px-2 py-1 rounded-md text-[11px] font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] disabled:opacity-40';

  return (
    <div ref={containerRef} className="rounded-2xl overflow-hidden border border-[var(--border-subtle)] bg-[var(--surface)] flex flex-col">
      <ReaderBar title={title} url={url}>
        <button onClick={() => setZoom(z => Math.max(0.5, +(z - 0.25).toFixed(2)))} className={btn} title="Zoom out">−</button>
        <span className="text-[10px] text-[var(--text-muted)] w-9 text-center">{Math.round(zoom * 100)}%</span>
        <button onClick={() => setZoom(z => Math.min(3, +(z + 0.25).toFixed(2)))} className={btn} title="Zoom in">+</button>
        <button onClick={toggleFullscreen} className={btn} title="Fullscreen">{isFullscreen ? '🗗' : '⛶'}</button>
      </ReaderBar>

      <div ref={stageRef} className="overflow-auto bg-[var(--bg-secondary)] flex-1 flex justify-center p-3" style={{ height: isFullscreen ? 'auto' : height }}>
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 text-[var(--text-muted)] text-sm">
            <span className="w-8 h-8 rounded-full border-2 border-[var(--border)] border-t-[var(--primary)] animate-spin" />
            Opening in the ANYFREEBOOK Reader…
          </div>
        ) : (
          <canvas ref={canvasRef} className="shadow-lg rounded-sm self-start" />
        )}
      </div>

      {!loading && (
        <div className="flex items-center justify-center gap-3 px-3 py-2 border-t border-[var(--border-subtle)] bg-[var(--bg-secondary)]">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className={btn}>← Prev</button>
          <span className="text-xs font-semibold text-[var(--text)]">
            Page {page} <span className="text-[var(--text-muted)] font-normal">of {numPages}</span>
          </span>
          <button onClick={() => setPage(p => Math.min(numPages, p + 1))} disabled={page >= numPages} className={btn}>Next →</button>
        </div>
      )}
    </div>
  );
}
