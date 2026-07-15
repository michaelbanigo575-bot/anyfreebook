'use client';

import { useEffect, useState } from 'react';

/**
 * ANYFREEBOOK's own translation system (free, keyless): walks the page's text
 * nodes, batches them to /api/translate (Google's public gtx endpoint via our
 * server), and swaps translations in place. A MutationObserver keeps
 * dynamically added content (rotating grids, feeds, search results)
 * translated too. Choice persists in localStorage; English restores originals.
 */

const LANGUAGES: [code: string, label: string][] = [
  ['', '🌐 English (original)'],
  ['fr', 'Français'], ['es', 'Español'], ['pt', 'Português'], ['ar', 'العربية'],
  ['sw', 'Kiswahili'], ['yo', 'Yorùbá'], ['ig', 'Igbo'], ['ha', 'Hausa'],
  ['am', 'አማርኛ'], ['zu', 'isiZulu'], ['af', 'Afrikaans'], ['hi', 'हिन्दी'],
  ['ur', 'اردو'], ['bn', 'বাংলা'], ['ta', 'தமிழ்'], ['zh-CN', '中文'],
  ['ja', '日本語'], ['ko', '한국어'], ['de', 'Deutsch'], ['ru', 'Русский'],
  ['it', 'Italiano'], ['nl', 'Nederlands'], ['el', 'Ελληνικά'], ['tr', 'Türkçe'],
  ['fa', 'فارسی'], ['he', 'עברית'], ['pl', 'Polski'], ['uk', 'Українська'],
  ['vi', 'Tiếng Việt'], ['th', 'ไทย'], ['id', 'Bahasa Indonesia'], ['tl', 'Tagalog'],
];

const STORE_KEY = 'afb_lang';
const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'CODE', 'PRE', 'TEXTAREA', 'NOSCRIPT', 'IFRAME', 'SVG']);

// Module-level engine state (survives React re-renders, one per page)
const cache = new Map<string, string>();          // `${lang}|${original}` -> translated
const originals = new WeakMap<Text, string>();    // node -> original English
let activeLang = '';
let observer: MutationObserver | null = null;
let running = false;

function collectTextNodes(root: Node): Text[] {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent || SKIP_TAGS.has(parent.tagName)) return NodeFilter.FILTER_REJECT;
      if (parent.closest('.notranslate, [data-no-translate]')) return NodeFilter.FILTER_REJECT;
      return node.nodeValue && node.nodeValue.trim().length > 1 ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    },
  });
  const nodes: Text[] = [];
  let n: Node | null;
  while ((n = walker.nextNode())) nodes.push(n as Text);
  return nodes;
}

async function translateNodes(nodes: Text[], lang: string): Promise<void> {
  // Restore-then-translate keyed on the ORIGINAL English text
  const pending: { node: Text; text: string }[] = [];
  for (const node of nodes) {
    const original = originals.get(node) ?? node.nodeValue ?? '';
    if (!originals.has(node)) originals.set(node, original);
    const hit = cache.get(`${lang}|${original}`);
    if (hit !== undefined) node.nodeValue = hit;
    else if (original.trim()) pending.push({ node, text: original });
  }

  // Batch uncached strings (~100 items / ~8000 chars per request)
  for (let i = 0; i < pending.length; ) {
    const batch: typeof pending = [];
    let chars = 0;
    while (i < pending.length && batch.length < 100 && chars < 8000) {
      const item = pending[i++];
      batch.push(item);
      chars += item.text.length;
    }
    try {
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texts: batch.map(b => b.text.replace(/\n/g, ' ')), to: lang }),
      });
      if (!res.ok) continue;
      const data = await res.json();
      if (!Array.isArray(data.texts)) continue;
      batch.forEach((item, j) => {
        const translated = data.texts[j];
        if (typeof translated === 'string' && translated.trim()) {
          cache.set(`${lang}|${item.text}`, translated);
          if (activeLang === lang) item.node.nodeValue = translated;
        }
      });
    } catch { /* network hiccup: leave batch in English */ }
  }
}

function restoreEnglish(): void {
  for (const node of collectTextNodes(document.body)) {
    const original = originals.get(node);
    if (original !== undefined) node.nodeValue = original;
  }
}

async function applyLanguage(lang: string): Promise<void> {
  activeLang = lang;
  observer?.disconnect();
  observer = null;

  if (!lang) { restoreEnglish(); document.documentElement.lang = 'en'; return; }
  if (running) return;
  running = true;
  document.documentElement.lang = lang;

  try {
    await translateNodes(collectTextNodes(document.body), lang);
  } finally {
    running = false;
  }

  // Keep dynamically added content translated (rotating grids, feeds, chat)
  let queue: Node[] = [];
  let timer: ReturnType<typeof setTimeout> | null = null;
  observer = new MutationObserver(muts => {
    for (const m of muts) m.addedNodes.forEach(n => queue.push(n));
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      const roots = queue.splice(0);
      const nodes = roots.flatMap(r => (r.nodeType === Node.TEXT_NODE ? [r as Text] : r.nodeType === Node.ELEMENT_NODE ? collectTextNodes(r) : []));
      if (nodes.length && activeLang === lang) translateNodes(nodes, lang);
    }, 600);
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const [lang, setLang] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORE_KEY) || '';
    setLang(saved);
    if (saved) applyLanguage(saved);
  }, []);

  const change = async (code: string) => {
    setLang(code);
    localStorage.setItem(STORE_KEY, code);
    setBusy(true);
    await applyLanguage(code);
    setBusy(false);
  };

  return (
    <select
      value={lang}
      onChange={e => change(e.target.value)}
      disabled={busy}
      aria-label="Translate this site"
      className={`notranslate rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-secondary)] outline-none focus:border-[var(--primary)] cursor-pointer disabled:opacity-60 ${
        compact ? 'px-1.5 py-1 text-xs max-w-[110px]' : 'px-2 py-1.5 text-xs max-w-[130px]'
      }`}
    >
      {LANGUAGES.map(([code, label]) => (
        <option key={code || 'en'} value={code}>{code ? `🌐 ${label}` : label}</option>
      ))}
    </select>
  );
}
