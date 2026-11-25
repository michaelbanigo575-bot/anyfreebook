'use client';

import { useCallback, useEffect, useState } from 'react';
import { Panel, Stat, StatusPill } from '../ui';
import type { Placement, Sponsor, SponsorLink } from '@/lib/sponsors/types';

const SPOTS: Record<Placement, { name: string; help: string }> = {
  support_line: { name: 'A. Support line', help: 'One line under the search bar. Uses the sponsor name, link and an optional small logo.' },
  tile: { name: 'B. Partner tile', help: 'Replaces the last feature tile. Headline, short text, link, image, GIF or video.' },
  shelf: { name: 'C. Sponsored shelf', help: 'Wide block below Trending. Headline, text, media and up to 6 resource links.' },
};

type Draft = Omit<Sponsor, 'id'> & { id?: string };

interface Totals { sponsor_id: string; views: number; clicks: number; views_7d: number; clicks_7d: number }

const NO_TOTALS = { views: 0, clicks: 0, views_7d: 0, clicks_7d: 0 };
const num = (n: number) => Number(n).toLocaleString('en-US');
/** Click-through rate: clicks as a share of views. */
const ctr = (clicks: number, views: number) => (views > 0 ? `${((clicks / views) * 100).toFixed(1)}%` : '—');

