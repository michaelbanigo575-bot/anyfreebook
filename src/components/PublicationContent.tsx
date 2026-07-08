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
      nodes.push(<strong key={`${keyBase}-b${i}`}>{part.slice(2, -2)}</strong>);
    } else if (part.startsWith('*') && part.endsWith('*')) {
      nodes.push(<em key={`${keyBase}-i${i}`}>{part.slice(1, -1)}</em>);
    } else if (part) {
      nodes.push(<React.Fragment key={`${keyBase}-t${i}`}>{part}</React.Fragment>);
    }
  });
  return nodes;
}

export function PublicationContent({ body }: { body: string }) {
  const blocks = body.replace(/\r\n/g, '\n').split(/\n\n+/);
  const out: React.ReactNode[] = [];
  let listBuffer: string[] = [];

  const flushList = (key: string) => {
    if (listBuffer.length) {
      out.push(
        <ul key={`ul-${key}`} className="list-disc pl-6 space-y-1.5 my-4 text-[var(--text-secondary)]">
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
      out.push(<h2 key={bi} className="text-2xl font-display font-bold text-[var(--text)] mt-8 mb-3">{renderInline(trimmed.slice(2), `h${bi}`)}</h2>);
    } else if (trimmed.startsWith('## ')) {
      out.push(<h3 key={bi} className="text-xl font-display font-bold text-[var(--text)] mt-6 mb-2">{renderInline(trimmed.slice(3), `h${bi}`)}</h3>);
    } else if (trimmed.startsWith('> ')) {
      out.push(<blockquote key={bi} className="border-l-4 border-[var(--primary)] pl-4 italic text-[var(--text-secondary)] my-4">{renderInline(trimmed.slice(2), `q${bi}`)}</blockquote>);
    } else {
      out.push(<p key={bi} className="text-[var(--text-secondary)] leading-relaxed my-4 whitespace-pre-line">{renderInline(trimmed, `p${bi}`)}</p>);
    }
  });
  flushList('final');

  return <div className="prose-afb">{out}</div>;
}
