'use client';

import { useState, useEffect, useCallback } from 'react';

interface ReaderSettings {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  marginWidth: number;
  pageMode: 'scroll' | 'paginated';
  keepScreenOn: boolean;
}

const FONTS = [
  { id: 'serif', name: 'Serif', family: 'Georgia, "Times New Roman", serif' },
  { id: 'sans', name: 'Sans-Serif', family: 'Inter, system-ui, sans-serif' },
  { id: 'mono', name: 'Monospace', family: '"JetBrains Mono", "Fira Code", monospace' },
  { id: 'georgia', name: 'Georgia', family: 'Georgia, serif' },
  { id: 'palatino', name: 'Palatino', family: '"Palatino Linotype", "Book Antiqua", Palatino, serif' },
  { id: 'dyslexic', name: 'OpenDyslexic', family: '"OpenDyslexic", "Comic Sans MS", sans-serif' },
];

const DEFAULT_SETTINGS: ReaderSettings = {
  fontFamily: 'serif',
  fontSize: 18,
  lineHeight: 1.8,
  marginWidth: 40,
  pageMode: 'scroll',
  keepScreenOn: false,
};

function loadReaderSettings(): ReaderSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem('anyfreebook-reader') || '{}') };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function saveReaderSettings(s: ReaderSettings) {
  localStorage.setItem('anyfreebook-reader', JSON.stringify(s));
}

interface SelectionPopupProps {
  x: number;
  y: number;
  text: string;
  onClose: () => void;
}

