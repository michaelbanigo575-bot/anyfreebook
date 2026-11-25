import { storageGet, storageSet } from '@/lib/safeStorage';

/** What the reader opened recently. Kept on this device only. */
export interface ReadingItem {
  href: string;
  title: string;
  percent: number;
  at: number;
}

const KEY = 'afb-reading';

export function readingHistory(): ReadingItem[] {
  try {
    const list = JSON.parse(storageGet(KEY) || '[]');
    return Array.isArray(list)
      ? list.filter(i => i && typeof i.title === 'string' && typeof i.href === 'string' && i.href.startsWith('/') && !i.href.startsWith('//'))
      : [];
  } catch {
    return [];
  }
}

/** Progress only moves forward, so scrolling back up never loses your place. */
export function saveReading(href: string, title: string, percent: number): void {
  if (typeof window === 'undefined' || !href.startsWith('/') || !title) return;
  const list = readingHistory();
  const old = list.find(i => i.href === href);
  const item = { href, title, percent: Math.max(old?.percent || 0, Math.min(100, Math.max(0, Math.round(percent)))), at: Date.now() };
  storageSet(KEY, JSON.stringify([item, ...list.filter(i => i.href !== href)].slice(0, 30)));
}
