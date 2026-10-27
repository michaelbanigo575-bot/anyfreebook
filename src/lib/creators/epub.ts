/**
 * Writes a minimal, valid EPUB 3 file.
 *
 * An EPUB is a ZIP archive with a fixed layout. There is no zip library in
 * this project's dependencies, so the archive is written here directly: the
 * local file headers, the central directory and the end-of-central-directory
 * record, with the CRC-32 of each entry computed from Node's zlib.
 *
 * EPUB 3 requires the `mimetype` entry to be the first one in the archive
 * and STORED (not compressed), so that a reader can identify the file from
 * its first bytes without unzipping it.
 */
import { deflateRawSync, crc32 } from 'node:zlib';

interface ZipEntry {
  name: string;
  data: Buffer;
  /** The mimetype entry must be stored uncompressed. */
  store?: boolean;
}

const SIG_LOCAL = 0x04034b50;
const SIG_CENTRAL = 0x02014b50;
const SIG_END = 0x06054b50;
const METHOD_STORE = 0;
const METHOD_DEFLATE = 8;

/** MS-DOS date/time. A fixed timestamp keeps the output byte-stable. */
const DOS_TIME = 0;
const DOS_DATE = 0x21; // 1 Jan 1980

interface BuiltEntry {
  /** The local file header, without the file data. */
  header: Buffer;
  /** The (possibly compressed) file data that follows the header. */
  data: Buffer;
  nameBuf: Buffer;
  method: number;
  crc: number;
  uncompressedSize: number;
}

function buildEntry(entry: ZipEntry): BuiltEntry {
  const nameBuf = Buffer.from(entry.name, 'utf8');
  const crc = crc32(entry.data) >>> 0;
  const compressed = entry.store ? entry.data : deflateRawSync(entry.data);
  const method = entry.store ? METHOD_STORE : METHOD_DEFLATE;

  const header = Buffer.alloc(30 + nameBuf.length);
  header.writeUInt32LE(SIG_LOCAL, 0);
  header.writeUInt16LE(20, 4); // version needed
  header.writeUInt16LE(0, 6); // flags
  header.writeUInt16LE(method, 8);
  header.writeUInt16LE(DOS_TIME, 10);
  header.writeUInt16LE(DOS_DATE, 12);
  header.writeUInt32LE(crc, 14);
  header.writeUInt32LE(compressed.length, 18);
  header.writeUInt32LE(entry.data.length, 22);
  header.writeUInt16LE(nameBuf.length, 26);
  header.writeUInt16LE(0, 28); // extra length
  nameBuf.copy(header, 30);

  return {
    header,
    data: compressed,
    nameBuf,
    method,
    crc,
    uncompressedSize: entry.data.length,
  };
}

export function buildZip(entries: ZipEntry[]): Buffer {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;

  for (const entry of entries) {
    const built = buildEntry(entry);
    // The central directory records where THIS entry's local header starts,
    // which is the offset before this entry is appended.
    const entryOffset = offset;
    const central = Buffer.alloc(46 + built.nameBuf.length);
    central.writeUInt32LE(SIG_CENTRAL, 0);
    central.writeUInt16LE(20, 4); // version made by
    central.writeUInt16LE(20, 6); // version needed
    central.writeUInt16LE(0, 8); // flags
    central.writeUInt16LE(built.method, 10);
    central.writeUInt16LE(DOS_TIME, 12);
    central.writeUInt16LE(DOS_DATE, 14);
    central.writeUInt32LE(built.crc, 16);
    central.writeUInt32LE(built.data.length, 20);
    central.writeUInt32LE(built.uncompressedSize, 24);
    central.writeUInt16LE(built.nameBuf.length, 28);
    central.writeUInt16LE(0, 30); // extra
    central.writeUInt16LE(0, 32); // comment
    central.writeUInt16LE(0, 34); // disk number
    central.writeUInt16LE(0, 36); // internal attrs
    central.writeUInt32LE(0, 38); // external attrs
    central.writeUInt32LE(entryOffset, 42);
    built.nameBuf.copy(central, 46);

    // The local file header is followed by the file data.
    locals.push(built.header, built.data);
    centrals.push(central);
    offset += built.header.length + built.data.length;
  }

  const centralBuf = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(SIG_END, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralBuf.length, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);

  return Buffer.concat([...locals, centralBuf, end]);
}

