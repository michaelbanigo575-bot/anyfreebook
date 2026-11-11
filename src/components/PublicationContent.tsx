import React from 'react';

/**
 * Minimal, XSS-safe renderer for publication bodies. Supports a small subset of
 * markdown (headings, bold/italic, blockquotes, lists, paragraphs) without
 * dangerouslySetInnerHTML — everything is rendered as React text nodes.
 */
function renderInline(text: string, keyBase: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  // Split on **bold** and *italic*
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;
  const parts = text.split(regex);
  parts.forEach((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      nodes.push(<strong key={`${keyBase}-b${i}`} className="font-extrabold text-[var(--text)] bg-[var(--primary-light)] rounded px-0.5">{part.slice(2, -2)}</strong>);
    } else if (part.startsWith('*') && part.endsWith('*')) {
      nodes.push(<em key={`${keyBase}-i${i}`}>{part.slice(1, -1)}</em>);
    } else if (part) {
      nodes.push(<React.Fragment key={`${keyBase}-t${i}`}>{part}</React.Fragment>);
    }
  });
  return nodes;
}

/** Publication bodies are sometimes stored as HTML (<p>, <strong>…). Convert that to the
 *  markdown subset this renderer understands so readers never see raw tags. */
function decodeEntities(s: string): string {
  const named: Record<string, string> = { nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', mdash: '—', ndash: '–', hellip: '…' };
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_m, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_m, d) => String.fromCodePoint(Number(d)))
    .replace(/&([a-z]+);/gi, (m, n) => named[n.toLowerCase()] ?? m);
}

function htmlToMarkdown(html: string): string {
  const t = html
    .replace(/\r\n?/g, '\n')
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, '')
    .replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, '\n\n# $1\n\n')
    .replace(/<h[2-6][^>]*>([\s\S]*?)<\/h[2-6]>/gi, '\n\n## $1\n\n')
    .replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (_m, inner: string) => '\n\n> ' + inner.replace(/<\/?p[^>]*>/gi, ' ').trim() + '\n\n')
    .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '\n- $1\n')
    .replace(/<\/(ul|ol)>/gi, '\n\n')
    .replace(/<(strong|b)(\s[^>]*)?>([\s\S]*?)<\/\1>/gi, '**$3**')
    .replace(/<(em|i)(\s[^>]*)?>([\s\S]*?)<\/\1>/gi, '*$3*')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|section|article|tr)>/gi, '\n\n')
    .replace(/<[^>]+>/g, '');
  return decodeEntities(t).replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

const HAS_HTML = /<\/?(p|div|br|strong|em|b|i|h[1-6]|ul|ol|li|blockquote|span|a|section|article)[\s>/]/i;

export function PublicationContent({ body: rawBody }: { body: string }) {
  const body = HAS_HTML.test(rawBody) ? htmlToMarkdown(rawBody) : rawBody;
  const blocks = body.replace(/\r\n/g, '\n').split(/\n\n+/);
  const out: React.ReactNode[] = [];
  let listBuffer: string[] = [];

  const flushList = (key: string) => {
    if (listBuffer.length) {
      out.push(
        <ul key={`ul-${key}`} className="list-disc pl-6 space-y-1.5 my-4 text-[var(--text)] font-medium leading-[1.8]">
          {listBuffer.map((li, i) => <li key={i}>{renderInline(li.replace(/^[-*]\s+/, ''), `li-${key}-${i}`)}</li>)}
        </ul>
      );
      listBuffer = [];
    }
  };

  blocks.forEach((block, bi) => {
    const trimmed = block.trim();
    if (!trimmed) return;

    const lines = trimmed.split('\n');
    const isList = lines.every(l => /^[-*]\s+/.test(l.trim()));
    if (isList) {
      listBuffer.push(...lines);
      return;
    }
    flushList(String(bi));

    if (trimmed.startsWith('# ')) {
      out.push(<h2 key={bi} className="text-2xl sm:text-3xl font-display font-extrabold gradient-text mt-10 mb-4">{renderInline(trimmed.slice(2), `h${bi}`)}</h2>);
    } else if (trimmed.startsWith('## ')) {
      out.push(<h3 key={bi} className="text-xl sm:text-2xl font-display font-bold text-[var(--primary)] mt-8 mb-3">{renderInline(trimmed.slice(3), `h${bi}`)}</h3>);
    } else if (trimmed.startsWith('> ')) {
      out.push(<blockquote key={bi} className="border-l-4 border-[var(--primary)] bg-[var(--primary-light)] rounded-r-xl pl-4 pr-3 py-3 italic font-semibold text-[var(--text)] my-5">{renderInline(trimmed.slice(2), `q${bi}`)}</blockquote>);
    } else {
      out.push(<p key={bi} className="text-[var(--text)] text-[17px] sm:text-lg font-medium leading-[1.8] my-4 whitespace-pre-line">{renderInline(trimmed, `p${bi}`)}</p>);
    }
  });
  flushList('final');

  return <div className="prose-afb">{out}</div>;
}
