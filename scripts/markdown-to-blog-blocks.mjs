import fs from 'node:fs';
import path from 'node:path';

/**
 * Converts a markdown draft into the on-site blog block format.
 *
 * The site renders a small set of block types, so a markdown post has to be
 * lowered into them: headings, paragraphs, bullet lists and code blocks.
 * Inline emphasis is dropped, because the block renderer does not parse it
 * and the markers would show up as literal asterisks.
 */

const ROOT = 'D:/ANYFREEBOOK';

/** Strips inline markdown the site renderer does not understand. */
function plain(text) {
  return text
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1$2')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 ($2)')
    .trim();
}

export function markdownToBlocks(markdown) {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const blocks = [];
  let paragraph = [];
  let list = [];

  const flushParagraph = () => {
    if (paragraph.length) {
      blocks.push({ type: 'p', text: plain(paragraph.join(' ')) });
      paragraph = [];
    }
  };
  const flushList = () => {
    if (list.length) {
      blocks.push({ type: 'ul', items: list.map(plain) });
      list = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Fenced code block
    if (line.startsWith('```')) {
      flushParagraph();
      flushList();
      const lang = line.slice(3).trim();
      const code = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        code.push(lines[i]);
        i++;
      }
      blocks.push({ type: 'code', lang, code: code.join('\n') });
      continue;
    }

    // Heading
    if (line.startsWith('## ')) {
      flushParagraph();
      flushList();
      blocks.push({ type: 'h2', text: plain(line.slice(3)) });
      continue;
    }
    if (line.startsWith('# ')) {
      flushParagraph();
      flushList();
      continue; // the H1 is the post title
    }

    // Bullet list
    if (/^\s*[-*]\s+/.test(line)) {
      flushParagraph();
      list.push(line.replace(/^\s*[-*]\s+/, ''));
      continue;
    }

    // Blank line
    if (line.trim() === '') {
      flushParagraph();
      flushList();
      continue;
    }

    // Paragraph text
    flushList();
    paragraph.push(line.trim());
  }

  flushParagraph();
  flushList();
  return blocks;
}

/** Builds the TypeScript source for one BlogPost entry. */
export function toSource(post) {
  const body = post.content
    .map((block) => {
      if (block.type === 'h2') return `      { type: 'h2', text: ${JSON.stringify(block.text)} },`;
      if (block.type === 'p') return `      { type: 'p', text: ${JSON.stringify(block.text)} },`;
      if (block.type === 'ul')
        return `      { type: 'ul', items: ${JSON.stringify(block.items)} },`;
      if (block.type === 'code')
        return `      { type: 'code', lang: ${JSON.stringify(block.lang || '')}, code: ${JSON.stringify(block.code)} },`;
      return '';
    })
    .join('\n');

  return `  {
    slug: ${JSON.stringify(post.slug)},
    title: ${JSON.stringify(post.title)},
    description: ${JSON.stringify(post.description)},
    category: ${JSON.stringify(post.category)},
    readTime: ${JSON.stringify(post.readTime)},
    date: ${JSON.stringify(post.date)},
    content: [
${body}
    ],
  },`;
}

if (process.argv[2] === '--emit') {
  const [, , , file, slug, title, description, category, readTime, date] = process.argv;
  const markdown = fs.readFileSync(file, 'utf8').replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '');
  const blocks = markdownToBlocks(markdown);
  console.log(toSource({ slug, title, description, category, readTime, date, content: blocks }));
}
