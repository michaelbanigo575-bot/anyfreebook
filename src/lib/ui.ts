/**
 * Canonical class recipes for cards and primary buttons — one place to change
 * border/radius/hover treatment instead of re-inventing it per page. Wires the
 * theme's --radius-lg/--shadow-md variables (defined in globals.css, previously unused).
 */

export function cardClass(opts: { hover?: boolean; padding?: string } = {}): string {
  const { hover = true, padding = 'p-5' } = opts;
  const base = `${padding} rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface)] transition-all duration-200`;
  const hoverClass = hover ? ' hover:border-[var(--primary)] hover:shadow-[var(--shadow-md)] hover:-translate-y-0.5' : '';
  return base + hoverClass;
}

export function primaryButtonClass(size: 'sm' | 'md' = 'md'): string {
  const padding = size === 'sm' ? 'px-4 py-2 text-sm' : 'px-5 py-2.5 text-sm';
  return `${padding} rounded-[var(--radius-lg)] bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)] text-white font-semibold hover:shadow-[var(--shadow-md)] transition-all`;
}
