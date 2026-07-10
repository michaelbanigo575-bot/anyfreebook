'use client';

import { useState, useEffect, useCallback } from 'react';

interface ReaderPrefs {
  font: 'serif' | 'sans' | 'mono';
  size: number;        // px, 14–24
  lineHeight: number;  // 1.4–2.2
  theme: 'default' | 'light' | 'sepia' | 'dark';
  width: 'narrow' | 'normal' | 'wide';
}

const DEFAULTS: ReaderPrefs = { font: 'serif', size: 18, lineHeight: 1.8, theme: 'default', width: 'normal' };
const KEY = 'afb_reader_prefs';

const THEMES: Record<ReaderPrefs['theme'], { bg: string; text: string; muted: string; label: string; swatch: string }> = {
  default: { bg: 'transparent', text: '', muted: '', label: 'Site', swatch: 'linear-gradient(135deg,#6366f1,#10b981)' },
  light:   { bg: '#ffffff', text: '#1a1a1a', muted: '#555555', label: 'Light', swatch: '#ffffff' },
  sepia:   { bg: '#f4ecd8', text: '#433422', muted: '#6b5d4b', label: 'Sepia', swatch: '#f4ecd8' },
  dark:    { bg: '#121212', text: '#e6e6e6', muted: '#a3a3a3', label: 'Dark', swatch: '#121212' },
};

const FONTS: Record<ReaderPrefs['font'], { css: string; label: string }> = {
  serif: { css: 'Georgia, "Times New Roman", serif', label: 'Serif' },
  sans:  { css: 'system-ui, -apple-system, "Segoe UI", sans-serif', label: 'Sans' },
  mono:  { css: '"Courier New", Consolas, monospace', label: 'Mono' },
};

const WIDTHS: Record<ReaderPrefs['width'], string> = { narrow: '34rem', normal: '44rem', wide: '58rem' };

export function ReaderSurface({ children }: { children: React.ReactNode }) {
  const [prefs, setPrefs] = useState<ReaderPrefs>(DEFAULTS);
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved) setPrefs({ ...DEFAULTS, ...JSON.parse(saved) });
    } catch {}
    setLoaded(true);
  }, []);

  const update = useCallback(<K extends keyof ReaderPrefs>(k: K, v: ReaderPrefs[K]) => {
    setPrefs(p => {
      const next = { ...p, [k]: v };
      try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  const t = THEMES[prefs.theme];
  const custom = prefs.theme !== 'default';

  const surfaceStyle: React.CSSProperties = {
    fontFamily: FONTS[prefs.font].css,
    fontSize: `${prefs.size}px`,
    lineHeight: prefs.lineHeight,
    maxWidth: WIDTHS[prefs.width],
    margin: '0 auto',
    transition: 'background-color .25s, color .25s',
    ...(custom ? {
      backgroundColor: t.bg,
      color: t.text,
      borderRadius: '1rem',
      padding: '1.5rem 1.75rem',
      ['--text' as string]: t.text,
      ['--text-secondary' as string]: t.text,
      ['--text-muted' as string]: t.muted,
    } : {}),
  };

  return (
    <div className="relative">
      {/* Aa trigger */}
      <div className="sticky top-20 z-30 flex justify-end -mb-10 pointer-events-none">
        <button
          onClick={() => setOpen(o => !o)}
          aria-label="Reading settings"
          className="pointer-events-auto w-11 h-11 rounded-full bg-[var(--surface)] border border-[var(--border)] shadow-lg flex items-center justify-center text-[var(--text)] font-serif font-bold hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors"
        >
          Aa
        </button>
      </div>

      {/* Settings panel */}
      {open && (
        <div className="sticky top-32 z-30 flex justify-end -mb-4">
          <div className="w-72 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-2xl p-4 space-y-4">
            {/* Theme */}
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2">Theme</div>
              <div className="flex gap-2">
                {(Object.keys(THEMES) as ReaderPrefs['theme'][]).map(k => (
                  <button
                    key={k}
                    onClick={() => update('theme', k)}
                    className={`flex-1 rounded-xl border-2 py-1.5 text-[11px] font-semibold transition-all ${prefs.theme === k ? 'border-[var(--primary)] text-[var(--primary)]' : 'border-[var(--border)] text-[var(--text-muted)]'}`}
                  >
                    <span className="block w-5 h-5 rounded-full mx-auto mb-1 border border-black/10" style={{ background: THEMES[k].swatch }} />
                    {THEMES[k].label}
                  </button>
                ))}
              </div>
            </div>

            {/* Font */}
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2">Font</div>
              <div className="flex gap-2">
                {(Object.keys(FONTS) as ReaderPrefs['font'][]).map(k => (
                  <button
                    key={k}
                    onClick={() => update('font', k)}
                    style={{ fontFamily: FONTS[k].css }}
                    className={`flex-1 rounded-xl border-2 py-2 text-sm transition-all ${prefs.font === k ? 'border-[var(--primary)] text-[var(--primary)]' : 'border-[var(--border)] text-[var(--text-secondary)]'}`}
                  >
                    {FONTS[k].label}
                  </button>
                ))}
              </div>
            </div>

            {/* Size */}
            <div>
              <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-1">
                <span>Text size</span><span className="font-mono">{prefs.size}px</span>
              </div>
              <input type="range" min={14} max={24} step={1} value={prefs.size}
                onChange={e => update('size', +e.target.value)}
                className="w-full accent-[var(--primary)]" />
            </div>

            {/* Line spacing */}
            <div>
              <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-1">
                <span>Line spacing</span><span className="font-mono">{prefs.lineHeight.toFixed(1)}</span>
              </div>
              <input type="range" min={1.4} max={2.2} step={0.1} value={prefs.lineHeight}
                onChange={e => update('lineHeight', +e.target.value)}
                className="w-full accent-[var(--primary)]" />
            </div>

            {/* Width */}
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2">Page width</div>
              <div className="flex gap-2">
                {(['narrow', 'normal', 'wide'] as const).map(k => (
                  <button
                    key={k}
                    onClick={() => update('width', k)}
                    className={`flex-1 rounded-xl border-2 py-1.5 text-[11px] font-semibold capitalize transition-all ${prefs.width === k ? 'border-[var(--primary)] text-[var(--primary)]' : 'border-[var(--border)] text-[var(--text-muted)]'}`}
                  >
                    {k}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => { setPrefs(DEFAULTS); try { localStorage.setItem(KEY, JSON.stringify(DEFAULTS)); } catch {} }}
              className="w-full py-1.5 rounded-lg text-[11px] font-semibold text-[var(--text-muted)] hover:text-[var(--text)] border border-[var(--border)] transition-colors"
            >
              Reset to defaults
            </button>
          </div>
        </div>
      )}

      {/* Themed reading surface */}
      <div style={loaded ? surfaceStyle : undefined}>
        {children}
      </div>
    </div>
  );
}
