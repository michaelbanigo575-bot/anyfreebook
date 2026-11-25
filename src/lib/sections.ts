/** The app's two sections. Discover finds free books; Community is authors, readers and classes. */
export type Section = 'discover' | 'community';

const PREFIXES: Record<Section, string[]> = {
  discover: ['/explore', '/category', '/book', '/search', '/audiobooks', '/trending', '/new', '/collections', '/collection', '/guides', '/blog', '/sources', '/universities', '/waec-jamb', '/free-textbook-alternatives'],
  community: ['/feed', '/read', '/author', '/creators', '/classrooms', '/class', '/institutions'],
};

/** The section a page belongs to, or null for shared pages (library, profile, settings, help). */
export function sectionOf(pathname: string): Section | null {
  if (pathname === '/') return 'discover';
  for (const section of ['discover', 'community'] as const) {
    if (PREFIXES[section].some(p => pathname === p || pathname.startsWith(`${p}/`))) return section;
  }
  return null;
}

export const SECTION_HOME: Record<Section, string> = { discover: '/', community: '/feed' };
