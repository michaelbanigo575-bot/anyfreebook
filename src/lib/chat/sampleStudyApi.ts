import { NOTHING_NOW, type StudyApi, type StudyItem, type StudyNow, type StudyQuestion } from './study';

export type SampleStudyApi = StudyApi & {
  /** Preview only: another member presents the next page. */
  samplePresent(groupId: string): void;
};

/** Made-up study material for the developer preview. Nothing is saved or sent. */
export function sampleStudyApi(options: { suspended?: boolean } = {}): SampleStudyApi {
  let next = 1;
  const allowed = () => { if (options.suspended) throw new Error('chat:suspended'); };
  const shelves: Record<string, (StudyItem & { body: string })[]> = {
    g1: [{
      id: 'n1', kind: 'note', title: 'Lecture 4: How cells divide', slug: null, addedBy: 'Kemi Adeyemi', canRemove: true, openQuestions: 0,
      body: 'Cells divide so a living thing can grow and repair itself.\n\nBefore dividing, a cell copies its DNA.\n---\nMitosis has four stages: prophase, metaphase, anaphase and telophase.\n\nA short way to remember them: P, M, A, T.\n---\nCheck yourself: why must the DNA be copied first?',
    }],
  };
  const questions: Record<string, StudyQuestion[]> = {
    n1: [{ id: 'q1', page: 1, body: 'Why does a cell need to copy its DNA first?', author: null, mine: false, answered: false, canRemove: true, canResolve: true,
      answers: [{ id: 'a1', body: 'So each new cell gets a full set of instructions.', name: 'Tunde Bello', mine: false, canRemove: true }] }],
  };
  const rooms: Record<string, StudyNow & { endsAt?: number }> = {};
  const room = (g: string) => (rooms[g] ||= { ...NOTHING_NOW });
  const shelf = (g: string) => (shelves[g] ||= []);
  const find = (item: string) => {
    const found = Object.values(shelves).flat().find(i => i.id === item);
    if (!found) throw new Error('chat:not-found');
    return found;
  };
  const question = (id: string) => {
    const found = Object.values(questions).flat().find(q => q.id === id);
    if (!found) throw new Error('chat:not-found');
    return found;
  };

  return {
    samplePresent(g) {
      const first = shelf(g)[0];
      if (!first) return;
      const r = room(g);
      Object.assign(r, { presenter: 'Kemi Adeyemi', iPresent: false, itemId: first.id, page: r.presenter ? (r.page % 3) + 1 : 2 });
    },
    shelf: async g => shelf(g).map(({ body: _body, ...i }) => ({ ...i, openQuestions: (questions[i.id] || []).filter(q => !q.answered).length })),
    read: async (_g, item) => find(item).body,
    async addNote(g, title, body) {
      allowed();
      if (title.trim().length < 3) throw new Error('chat:note-title');
      const id = `note-${next++}`;
      shelf(g).unshift({ id, kind: 'note', title: title.trim(), slug: null, addedBy: 'You', canRemove: true, openQuestions: 0, body: body.trim() });
      return id;
    },
    async addBook(g, slug) {
      allowed();
      const id = `book-${next++}`;
      shelf(g).unshift({ id, kind: 'book', title: slug.replace(/-/g, ' '), slug, addedBy: 'You', canRemove: true, openQuestions: 0, body: '' });
      return id;
    },
    async removeItem(g, item) { shelves[g] = shelf(g).filter(i => i.id !== item); },
    questions: async (_g, item) => (questions[item] || []).map(q => ({ ...q, answers: [...q.answers] })),
    async ask(_g, item, page, body, anonymous) {
      allowed();
      (questions[item] ||= []).push({ id: `q-${next++}`, page, body: body.trim(), author: anonymous ? null : 'You', mine: true, answered: false, canRemove: true, canResolve: true, answers: [] });
    },
    async answer(_g, id, body) { allowed(); question(id).answers.push({ id: `a-${next++}`, body: body.trim(), name: 'You', mine: true, canRemove: true }); },
    async resolve(_g, id, answered) { question(id).answered = answered; },
    async removePost(_g, id, answer) {
      if (answer) { const q = question(id); q.answers = q.answers.filter(a => a.id !== answer); return; }
      for (const key of Object.keys(questions)) questions[key] = questions[key].filter(q => q.id !== id);
    },
    report: async () => {},
    async now(g) {
      const r = room(g);
      const left = r.endsAt ? Math.ceil((r.endsAt - Date.now()) / 1000) : 0;
      return { ...r, timer: r.timer && left > 0 ? { kind: r.timer.kind, secondsLeft: left } : null };
    },
    async present(g, item, page) { allowed(); Object.assign(room(g), { presenter: 'You', iPresent: true, itemId: item, page }); },
    async stopPresenting(g) { Object.assign(room(g), { presenter: null, iPresent: false, itemId: null, page: 1 }); },
    async timer(g, kind, minutes) {
      allowed();
      Object.assign(room(g), { timer: minutes ? { kind, secondsLeft: minutes * 60 } : null, endsAt: minutes ? Date.now() + minutes * 60000 : 0 });
    },
  };
}
