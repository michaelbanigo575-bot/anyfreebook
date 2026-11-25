import { isPublicHttpsUrl } from '@/lib/safeUrl';

/**
 * Turns whatever a creator uploaded into something the study aids can read.
 * PDFs are handed to the model as they are (it reads scanned pages too). Word, PowerPoint and
 * EPUB files are zip archives of XML, so their text is pulled out here. Plain text is used as is.
 */
export type FileSource =
  | { kind: 'text'; text: string }
  | { kind: 'pdf'; bytes: Uint8Array }
  | { kind: 'unsupported' | 'too-large' | 'unreachable' };

const MAX_FILE = 40 * 1024 * 1024;
const MAX_UNZIPPED = 30 * 1024 * 1024; // guards against a tiny file that expands enormously

async function download(url: string): Promise<Uint8Array | 'too-large' | null> {
  let target = url;
  // Redirects are followed by hand so every hop is checked
  for (let hop = 0; hop < 5; hop++) {
    if (!isPublicHttpsUrl(target)) return null;
    const res = await fetch(target, { redirect: 'manual', signal: AbortSignal.timeout(25000) });
    const location = res.headers.get('location');
    if (res.status >= 300 && res.status < 400 && location) { target = new URL(location, target).toString(); continue; }
    if (!res.ok || !res.body) return null;
    if (Number(res.headers.get('content-length') || 0) > MAX_FILE) return 'too-large';
    const reader = res.body.getReader();
    const parts: Uint8Array[] = [];
    let size = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > MAX_FILE) { await reader.cancel(); return 'too-large'; }
      parts.push(value);
    }
    const out = new Uint8Array(size);
    let at = 0;
    for (const p of parts) { out.set(p, at); at += p.length; }
    return out;
  }
  return null;
}

interface ZipEntry { name: string; method: number; size: number; offset: number }

function zipEntries(bytes: Uint8Array): ZipEntry[] {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let end = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65558); i--) {
    if (view.getUint32(i, true) === 0x06054b50) { end = i; break; }
  }
  if (end < 0) return [];
  const count = view.getUint16(end + 10, true);
  let at = view.getUint32(end + 16, true);
  const decoder = new TextDecoder();
  const entries: ZipEntry[] = [];
  for (let n = 0; n < count && at + 46 <= bytes.length; n++) {
    if (view.getUint32(at, true) !== 0x02014b50) break;
    const nameLength = view.getUint16(at + 28, true);
    entries.push({
      name: decoder.decode(bytes.subarray(at + 46, at + 46 + nameLength)),
      method: view.getUint16(at + 10, true),
      size: view.getUint32(at + 20, true),
      offset: view.getUint32(at + 42, true),
    });
    at += 46 + nameLength + view.getUint16(at + 30, true) + view.getUint16(at + 32, true);
  }
  return entries;
}

async function unzip(bytes: Uint8Array, entry: ZipEntry, budget: number): Promise<string> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const start = entry.offset + 30 + view.getUint16(entry.offset + 26, true) + view.getUint16(entry.offset + 28, true);
  const data = bytes.slice(start, start + entry.size);
  if (entry.method === 0) return new TextDecoder().decode(data.subarray(0, budget));
  if (entry.method !== 8) return '';
  const reader = new Blob([data as BlobPart]).stream().pipeThrough(new DecompressionStream('deflate-raw')).getReader();
  const decoder = new TextDecoder();
  let text = '';
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > budget) { await reader.cancel(); break; }
    text += decoder.decode(value, { stream: true });
  }
  return text;
}

export function markupToText(markup: string): string {
  return markup
    .replace(/<(script|style|head)\b[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<\/(w:p|a:p|p|div|h[1-6]|li|tr|blockquote|section)>|<br\s*\/?>|<w:br\/>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;|&#39;/g, "'")
    .replace(/&#(\d+);/g, (_m, d) => String.fromCodePoint(Math.min(Number(d), 0x10ffff)))
    .replace(/&amp;/g, '&')
    .replace(/[ \t]+/g, ' ').replace(/ *\n */g, '\n').replace(/\n{3,}/g, '\n\n')
    .trim();
}

const byNumber = (a: ZipEntry, b: ZipEntry) => a.name.localeCompare(b.name, undefined, { numeric: true });

async function archiveText(bytes: Uint8Array): Promise<string | null> {
  const entries = zipEntries(bytes);
  const word = entries.filter(e => e.name === 'word/document.xml');
  const slides = entries.filter(e => /^ppt\/slides\/slide\d+\.xml$/.test(e.name)).sort(byNumber);
  let pages = word.length ? word : slides;

  if (!pages.length) {
    // EPUB: follow the reading order listed in the package file
    const opf = entries.find(e => e.name.endsWith('.opf'));
    const html = entries.filter(e => /\.x?html?$/i.test(e.name));
    if (opf) {
      const xml = await unzip(bytes, opf, MAX_UNZIPPED);
      const base = opf.name.includes('/') ? opf.name.slice(0, opf.name.lastIndexOf('/') + 1) : '';
      const hrefs = new Map<string, string>();
      for (const item of xml.match(/<item\b[^>]*>/g) || []) {
        const id = item.match(/\bid="([^"]+)"/)?.[1];
        const href = item.match(/\bhref="([^"]+)"/)?.[1];
        if (id && href) hrefs.set(id, base + decodeURIComponent(href));
      }
      pages = Array.from(xml.matchAll(/<itemref\b[^>]*\bidref="([^"]+)"/g))
        .map(m => html.find(e => e.name === hrefs.get(m[1])))
        .filter((e): e is ZipEntry => !!e);
    }
    if (!pages.length) pages = html.sort(byNumber);
  }
  if (!pages.length) return null;

  let budget = MAX_UNZIPPED;
  const out: string[] = [];
  for (const page of pages.slice(0, 500)) {
    if (budget <= 0) break;
    const xml = await unzip(bytes, page, budget);
    budget -= xml.length;
    out.push(markupToText(xml));
  }
  return out.join('\n\n').trim() || null;
}

export async function readBookFile(url: string): Promise<FileSource> {
  let bytes: Uint8Array | 'too-large' | null;
  try { bytes = await download(url); } catch { return { kind: 'unreachable' }; }
  if (bytes === 'too-large') return { kind: 'too-large' };
  if (!bytes) return { kind: 'unreachable' };

  const magic = String.fromCharCode(...Array.from(bytes.subarray(0, 4)));
  if (magic === '%PDF') return { kind: 'pdf', bytes };
  try {
    if (magic.startsWith('PK')) {
      const text = await archiveText(bytes);
      return text ? { kind: 'text', text } : { kind: 'unsupported' };
    }
  } catch {
    return { kind: 'unsupported' };
  }
  const text = new TextDecoder().decode(bytes);
  // Audio, images and old .doc files are binary: they show up as control characters
  if ((text.slice(0, 4000).match(/[\u0000-\u0008\u000E-\u001F�]/g) || []).length > 20) return { kind: 'unsupported' };
  return { kind: 'text', text: /<(html|body|p|div)\b/i.test(text.slice(0, 3000)) ? markupToText(text) : text.trim() };
}

/** Very long books are sampled evenly from start to end, so the aids cover the whole work. */
export function fitToModel(text: string, limit = 350_000): string {
  if (text.length <= limit) return text;
  const parts = 20;
  const size = Math.floor(limit / parts);
  const step = (text.length - size) / (parts - 1);
  return Array.from({ length: parts }, (_, i) => text.slice(Math.round(i * step), Math.round(i * step) + size)).join('\n\n[…]\n\n');
}