export interface EpubChapter {
  title: string;
  /** XHTML for the chapter body. */
  html: string;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Build an EPUB 3 file from a title, an author and one or more chapters.
 *
 * The XHTML is deliberately simple: a body of paragraphs and headings, with
 * the structure the reader expects.
 */
export function buildEpub(opts: {
  title: string;
  author: string;
  description?: string | null;
  chapters: EpubChapter[];
  identifier: string;
  language?: string;
}): Buffer {
  const lang = opts.language || 'en';
  const uuid = `urn:uuid:${opts.identifier}`;

  const entries: ZipEntry[] = [
    // Must be first, and stored uncompressed.
    { name: 'mimetype', data: Buffer.from('application/epub+zip', 'ascii'), store: true },
    {
      name: 'META-INF/container.xml',
      data: Buffer.from(
        `<?xml version="1.0" encoding="UTF-8"?>\n<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">\n  <rootfiles>\n    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>\n  </rootfiles>\n</container>\n`,
        'utf8'
      ),
    },
  ];

  const manifest: string[] = [];
  const spine: string[] = [];
  const navItems: string[] = [];

  opts.chapters.forEach((chapter, i) => {
    const file = `chapter${i + 1}.xhtml`;
    const id = `chapter${i + 1}`;
    manifest.push(`    <item id="${id}" href="${file}" media-type="application/xhtml+xml"/>`);
    spine.push(`    <itemref idref="${id}"/>`);
    navItems.push(`        <li><a href="${file}">${escapeXml(chapter.title)}</a></li>`);

    const xhtml = `<?xml version="1.0" encoding="utf-8"?>\n<!DOCTYPE html>\n<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="${lang}" xml:lang="${lang}">\n<head>\n  <title>${escapeXml(chapter.title)}</title>\n  <link rel="stylesheet" type="text/css" href="style.css"/>\n</head>\n<body>\n${chapter.html}\n</body>\n</html>\n`;
    entries.push({ name: `OEBPS/${file}`, data: Buffer.from(xhtml, 'utf8') });
  });

  const nav = `<?xml version="1.0" encoding="utf-8"?>\n<!DOCTYPE html>\n<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="${lang}" xml:lang="${lang}">\n<head>\n  <title>${escapeXml(opts.title)}</title>\n</head>\n<body>\n  <nav epub:type="toc" id="toc">\n    <h1>Contents</h1>\n    <ol>\n${navItems.join('\n')}\n    </ol>\n  </nav>\n</body>\n</html>\n`;
  entries.push({ name: 'OEBPS/nav.xhtml', data: Buffer.from(nav, 'utf8') });
  manifest.push('    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>');
  spine.unshift('    <itemref idref="nav"/>');

  const css = `body { font-family: serif; line-height: 1.5; margin: 1em; }\nh1, h2, h3 { line-height: 1.25; }\n`;
  entries.push({ name: 'OEBPS/style.css', data: Buffer.from(css, 'utf8') });
  manifest.push('    <item id="css" href="style.css" media-type="text/css"/>');

  const now = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
  const opf = `<?xml version="1.0" encoding="utf-8"?>\n<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="bookid">\n  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">\n    <dc:identifier id="bookid">${escapeXml(uuid)}</dc:identifier>\n    <dc:title>${escapeXml(opts.title)}</dc:title>\n    <dc:creator>${escapeXml(opts.author)}</dc:creator>\n    <dc:language>${lang}</dc:language>\n    <dc:publisher>ANYFREEBOOK</dc:publisher>\n    <meta property="dcterms:modified">${now}</meta>\n${opts.description ? `    <dc:description>${escapeXml(opts.description)}</dc:description>\n` : ''}  </metadata>\n  <manifest>\n${manifest.join('\n')}\n  </manifest>\n  <spine>\n${spine.join('\n')}\n  </spine>\n</package>\n`;
  entries.push({ name: 'OEBPS/content.opf', data: Buffer.from(opf, 'utf8') });

  return buildZip(entries);
}
