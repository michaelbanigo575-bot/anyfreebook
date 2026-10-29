#!/usr/bin/env node
/**
 * Publish the five back-to-school guides as books on ANYFREEBOOK.
 *
 * Each guide becomes a publication: a cover image, the full text as the body
 * and as chapters, and the PDF as the attached file, so a reader can read it
 * on the site, download the PDF, or take the EPUB or plain text.
 *
 *   node scripts/guides/publish-guides.mjs [--dry-run]
 *
 * The service role key is used because this is an operator action, not
 * something a visitor can do. Nothing is printed except what happened.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');
const GUIDES_DIR = path.join(ROOT, 'content', 'guides');
const PDF_DIR = path.join(ROOT, 'public', 'guides');
const COVER_DIR = 'D:\\Android\\tmp\\covers';

/** The account the guides are published under. */
const AUTHOR_ID = '0db28789-d172-427e-9ceb-ff1be7980409';

const dryRun = process.argv.includes('--dry-run');

function env() {
  const raw = fs.readFileSync(path.join(ROOT, '.env.local'), 'utf8');
  const out = {};
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!m) continue;
    out[m[1]] = m[2].trim().replace(/^"(.*)"$/, '$1');
  }
  return out;
}

const ENV = env();
const SUPABASE = ENV.NEXT_PUBLIC_SUPABASE_URL;
const KEY = ENV.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE || !KEY) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const headers = {
  apikey: KEY,
  Authorization: `Bearer ${KEY}`,
  'Content-Type': 'application/json',
};

/** Upload a file to the public `publications` bucket and return its URL. */
async function upload(storagePath, filePath, contentType) {
  const body = fs.readFileSync(filePath);
  const response = await fetch(
    `${SUPABASE}/storage/v1/object/publications/${storagePath}`,
    {
      method: 'POST',
      headers: {
        apikey: KEY,
        Authorization: `Bearer ${KEY}`,
        'Content-Type': contentType,
        'x-upsert': 'true',
      },
      body,
    }
  );
  if (!response.ok) {
    throw new Error(`upload failed (${response.status}): ${await response.text()}`);
  }
  return `${SUPABASE}/storage/v1/object/public/publications/${storagePath}`;
}