function SelectionPopup({ x, y, text, onClose }: SelectionPopupProps) {
  const [definition, setDefinition] = useState<string | null>(null);

  const handleDefine = async () => {
    try {
      const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(text.trim().split(/\s+/)[0])}`);
      const data = await res.json();
      setDefinition(data[0]?.meanings?.[0]?.definitions?.[0]?.definition || 'No definition found.');
    } catch {
      setDefinition('Could not fetch definition.');
    }
  };

  return (
    <div
      className="fixed z-50 bg-[var(--surface)] rounded-xl shadow-xl border border-[var(--border)] overflow-hidden animate-scale-in"
      style={{ left: Math.min(x, window.innerWidth - 280), top: y - 50 }}
    >
      {definition ? (
        <div className="p-3 max-w-[260px]">
          <p className="text-xs font-semibold text-[var(--text)] mb-1">{text.trim().split(/\s+/)[0]}</p>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{definition}</p>
          <button onClick={onClose} className="mt-2 text-xs text-[var(--primary)]">Close</button>
        </div>
      ) : (
        <div className="flex">
          {[
            { label: 'Copy', action: () => { navigator.clipboard.writeText(text); onClose(); } },
            { label: 'Define', action: handleDefine },
            { label: 'Read', action: () => { window.speechSynthesis.speak(new SpeechSynthesisUtterance(text)); onClose(); } },
          ].map(btn => (
            <button
              key={btn.label}
              onClick={btn.action}
              className="px-3 py-2 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)] transition-colors border-r border-[var(--border-subtle)] last:border-0"
            >
              {btn.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface BookReaderProps {
  title: string;
  content: string;
  bookId: string;
}

export function BookReader({ title, content, bookId }: BookReaderProps) {
  const [settings, setSettings] = useState<ReaderSettings>(DEFAULT_SETTINGS);
  const [showSettings, setShowSettings] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selection, setSelection] = useState<{ x: number; y: number; text: string } | null>(null);

  useEffect(() => {
    setSettings(loadReaderSettings());
  }, []);

  const updateSetting = <K extends keyof ReaderSettings>(key: K, value: ReaderSettings[K]) => {
    setSettings(prev => {
      const next = { ...prev, [key]: value };
      saveReaderSettings(next);
      return next;
    });
  };

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const pct = el.scrollTop / (el.scrollHeight - el.clientHeight);
    setProgress(Math.round(pct * 100));
  }, []);

  const handleTextSelect = useCallback(() => {
    const sel = window.getSelection();
    if (sel && sel.toString().trim().length > 0) {
      const range = sel.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      setSelection({ x: rect.left + rect.width / 2 - 60, y: rect.top, text: sel.toString() });
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setShowSettings(false); setSelection(null); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const font = FONTS.find(f => f.id === settings.fontFamily) || FONTS[0];

  return (
    <div className="fixed inset-0 z-50 bg-[var(--bg)] flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 h-12 border-b border-[var(--border-subtle)] glass flex-shrink-0">
        <button onClick={() => window.history.back()} className="p-2 text-[var(--text-muted)] hover:text-[var(--text)]">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="m15 18-6-6 6-6"/></svg>
        </button>
        <p className="text-sm font-medium text-[var(--text)] line-clamp-1 max-w-[60%] text-center">{title}</p>
        <button onClick={() => setShowSettings(!showSettings)} className="p-2 text-[var(--text-muted)] hover:text-[var(--text)]">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="4" x2="4" y1="21" y2="14"/><line x1="4" x2="4" y1="10" y2="3"/><line x1="12" x2="12" y1="21" y2="12"/><line x1="12" x2="12" y1="8" y2="3"/><line x1="20" x2="20" y1="21" y2="16"/><line x1="20" x2="20" y1="12" y2="3"/>
          </svg>
        </button>
      </div>

      {/* Settings panel */}
      {showSettings && (
        <div className="absolute top-12 right-0 w-72 bg-[var(--surface)] border border-[var(--border)] rounded-bl-xl shadow-xl z-50 p-4 space-y-4 animate-slide-down">
          <div>
            <label className="text-xs text-[var(--text-muted)] mb-1.5 block">Font</label>
            <div className="grid grid-cols-3 gap-1">
              {FONTS.map(f => (
                <button
                  key={f.id}
                  onClick={() => updateSetting('fontFamily', f.id)}
                  className={`px-2 py-1.5 rounded-lg text-[10px] font-medium transition-colors ${
                    settings.fontFamily === f.id
                      ? 'bg-[var(--primary)] text-white'
                      : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]'
                  }`}
                >
                  {f.name}
                </button>
              ))}
            </div>
          </div>

          <SliderSetting label="Font size" value={settings.fontSize} min={12} max={32} unit="px"
            onChange={v => updateSetting('fontSize', v)} />
          <SliderSetting label="Line height" value={settings.lineHeight} min={1.2} max={2.4} step={0.1}
            onChange={v => updateSetting('lineHeight', v)} />
          <SliderSetting label="Margins" value={settings.marginWidth} min={8} max={80} unit="px"
            onChange={v => updateSetting('marginWidth', v)} />

          <div className="flex items-center justify-between">
            <span className="text-xs text-[var(--text-secondary)]">Page mode</span>
            <button
              onClick={() => updateSetting('pageMode', settings.pageMode === 'scroll' ? 'paginated' : 'scroll')}
              className="px-3 py-1 rounded-lg text-xs font-medium bg-[var(--bg-secondary)] text-[var(--text-secondary)]"
            >
              {settings.pageMode === 'scroll' ? 'Scroll' : 'Paginated'}
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      <div
        className="flex-1 overflow-y-auto"
        onScroll={handleScroll}
        onMouseUp={handleTextSelect}
        onTouchEnd={handleTextSelect}
      >
        <div
          className="mx-auto max-w-3xl py-8 select-text"
          style={{
            fontFamily: font.family,
            fontSize: settings.fontSize,
            lineHeight: settings.lineHeight,
            paddingLeft: settings.marginWidth,
            paddingRight: settings.marginWidth,
            color: 'var(--text)',
          }}
        >
          <div className="whitespace-pre-wrap leading-relaxed" dangerouslySetInnerHTML={{ __html: content }} />
        </div>
      </div>

      {/* Selection popup */}
      {selection && (
        <SelectionPopup
          x={selection.x}
          y={selection.y}
          text={selection.text}
          onClose={() => setSelection(null)}
        />
      )}

      {/* Bottom progress bar */}
      <div className="flex items-center gap-3 px-4 h-10 border-t border-[var(--border-subtle)] flex-shrink-0">
        <div className="flex-1 h-1 rounded-full bg-[var(--bg-secondary)]">
          <div className="h-full rounded-full bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)] transition-all" style={{ width: `${progress}%` }} />
        </div>
        <span className="text-xs font-mono text-[var(--text-muted)] w-10 text-right">{progress}%</span>
      </div>
    </div>
  );
}

function SliderSetting({ label, value, min, max, step, unit, onChange }: {
  label: string; value: number; min: number; max: number; step?: number; unit?: string;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-xs text-[var(--text-muted)]">{label}</label>
        <span className="text-xs font-mono text-[var(--text-secondary)]">
          {Number.isInteger(value) ? value : value.toFixed(1)}{unit || ''}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step || 1}
        value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        className="w-full accent-[var(--primary)]"
      />
    </div>
  );
}