/** A spreadsheet to send to sponsors. Cells that could run as formulas are neutralised. */
function downloadReport(sponsors: Sponsor[], totals: Record<string, Totals>) {
  const cell = (v: string | number) => {
    const text = String(v);
    return `"${(/^[=+\-@]/.test(text) ? `'${text}` : text).replace(/"/g, '""')}"`;
  };
  const rows: (string | number)[][] = [['Sponsor', 'Spot', 'Views', 'Clicks', 'Click rate', 'Views (7 days)', 'Clicks (7 days)']];
  for (const s of sponsors) {
    const t = totals[s.id] || NO_TOTALS;
    rows.push([s.sponsor_name, SPOTS[s.placement].name, t.views, t.clicks, ctr(t.clicks, t.views), t.views_7d, t.clicks_7d]);
  }
  const url = URL.createObjectURL(new Blob([rows.map(r => r.map(cell).join(',')).join('\n')], { type: 'text/csv' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `sponsor-report-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

const EMPTY: Draft = {
  placement: 'support_line', sponsor_name: '', headline: '', body: '', link_url: '', cta_label: '',
  media_type: 'none', media_url: '', extra_links: [], active: false, starts_at: null, ends_at: null,
};

const input = 'w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-white placeholder:text-slate-600';
const button = 'rounded-lg px-3 py-2 text-xs font-semibold border border-slate-700 text-slate-200 hover:bg-slate-800 disabled:opacity-50';

/** datetime-local works in the viewer's own time; the database stores UTC. */
function toLocalInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}
const fromLocalInput = (v: string) => (v ? new Date(v).toISOString() : null);

function state(s: Sponsor): { status: 'ok' | 'warn' | 'neutral'; label: string } {
  if (!s.active) return { status: 'neutral', label: 'Off' };
  if (s.starts_at && Date.parse(s.starts_at) > Date.now()) return { status: 'warn', label: 'Scheduled' };
  if (s.ends_at && Date.parse(s.ends_at) <= Date.now()) return { status: 'neutral', label: 'Ended' };
  return { status: 'ok', label: 'On' };
}

export default function SponsorsAdminPage() {
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [totals, setTotals] = useState<Record<string, Totals>>({});
  const [statsReady, setStatsReady] = useState(true);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/sponsors', { cache: 'no-store' }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    if (res?.ok) {
      setSponsors(data.sponsors || []);
      setTotals(Object.fromEntries(((data.totals || []) as Totals[]).map(t => [t.sponsor_id, t])));
      setStatsReady(data.statsReady !== false);
    } else setMessage(`Could not load ads: ${data?.error || res?.status || 'network error'}. Has 018_sponsors.sql been run?`);
  }, []);

  useEffect(() => { load(); }, [load]);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft(d => ({ ...d, [key]: value }));
  const setLink = (i: number, patch: Partial<SponsorLink>) =>
    set('extra_links', draft.extra_links.map((l, n) => (n === i ? { ...l, ...patch } : l)));

  const upload = async (file: File) => {
    setBusy(true); setMessage('Uploading…');
    const form = new FormData();
    form.append('file', file);
    const res = await fetch('/api/admin/sponsors/upload', { method: 'POST', body: form }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    if (res?.ok) { setDraft(d => ({ ...d, media_url: data.url, media_type: data.media_type })); setMessage('File uploaded'); }
    else setMessage(data?.error || 'Upload failed');
    setBusy(false);
  };

  const send = async (init: RequestInit, url: string, done: string) => {
    setBusy(true); setMessage('');
    const res = await fetch(url, init).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    setBusy(false);
    if (!res?.ok) { setMessage(data?.error || 'Something went wrong'); return false; }
    setMessage(done);
    await load();
    return true;
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await send({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(draft) }, '/api/admin/sponsors', 'Saved. The homepage updates within a minute.');
    if (ok) setDraft(EMPTY);
  };

  const remove = (s: Sponsor) => {
    if (window.confirm(`Delete the ad for ${s.sponsor_name}? This cannot be undone.`)) {
      send({ method: 'DELETE' }, `/api/admin/sponsors?id=${s.id}`, 'Deleted');
    }
  };

  const sum = Object.values(totals).reduce(
    (a, t) => ({ views: a.views + Number(t.views), clicks: a.clicks + Number(t.clicks), views_7d: a.views_7d + Number(t.views_7d), clicks_7d: a.clicks_7d + Number(t.clicks_7d) }),
    NO_TOTALS,
  );

  return (
    <div className="space-y-5">
    {!statsReady && <p role="status" className="text-sm text-amber-300">Counts are not available yet. Run 019_sponsor_stats.sql in Supabase.</p>}
    <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
      <Stat label="Views" value={num(sum.views)} sub={`${num(sum.views_7d)} in the last 7 days`} />
      <Stat label="Clicks" value={num(sum.clicks)} sub={`${num(sum.clicks_7d)} in the last 7 days`} />
      <Stat label="Click rate" value={ctr(sum.clicks, sum.views)} sub={`${ctr(sum.clicks_7d, sum.views_7d)} in the last 7 days`} />
    </div>
    <div className="grid gap-5 xl:grid-cols-2">
      <Panel title={draft.id ? 'Edit ad' : 'New ad'}>
        <form onSubmit={save} className="p-5 space-y-3">
          <label className="block text-xs text-slate-400">Spot
            <select className={input} value={draft.placement} onChange={e => set('placement', e.target.value as Placement)}>
              {Object.entries(SPOTS).map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}
            </select>
          </label>
          <p className="text-xs text-slate-500">{SPOTS[draft.placement].help}</p>
          <input className={input} required placeholder="Sponsor name" maxLength={80} value={draft.sponsor_name} onChange={e => set('sponsor_name', e.target.value)} />
          <input className={input} maxLength={100} placeholder={draft.placement === 'support_line' ? 'Lead-in text (default: Free reading is supported by)' : 'Headline'} value={draft.headline} onChange={e => set('headline', e.target.value)} />
          {draft.placement !== 'support_line' && (
            <>
              <textarea className={input} rows={3} maxLength={240} placeholder="Short text" value={draft.body} onChange={e => set('body', e.target.value)} />
              <input className={input} maxLength={30} placeholder="Button text (optional)" value={draft.cta_label} onChange={e => set('cta_label', e.target.value)} />
            </>
          )}
          <input className={input} type="url" placeholder="Main link (https://…)" value={draft.link_url} onChange={e => set('link_url', e.target.value)} />

          <div className="rounded-lg border border-slate-800 p-3 space-y-2">
            <div className="text-xs text-slate-400">Image, GIF or video (upload up to 20 MB, or paste a link)</div>
            <input type="file" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm" disabled={busy} className="text-xs text-slate-300"
              onChange={e => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ''; }} />
            <input className={input} type="url" placeholder="Media link (https://…)" value={draft.media_url} onChange={e => set('media_url', e.target.value)} />
            <select className={input} value={draft.media_type === 'video' ? 'video' : 'image'} onChange={e => set('media_type', e.target.value as 'image' | 'video')} aria-label="Media kind">
              <option value="image">Image or GIF</option>
              <option value="video">Video</option>
            </select>
            {draft.media_url.startsWith('https://') && (draft.media_type === 'video'
              ? <video src={draft.media_url} controls muted className="max-h-40 rounded-lg" />
              : <img src={draft.media_url} alt="Preview" className="max-h-40 rounded-lg" />)}
            {draft.placement === 'support_line' && <p className="text-xs text-slate-500">The support line shows only an image, as a small logo.</p>}
          </div>

          {draft.placement === 'shelf' && (
            <div className="space-y-2">
              <div className="text-xs text-slate-400">Resource links</div>
              {draft.extra_links.map((l, i) => (
                <div key={i} className="flex gap-2">
                  <input className={input} placeholder="Label" value={l.label} onChange={e => setLink(i, { label: e.target.value })} />
                  <input className={input} placeholder="https://…" value={l.url} onChange={e => setLink(i, { url: e.target.value })} />
                  <button type="button" className={button} aria-label="Remove link" onClick={() => set('extra_links', draft.extra_links.filter((_, n) => n !== i))}>✕</button>
                </div>
              ))}
              {draft.extra_links.length < 6 && <button type="button" className={button} onClick={() => set('extra_links', [...draft.extra_links, { label: '', url: '' }])}>Add link</button>}
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-2">
            <label className="text-xs text-slate-400">Starts (optional)
              <input className={input} type="datetime-local" value={toLocalInput(draft.starts_at)} onChange={e => set('starts_at', fromLocalInput(e.target.value))} />
            </label>
            <label className="text-xs text-slate-400">Ends (optional)
              <input className={input} type="datetime-local" value={toLocalInput(draft.ends_at)} onChange={e => set('ends_at', fromLocalInput(e.target.value))} />
            </label>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-200">
            <input type="checkbox" checked={draft.active} onChange={e => set('active', e.target.checked)} /> Show on the homepage
          </label>
          <div className="flex gap-2">
            <button type="submit" disabled={busy} className="rounded-lg px-4 py-2 text-sm font-semibold bg-indigo-600 text-white disabled:opacity-50">{draft.id ? 'Save changes' : 'Create ad'}</button>
            {draft.id && <button type="button" className={button} onClick={() => setDraft(EMPTY)}>Cancel</button>}
          </div>
          {message && <p role="status" className="text-sm text-amber-300">{message}</p>}
        </form>
      </Panel>

      <Panel title="Your ads" action={sponsors.length > 0 ? <button className={button} onClick={() => downloadReport(sponsors, totals)}>Download report</button> : undefined}>
        <div className="p-5 space-y-3">
          <p className="text-xs text-slate-500">If two ads are on for the same spot, the one saved last shows.</p>
          {sponsors.length === 0 && <p className="text-sm text-slate-400">No ads yet. Create your first one.</p>}
          {sponsors.map(s => (
            <div key={s.id} className="rounded-xl border border-slate-800 p-3 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-white truncate">{s.sponsor_name}</div>
                <div className="text-xs text-slate-500">{SPOTS[s.placement].name}</div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <StatusPill {...state(s)} />
                <button className={button} onClick={() => setDraft({ ...s, extra_links: s.extra_links || [] })}>Edit</button>
                <button className={button} disabled={busy} onClick={() => remove(s)}>Delete</button>
              </div>
            </div>
              <AdNumbers t={totals[s.id] || NO_TOTALS} />
            </div>
          ))}
        </div>
      </Panel>
    </div>
    <p className="text-xs text-slate-500">A view counts when half the ad is on screen for one second, once per ad per browsing session. Your own visits count too. No visitor details are stored.</p>
    </div>
  );
}

function AdNumbers({ t }: { t: Omit<Totals, 'sponsor_id'> }) {
  const items = [
    { label: 'Views', value: num(t.views), week: num(t.views_7d) },
    { label: 'Clicks', value: num(t.clicks), week: num(t.clicks_7d) },
    { label: 'Click rate', value: ctr(t.clicks, t.views), week: ctr(t.clicks_7d, t.views_7d) },
  ];
  return (
    <div className="grid grid-cols-3 gap-2">
      {items.map(i => (
        <div key={i.label} className="rounded-lg bg-slate-950 border border-slate-800 px-2 py-2">
          <div className="text-[10px] uppercase tracking-wider text-slate-500">{i.label}</div>
          <div className="text-lg font-mono font-bold text-white">{i.value}</div>
          <div className="text-[10px] text-slate-500">7 days: {i.week}</div>
        </div>
      ))}
    </div>
  );
}