/** Insert a row through PostgREST and return it. */
async function insert(table, row) {
  const response = await fetch(`${SUPABASE}/rest/v1/${table}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(row),
    Prefer: 'return=representation',
  });
  if (!response.ok) {
    throw new Error(`insert into ${table} failed (${response.status}): ${await response.text()}`);
  }
  const text = await response.text();
  if (!text) {
    // PostgREST sometimes answers with an empty body; ask for the row back.
    const filter = table === 'publications' ? `slug=eq.${row.slug}` : `publication_id=eq.${row.publication_id}`;
    const back = await fetch(`${SUPABASE}/rest/v1/${table}?${filter}&limit=1`, { headers });
    const rows = await back.json();
    if (!rows || rows.length === 0) {
      throw new Error(`insert into ${table} returned nothing and the row could not be read back`);
    }
    return rows[0];
  }
  const rows = JSON.parse(text);
  return Array.isArray(rows) ? rows[0] : rows;
}

async function deleteWhere(table, query) {
  await fetch(`${SUPABASE}/rest/v1/${table}?${query}`, {
    method: 'DELETE',
    headers,
  });
}

/** Split the guide's markdown into its sections. */
function sectionsOf(bodyMd) {
  const parts = [];
  const pattern = /^##\s+(.+)$/gm;
  const matches = [...bodyMd.matchAll(pattern)];
  for (let i = 0; i < matches.length; i++) {
    const title = matches[i][1].trim();
    const start = matches[i].index + matches[i][0].length;
    const end = i + 1 < matches.length ? matches[i + 1].index : bodyMd.length;
    parts.push({ title, markdown: bodyMd.slice(start, end).trim() });
  }
  return parts;
}

/**
 * The body of a guide is HTML: the site renders it as a document.
 * The renderer already wrote it next to the PDF.
 */
function bodyHtml(slug) {
  const file = path.join(PDF_DIR, `${slug}.body.html`);
  if (fs.existsSync(file)) return fs.readFileSync(file, 'utf8');
  return null;
}

/** A short, plain-text version of a section, for the chapter body. */
function sectionHtml(markdown) {
  // The chapter bodies are HTML fragments. A tiny converter is enough here:
  // headings, paragraphs, lists and tables.
  const escape = (s) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const inline = (s) =>
    escape(s)
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>')
      .replace(/`([^`]+)`/g, '<code>$1</code>');

  const lines = markdown.split('\n');
  const out = [];
  let inList = false;
  let inTable = false;

  const closeList = () => {
    if (inList) {
      out.push('</ul>');
      inList = false;
    }
  };
  const closeTable = () => {
    if (inTable) {
      out.push('</tbody></table>');
      inTable = false;
    }
  };

  for (const line of lines) {
    const t = line.trim();
    if (!t) {
      closeList();
      continue;
    }
    if (t.startsWith('|')) {
      const cells = t
        .replace(/^\||\|$/g, '')
        .split('|')
        .map((c) => c.trim());
      if (/^[-: ]+$/.test(cells.join(''))) continue;
      if (!inTable) {
        closeList();
        out.push('<table><thead><tr>');
        out.push(cells.map((c) => `<th>${inline(c)}</th>`).join(''));
        out.push('</tr></thead><tbody>');
        inTable = true;
        continue;
      }
      out.push(`<tr>${cells.map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`);
      continue;
    }
    closeTable();

    if (t.startsWith('### ')) {
      closeList();
      out.push(`<h3>${inline(t.slice(4))}</h3>`);
    } else if (t.startsWith('## ')) {
      closeList();
      out.push(`<h2>${inline(t.slice(3))}</h2>`);
    } else if (t.startsWith('> ')) {
      closeList();
      out.push(`<blockquote><p>${inline(t.slice(2))}</p></blockquote>`);
    } else if (/^[-*+]\s+/.test(t)) {
      if (!inList) {
        out.push('<ul>');
        inList = true;
      }
      out.push(`<li>${inline(t.replace(/^[-*+]\s+/, ''))}</li>`);
    } else if (/^\d+\.\s+/.test(t)) {
      if (!inList) {
        out.push('<ul>');
        inList = true;
      }
      out.push(`<li>${inline(t.replace(/^\d+\.\s+/, ''))}</li>`);
    } else {
      closeList();
      out.push(`<p>${inline(t)}</p>`);
    }
  }
  closeList();
  closeTable();
  return out.join('\n');
}

const specs = fs
  .readdirSync(GUIDES_DIR)
  .filter((f) => f.endsWith('.json') && f !== 'renderer-test.json')
  .map((f) => JSON.parse(fs.readFileSync(path.join(GUIDES_DIR, f), 'utf8')));

for (const spec of specs) {
  const slug = spec.slug;
  const cover = path.join(COVER_DIR, `${slug}-cover.png`);
  const pdf = path.join(PDF_DIR, `${slug}.pdf`);
  if (!fs.existsSync(cover) || !fs.existsSync(pdf)) {
    console.log(`skip ${slug}: cover or PDF missing`);
    continue;
  }

  const html = bodyHtml(slug);
  const sections = sectionsOf(spec.body_md);

  // The description is what a search engine reads, so it carries the words
  // somebody would actually type, not just a summary.
  const topics = (spec.keywords || []).slice(0, 6).join(', ');
  const description = `${spec.description} A free PDF guide for ${spec.audience.toLowerCase()}, ${
    sections.length
  } chapters on ${topics}. Free to download, print and share, published by ANYFREEBOOK.`;

  if (dryRun) {
    console.log(`${slug}: ${sections.length} chapters, description ${description.length} chars`);
    continue;
  }

  // Replace any previous run so this is idempotent.
  await deleteWhere('chapters', `publication_id=eq.${AUTHOR_ID}`);
  await deleteWhere('publications', `slug=eq.${slug}`);

  const coverUrl = await upload(
    `${AUTHOR_ID}/guides/${slug}-cover.png`,
    cover,
    'image/png'
  );
  const pdfUrl = await upload(`${AUTHOR_ID}/guides/${slug}.pdf`, pdf, 'application/pdf');

  const row = await insert('publications', {
    author_id: AUTHOR_ID,
    title: spec.title,
    slug,
    subtitle: spec.subtitle,
    description,
    cover_url: coverUrl,
    category: 'Education',
    content_type: 'guide',
    body: html,
    external_url: pdfUrl,
    status: 'published',
    published_at: new Date().toISOString(),
  });

  let position = 1;
  for (const section of sections) {
    await insert('chapters', {
      publication_id: row.id,
      title: section.title,
      position,
      body: sectionHtml(section.markdown),
      status: 'published',
      published_at: new Date().toISOString(),
    });
    position += 1;
  }

  console.log(
    `published ${slug}: ${sections.length} chapters, cover ${coverUrl.split('/').pop()}, pdf ${pdfUrl.split('/').pop()}`
  );
}

if (!dryRun) {
  console.log('\nDone. The guides are now books on ANYFREEBOOK.');
}
