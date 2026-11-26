/**
 * localStorage / sessionStorage that never throws. Browsers block storage in private windows,
 * some in-app browsers and with strict privacy settings; an unguarded call inside an effect
 * then crashes the whole page. Every call here degrades to "not remembered".
 */
type Kind = 'local' | 'session';

function store(kind: Kind): Storage | null {
  try { return kind === 'local' ? window.localStorage : window.sessionStorage; } catch { return null; }
}

export function storageGet(key: string, kind: Kind = 'local'): string | null {
  try { return store(kind)?.getItem(key) ?? null; } catch { return null; }
}

export function storageSet(key: string, value: string, kind: Kind = 'local'): void {
  try { store(kind)?.setItem(key, value); } catch { /* not remembered */ }
}
