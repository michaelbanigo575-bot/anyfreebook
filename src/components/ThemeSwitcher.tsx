'use client';

import { useState } from 'react';
import { THEMES } from '@/lib/themes';
import { useTheme } from './ThemeProvider';

export function ThemeSwitcher() {
  const { currentTheme, setTheme, customGradient, setCustomGradient, isCustom } = useTheme();
  const [showCustom, setShowCustom] = useState(false);
  const [customForm, setCustomForm] = useState({
    bgFrom: '#1a0533',
    bgVia: '',
    bgTo: '#0a1628',
    bgAngle: 135,
    text: '#f1f5f9',
    accent: '#c084fc',
    surface: '#1e1b4b',
  });

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-[var(--text)]">Theme</h3>

      {/* Built-in themes */}
      <div className="grid grid-cols-5 gap-2">
        {THEMES.map(theme => (
          <button
            key={theme.id}
            onClick={() => { setTheme(theme.id); setShowCustom(false); }}
            className={`
              flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all
              ${currentTheme.id === theme.id && !isCustom
                ? 'border-[var(--primary)] shadow-md'
                : 'border-[var(--border-subtle)] hover:border-[var(--border)]'
              }
            `}
          >
            <div
              className="w-8 h-8 rounded-lg border border-black/10 shadow-sm"
              style={{ background: theme.colors.bg }}
            >
              <div
                className="w-3 h-3 rounded-full mt-2.5 ml-2.5"
                style={{ background: theme.colors.primary }}
              />
            </div>
            <span className="text-[10px] font-medium text-[var(--text-secondary)]">
              {theme.icon} {theme.name}
            </span>
          </button>
        ))}
      </div>

      {/* Custom gradient toggle */}
      <button
        onClick={() => setShowCustom(!showCustom)}
        className={`
          w-full flex items-center justify-between p-3 rounded-xl border-2 transition-all
          ${isCustom
            ? 'border-[var(--primary)] shadow-md'
            : 'border-[var(--border-subtle)] hover:border-[var(--border)]'
          }
        `}
      >
        <span className="text-sm font-medium text-[var(--text)]">
          🎨 Custom gradient
        </span>
        <svg
          className={`w-4 h-4 text-[var(--text-muted)] transition-transform ${showCustom ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/>
        </svg>
      </button>

      {/* Custom gradient builder */}
      {showCustom && (
        <div className="space-y-3 p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
          <div className="grid grid-cols-2 gap-3">
            <ColorInput label="Background from" value={customForm.bgFrom} onChange={v => setCustomForm(f => ({ ...f, bgFrom: v }))} />
            <ColorInput label="Background to" value={customForm.bgTo} onChange={v => setCustomForm(f => ({ ...f, bgTo: v }))} />
            <ColorInput label="Via color (optional)" value={customForm.bgVia} onChange={v => setCustomForm(f => ({ ...f, bgVia: v }))} />
            <ColorInput label="Surface / cards" value={customForm.surface} onChange={v => setCustomForm(f => ({ ...f, surface: v }))} />
            <ColorInput label="Text color" value={customForm.text} onChange={v => setCustomForm(f => ({ ...f, text: v }))} />
            <ColorInput label="Accent color" value={customForm.accent} onChange={v => setCustomForm(f => ({ ...f, accent: v }))} />
          </div>

          <div>
            <label className="text-xs text-[var(--text-muted)] mb-1 block">
              Angle: {customForm.bgAngle}°
            </label>
            <input
              type="range"
              min="0"
              max="360"
              value={customForm.bgAngle}
              onChange={e => setCustomForm(f => ({ ...f, bgAngle: parseInt(e.target.value) }))}
              className="w-full accent-[var(--primary)]"
            />
          </div>

          {/* Preview */}
          <div
            className="h-20 rounded-lg border border-black/10 flex items-center justify-center"
            style={{
              background: customForm.bgVia
                ? `linear-gradient(${customForm.bgAngle}deg, ${customForm.bgFrom}, ${customForm.bgVia}, ${customForm.bgTo})`
                : `linear-gradient(${customForm.bgAngle}deg, ${customForm.bgFrom}, ${customForm.bgTo})`,
            }}
          >
            <span style={{ color: customForm.text }} className="text-sm font-medium">
              Preview text
            </span>
          </div>

          <button
            onClick={() => setCustomGradient({
              bgFrom: customForm.bgFrom,
              bgVia: customForm.bgVia || undefined,
              bgTo: customForm.bgTo,
              bgAngle: customForm.bgAngle,
              text: customForm.text,
              accent: customForm.accent,
              surface: customForm.surface,
            })}
            className="w-full py-2 rounded-lg bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)] text-white text-sm font-semibold"
          >
            Apply custom theme
          </button>
        </div>
      )}
    </div>
  );
}

function ColorInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-[10px] text-[var(--text-muted)] mb-1 block">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value || '#000000'}
          onChange={e => onChange(e.target.value)}
          className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent"
        />
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="#000000"
          className="flex-1 text-xs px-2 py-1.5 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] outline-none focus:ring-1 focus:ring-[var(--primary)]"
        />
      </div>
    </div>
  );
}
