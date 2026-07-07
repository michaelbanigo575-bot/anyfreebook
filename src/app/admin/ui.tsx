import React from 'react';

/** Frosted-glass card with subtle border. Default panel of the admin UI. */
export function Panel({ children, className = '', title, action }: { children: React.ReactNode; className?: string; title?: string; action?: React.ReactNode }) {
  return (
    <section className={`rounded-2xl bg-slate-900/40 border border-slate-800/70 backdrop-blur ${className}`}>
      {title && (
        <header className="flex items-center justify-between px-5 py-3 border-b border-slate-800/70">
          <h2 className="text-sm font-semibold text-white">{title}</h2>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

/** Colored status pill (ok/warn/error/neutral). */
export function StatusPill({ status, label }: { status: 'ok' | 'warn' | 'error' | 'neutral'; label: string }) {
  const styles = {
    ok: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
    warn: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
    error: 'bg-rose-500/10 text-rose-300 border-rose-500/20',
    neutral: 'bg-slate-500/10 text-slate-300 border-slate-500/20',
  }[status];
  const dot = { ok: 'bg-emerald-400', warn: 'bg-amber-400', error: 'bg-rose-400', neutral: 'bg-slate-400' }[status];
  return (
    <span className={`inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${styles}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  );
}

/** Large metric tile. */
export function Stat({ label, value, sub, tone = 'default', icon }: { label: string; value: React.ReactNode; sub?: React.ReactNode; tone?: 'default' | 'good' | 'warn' | 'bad'; icon?: React.ReactNode }) {
  const toneColor = { default: 'text-white', good: 'text-emerald-300', warn: 'text-amber-300', bad: 'text-rose-300' }[tone];
  return (
    <Panel className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-widest text-slate-500 font-medium">{label}</div>
          <div className={`mt-1 text-2xl font-bold font-mono ${toneColor}`}>{value}</div>
          {sub && <div className="mt-1 text-xs text-slate-400">{sub}</div>}
        </div>
        {icon && <div className="text-slate-500 flex-shrink-0">{icon}</div>}
      </div>
    </Panel>
  );
}

/** Simple SVG sparkline. */
export function Sparkline({ values, color = '#818cf8', height = 40 }: { values: number[]; color?: string; height?: number }) {
  if (values.length < 2) return <div style={{ height }} className="w-full" />;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const w = 200;
  const step = w / (values.length - 1);
  const points = values.map((v, i) => `${i * step},${height - ((v - min) / range) * (height - 4) - 2}`).join(' ');
  const area = `M0,${height} L${points.split(' ').join(' L')} L${w},${height} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="w-full" preserveAspectRatio="none" style={{ height }}>
      <path d={area} fill={color} opacity="0.15" />
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Distance from now, in short form. */
export function relTime(iso: string | number | null | undefined): string {
  if (!iso) return '—';
  const t = typeof iso === 'string' ? Date.parse(iso) : iso;
  if (!t || Number.isNaN(t)) return '—';
  const diff = Date.now() - t;
  const abs = Math.abs(diff);
  const past = diff >= 0;
  const min = Math.round(abs / 60000);
  if (min < 1) return past ? 'just now' : 'soon';
  if (min < 60) return `${min}m ${past ? 'ago' : 'from now'}`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ${past ? 'ago' : 'from now'}`;
  const d = Math.round(hr / 24);
  if (d < 30) return `${d}d ${past ? 'ago' : 'from now'}`;
  const mo = Math.round(d / 30);
  return `${mo}mo ${past ? 'ago' : 'from now'}`;
}
