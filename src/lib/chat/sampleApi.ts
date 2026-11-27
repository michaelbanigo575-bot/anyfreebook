import type { ChatApi, Message, Person, Thread } from './types';

/** Made-up people and messages, held in memory. Used only by the local preview page. */
export type SampleChatApi = ChatApi & {
  /** Preview only: someone else writes, arriving the way a live message would. */
  receive(threadId: string, body: string): void;
};

export function sampleChatApi(options: { suspended?: boolean } = {}): SampleChatApi {
  const listeners = new Set<() => void>();
  const ago = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();
  let enabled = false;
  let allow = true;
  let nextId = 100;
  const hidden = new Set<string>();
  const blockedPeople: Person[] = [];
  const everyone: Record<string, Person> = {
    kemi: { id: 'kemi', name: 'Kemi Adeyemi', handle: 'kemi-writes' },
    tunde: { id: 'tunde', name: 'Tunde Okafor', handle: 'tunde' },
    ada: { id: 'ada', name: 'Ada Nwosu', handle: 'ada-n' },
  };
  const logs: Record<string, Message[]> = {
    t1: [
      { id: 1, mine: false, body: 'Hi! I read your 30-day study plan. The first week really helped.', at: ago(190) },
      { id: 2, mine: true, body: 'Thank you, I’m glad. Which part did you find hardest?', at: ago(184) },
      { id: 3, mine: false, body: 'Keeping the same study time every day.\nI moved it to early morning and that worked.', at: ago(12) },
    ],
    t2: [{ id: 4, mine: false, body: 'Hello, I’m a final-year student. Could I ask about your research reading list?', at: ago(48) }],
  };
  const threads: Thread[] = [
    { id: 't1', otherId: 'kemi', name: 'Kemi Adeyemi', handle: 'kemi-writes', status: 'active', isRequest: false, lastBody: '', lastMine: false, lastAt: '', unread: 1 },
    { id: 't2', otherId: 'tunde', name: 'Tunde Okafor', handle: 'tunde', status: 'pending', isRequest: true, lastBody: '', lastMine: false, lastAt: '', unread: 1 },
  ];
  const find = (id: string) => {
    const t = threads.find(x => x.id === id && !hidden.has(x.id));
    if (!t) throw new Error('chat:not-found');
    return t;
  };
  const add = (id: string, body: string) => {
    if (options.suspended) throw new Error('chat:suspended');
    const text = body.trim();
    if (!text) throw new Error('chat:empty-message');
    logs[id] = [...(logs[id] || []), { id: nextId++, mine: true, body: text, at: new Date().toISOString() }];
  };

  const waiting = () => {
    const seen = threads.filter(t => !hidden.has(t.id) && !blockedPeople.some(p => p.id === t.otherId));
    return {
      messages: seen.filter(t => !t.isRequest).reduce((n, t) => n + t.unread, 0),
      requests: seen.filter(t => t.isRequest).length,
    };
  };

  return {
    receive(id, body) {
      const t = threads.find(x => x.id === id && !hidden.has(x.id));
      if (!t || blockedPeople.some(p => p.id === t.otherId)) return;
      logs[id] = [...(logs[id] || []), { id: nextId++, mine: false, body, at: new Date().toISOString() }];
      t.unread += 1;
      listeners.forEach(tell => tell());
    },
    unread: async () => waiting(),
    subscribe(onChange, onLive) {
      listeners.add(onChange);
      const timer = setTimeout(() => onLive(true), 0);
      return () => { clearTimeout(timer); listeners.delete(onChange); };
    },
    state: async () => (enabled ? 'ready' : 'needs-setup'),
    enable: async () => { enabled = true; },
    suspended: async () => !!options.suspended,
    inbox: async () => threads
      .filter(t => !hidden.has(t.id) && !blockedPeople.some(p => p.id === t.otherId))
      .map(t => {
        const last = logs[t.id]?.[logs[t.id].length - 1];
        return { ...t, lastBody: last?.body || '', lastMine: !!last?.mine, lastAt: last?.at || ago(0) };
      })
      .sort((a, b) => b.lastAt.localeCompare(a.lastAt)),
    messages: async id => { find(id); return [...(logs[id] || [])]; },
    send: async (id, body) => {
      const t = find(id);
      if (t.status === 'pending') throw new Error(t.isRequest ? 'chat:accept-first' : 'chat:waiting-for-reply');
      add(id, body);
    },
    start: async (toId, body) => {
      const existing = threads.find(t => t.otherId === toId && !hidden.has(t.id));
      if (existing) return existing.id;
      if (/(https?:\/\/|www\.)/i.test(body)) throw new Error('chat:no-links-in-requests');
      const person = everyone[toId];
      if (!person) throw new Error('chat:unavailable');
      const id = `t-${toId}`;
      add(id, body);
      threads.push({ id, otherId: toId, name: person.name, handle: person.handle, status: 'pending', isRequest: false, lastBody: '', lastMine: true, lastAt: '', unread: 0 });
      return id;
    },
    person: async id => (everyone[id] ? { ...everyone[id], mutual: false } : null),
    respond: async (id, accept) => {
      const t = find(id);
      if (accept) { t.status = 'active'; t.isRequest = false; } else hidden.add(id);
    },
    markRead: async id => { find(id).unread = 0; },
    block: async id => { if (everyone[id] && !blockedPeople.some(p => p.id === id)) blockedPeople.push(everyone[id]); },
    unblock: async id => { const i = blockedPeople.findIndex(p => p.id === id); if (i >= 0) blockedPeople.splice(i, 1); },
    blocked: async () => [...blockedPeople],
    report: async id => { find(id); },
    allowsRequests: async () => allow,
    setAllowsRequests: async value => { allow = value; },
  };
}
