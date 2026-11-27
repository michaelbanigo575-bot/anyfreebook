import type { Applicant, GroupApi, GroupMember, GroupMessage, GroupSession, GroupSummary, Permission, Role } from './groups';

import { sampleStudyApi, type SampleStudyApi } from './sampleStudyApi';

export type SampleGroupApi = GroupApi & {
  study: SampleStudyApi;
  /** Preview only: someone else writes, arriving the way a live message would. */
  receive(groupId: string, body: string): void;
};

interface Sample {
  summary: GroupSummary;
  /** I am in it, or waiting. Otherwise it only shows in Discover or by invite. */
  joined: boolean;
  members: GroupMember[];
  applicants: Applicant[];
  log: GroupMessage[];
  token: string;
  rules: string;
  adminsOnly: boolean;
  slowSeconds: number;
  roles: Record<string, Role>;
  pins: number[];
  sessions: GroupSession[];
}

/** Made-up groups for the developer preview. Nothing is saved or sent. */
export function sampleGroupApi(options: { suspended?: boolean } = {}): SampleGroupApi {
  const held = !!options.suspended;
  const listeners = new Set<() => void>();
  const tell = () => listeners.forEach(f => f());
  let nextId = 100;
  const now = () => new Date().toISOString();

  const person = (id: string, name: string, isAdmin = false): GroupMember => ({ id, name, handle: null, isAdmin });
  const me = (isAdmin = false) => person('me', 'You', isAdmin);
  const msg = (id: number, senderId: string, sender: string, body: string, extra: Partial<GroupMessage> = {}): GroupMessage =>
    ({ id, senderId, sender, mine: senderId === 'me', body, at: now(), replyTo: null, reactions: [], ...extra });

  const make = (id: string, name: string, over: Partial<GroupSummary>, rest: Partial<Sample>): Sample => ({
    joined: true, members: [], applicants: [], log: [], token: `sample-${id}`,
    rules: '', adminsOnly: false, slowSeconds: 0, roles: {}, pins: [], sessions: [],
    ...rest,
    summary: {
      id, name, description: '', visibility: 'public', pending: false, isAdmin: false, muted: false, historyForNew: true,
      members: 0, waiting: 0, lastBody: '', lastSender: '', lastAt: now(), unread: 0, ...over,
    },
  });

  const groups: Sample[] = [
    make('g1', 'Exam study circle', { visibility: 'private', isAdmin: true, unread: 0, description: 'Revision partners for this term.' }, {
      members: [me(true), person('kemi', 'Kemi Adeyemi'), person('tunde', 'Tunde Bello')],
      applicants: [{ id: 'zara', name: 'Zara Musa', banned: false }],
      log: [
        msg(1, 'kemi', 'Kemi Adeyemi', 'Shall we read chapter 4 together on Friday?'),
        msg(2, 'me', 'You', 'Yes. I will bring my notes.', { replyTo: 1, reactions: [{ emoji: '👍', total: 2, mine: false }] }),
        msg(3, 'tunde', 'Tunde Bello', 'Count me in.', { reactions: [{ emoji: '🔥', total: 1, mine: true }] }),
      ],
    }),
    make('g2', 'African literature readers', { unread: 2, description: 'One book a month, open to everyone.' }, {
      members: [person('ngozi', 'Ngozi Okafor', true), me(), person('kemi', 'Kemi Adeyemi')],
      log: [
        msg(10, 'ngozi', 'Ngozi Okafor', 'Welcome, everyone. This month we choose a short novel.'),
        msg(11, 'kemi', 'Kemi Adeyemi', 'I would love something set in Lagos.'),
      ],
    }),
    make('g3', 'Science writers', { description: 'Share drafts and get kind, useful feedback.' }, {
      joined: false,
      members: [person('musa', 'Musa Ibrahim', true)],
      log: [msg(20, 'musa', 'Musa Ibrahim', 'Post your first paragraph whenever you are ready.')],
    }),
    make('g4', 'Quiet book club', { visibility: 'private', historyForNew: false, description: 'A small private circle.' }, {
      joined: false, members: [person('ife', 'Ife Cole', true)],
    }),
  ];

  groups[0].rules = 'Be kind. Questions of every level are welcome.';
  groups[0].pins = [1];
  groups[0].sessions = [{ id: 's1', title: 'Chapter 4 revision', note: 'Bring one question each.', startsAt: new Date(Date.now() + 86400000).toISOString(), minutes: 60 }];
  const role = (g: Sample, id: string) => (g.roles[id] ||= { id, permissions: [], timedOutUntil: null });
  const myPowers = (g: Sample): Permission[] => (g.summary.isAdmin ? ['approve', 'moderate', 'announce'] : g.roles.me?.permissions || []);

  const find = (id: string) => {
    const g = groups.find(x => x.summary.id === id);
    if (!g) throw new Error('chat:not-found');
    return g;
  };
  const active = (id: string) => {
    const g = find(id);
    if (!g.joined || g.summary.pending) throw new Error('chat:not-found');
    return g;
  };
  const allowed = () => { if (held) throw new Error('chat:suspended'); };
  const summarise = (g: Sample): GroupSummary => {
    const last = g.summary.pending ? undefined : g.log[g.log.length - 1];
    return {
      ...g.summary, members: g.members.length,
      waiting: g.summary.isAdmin ? g.applicants.filter(a => !a.banned).length : 0,
      lastBody: last?.body || '', lastSender: last?.sender || '', lastAt: last?.at || g.summary.lastAt,
    };
  };
  const enter = (g: Sample) => {
    g.joined = true;
    g.summary.pending = false;
    if (!g.members.some(m => m.id === 'me')) g.members.push(me());
  };

  return {
    study: sampleStudyApi(options),
    receive(id, body) {
      const g = active(id);
      const from = g.members.find(m => m.id !== 'me');
      if (!from) return;
      g.log.push(msg(nextId++, from.id, from.name, body));
      g.summary.unread += 1;
      tell();
    },
    state: async () => 'ready',
    suspended: async () => held,
    mine: async () => groups.filter(g => g.joined).map(summarise),
    discover: async search => groups
      .filter(g => g.summary.visibility === 'public' && `${g.summary.name} ${g.summary.description}`.toLowerCase().includes(search.trim().toLowerCase()))
      .map(g => ({ id: g.summary.id, name: g.summary.name, description: g.summary.description, members: g.members.length, isMember: g.joined, historyForNew: g.summary.historyForNew })),
    async create(input) {
      allowed();
      if (input.name.trim().length < 3) throw new Error('chat:group-name');
      const id = `new-${nextId++}`;
      groups.unshift(make(id, input.name.trim(), { description: input.description.trim(), visibility: input.visibility, historyForNew: input.historyForNew, isAdmin: true }, { members: [me(true)] }));
      return id;
    },
    async join(id) { allowed(); enter(find(id)); tell(); },
    async invitePreview(token) {
      const g = groups.find(x => x.token === token && x.summary.visibility === 'private');
      return g ? { id: g.summary.id, name: g.summary.name, description: g.summary.description, members: g.members.length, historyForNew: g.summary.historyForNew, status: !g.joined ? 'none' : g.summary.pending ? 'pending' : 'member' } : null;
    },
    async requestToJoin(token) {
      allowed();
      const g = groups.find(x => x.token === token);
      if (!g) throw new Error('chat:unavailable');
      if (g.joined && !g.summary.pending) return 'member';
      g.joined = true;
      g.summary.pending = true;
      return 'pending';
    },
    async messages(id, limit) {
      const g = active(id);
      return { messages: g.log.slice(-limit).map(m => ({ ...m, reactions: m.reactions.map(r => ({ ...r })) })), more: g.log.length > limit };
    },
    async send(id, body, replyTo) {
      allowed();
      const g = active(id);
      g.log.push(msg(nextId++, 'me', 'You', body.trim(), { replyTo }));
    },
    async react(id, messageId, emoji) {
      const m = active(id).log.find(x => x.id === messageId);
      if (!m) throw new Error('chat:not-found');
      if (emoji) allowed();
      m.reactions = m.reactions.map(r => (r.mine ? { ...r, mine: false, total: r.total - 1 } : r)).filter(r => r.total > 0);
      if (!emoji) return;
      const same = m.reactions.find(r => r.emoji === emoji);
      if (same) { same.total += 1; same.mine = true; } else m.reactions.push({ emoji, total: 1, mine: true });
    },
    async deleteMessage(id, messageId) { const g = active(id); g.log = g.log.filter(m => m.id !== messageId); },
    report: async () => {},
    async block(userId) { for (const g of groups) g.log = g.log.filter(m => m.senderId !== userId); },
    async markRead(id) { active(id).summary.unread = 0; },
    async mute(id, muted) { active(id).summary.muted = muted; },
    async leave(id) {
      const g = find(id);
      g.joined = false;
      g.summary.pending = false;
      g.summary.isAdmin = false;
      g.members = g.members.filter(m => m.id !== 'me');
    },
    members: async id => active(id).members.map(m => ({ ...m })),
    applicants: async id => active(id).applicants.map(a => ({ ...a })),
    async decide(id, userId, approve) {
      const g = active(id);
      const found = g.applicants.find(a => a.id === userId);
      if (!found) throw new Error('chat:not-found');
      g.applicants = g.applicants.filter(a => a !== found);
      if (approve) g.members.push(person(found.id, found.name));
    },
    async remove(id, userId, ban) {
      const g = active(id);
      const found = g.members.find(m => m.id === userId);
      g.members = g.members.filter(m => m.id !== userId);
      if (ban && found) g.applicants.push({ id: found.id, name: found.name, banned: true });
    },
    async unban(id, userId) { const g = active(id); g.applicants = g.applicants.filter(a => a.id !== userId); },
    async transfer(id, userId) {
      const g = active(id);
      g.members = g.members.map(m => ({ ...m, isAdmin: m.id === userId }));
      g.summary.isAdmin = false;
    },
    async update(id, name, description) {
      if (name.trim().length < 3) throw new Error('chat:group-name');
      const g = active(id);
      g.summary.name = name.trim();
      g.summary.description = description.trim();
    },
    async inviteToken(id, reset) {
      const g = active(id);
      if (reset) g.token = `sample-${id}-${nextId++}`;
      return g.token;
    },
    async close(id) { const g = find(id); groups.splice(groups.indexOf(g), 1); },
    async controls(id) {
      const g = active(id);
      return { rules: g.rules, adminsOnly: g.adminsOnly, slowSeconds: g.slowSeconds, can: myPowers(g), timedOutUntil: g.roles.me?.timedOutUntil || null };
    },
    roles: async id => active(id).members.map(m => ({ ...role(active(id), m.id), permissions: [...role(active(id), m.id).permissions] })),
    async saveSettings(id, s) { allowed(); const g = active(id); g.rules = s.rules.trim(); g.adminsOnly = s.adminsOnly; g.slowSeconds = s.slowSeconds; },
    async setHelper(id, user, permissions) { role(active(id), user).permissions = [...permissions]; },
    async timeout(id, user, minutes) { role(active(id), user).timedOutUntil = minutes ? new Date(Date.now() + minutes * 60000).toISOString() : null; },
    async pinned(id) {
      const g = active(id);
      return g.pins.flatMap(p => g.log.filter(m => m.id === p).map(m => ({ id: m.id, body: m.body, sender: m.sender })));
    },
    async pin(id, message, on) {
      const g = active(id);
      if (on && !g.pins.includes(message)) {
        if ((await this.pinned(id)).length >= 3) throw new Error('chat:too-many-pins');
        g.pins.unshift(message);
      }
      if (!on) g.pins = g.pins.filter(p => p !== message);
    },
    upcoming: async id => [...active(id).sessions].sort((a, b) => a.startsAt.localeCompare(b.startsAt)),
    async schedule(id, s) {
      allowed();
      if (new Date(s.startsAt).getTime() < Date.now()) throw new Error('chat:session-time');
      active(id).sessions.push({ id: `s${nextId++}`, ...s });
    },
    async cancelSession(id, session) { const g = active(id); g.sessions = g.sessions.filter(s => s.id !== session); },
    subscribe(onChange, onLive) {
      listeners.add(onChange);
      const timer = setTimeout(() => onLive(true), 0);
      return () => { clearTimeout(timer); listeners.delete(onChange); };
    },
  };
}
