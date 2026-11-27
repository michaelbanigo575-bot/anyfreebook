import type { ReportReason } from './types';

export const NOTE_LIMIT = 30_000;
export const PAGE_SIZE = 1800;
export const STUCK_TEXT = 'I’m stuck on this page. Can someone explain it?';
export const TIMERS = [{ kind: 'focus' as const, minutes: 25, label: 'Focus 25 min' }, { kind: 'break' as const, minutes: 5, label: 'Break 5 min' }];

export interface StudyItem { id: string; kind: 'note' | 'book'; title: string; slug: string | null; addedBy: string; canRemove: boolean; openQuestions: number }
export interface StudyAnswer { id: string; body: string; name: string | null; mine: boolean; canRemove: boolean }
export interface StudyQuestion {
  id: string; page: number; body: string;
  /** null for a question asked without a name. */
  author: string | null;
  mine: boolean; answered: boolean; canRemove: boolean; canResolve: boolean;
  answers: StudyAnswer[];
}
export interface StudyNow {
  presenter: string | null;
  iPresent: boolean;
  itemId: string | null;
  page: number;
  timer: { kind: 'focus' | 'break'; secondsLeft: number } | null;
}
export const NOTHING_NOW: StudyNow = { presenter: null, iPresent: false, itemId: null, page: 1, timer: null };

export interface StudyApi {
  shelf(groupId: string): Promise<StudyItem[]>;
  read(groupId: string, itemId: string): Promise<string>;
  addNote(groupId: string, title: string, body: string): Promise<string>;
  addBook(groupId: string, slug: string): Promise<string>;
  removeItem(groupId: string, itemId: string): Promise<void>;
  questions(groupId: string, itemId: string): Promise<StudyQuestion[]>;
  ask(groupId: string, itemId: string, page: number, body: string, anonymous: boolean): Promise<void>;
  answer(groupId: string, questionId: string, body: string): Promise<void>;
  resolve(groupId: string, questionId: string, answered: boolean): Promise<void>;
  removePost(groupId: string, questionId: string, answerId: string | null): Promise<void>;
  report(groupId: string, kind: 'item' | 'question' | 'answer', targetId: string, reason: ReportReason, details: string): Promise<void>;
  now(groupId: string): Promise<StudyNow>;
  present(groupId: string, itemId: string, page: number): Promise<void>;
  stopPresenting(groupId: string): Promise<void>;
  /** 0 minutes stops the shared timer. */
  timer(groupId: string, kind: 'focus' | 'break', minutes: number): Promise<void>;
}

/**
 * Splits a note into pages. Everyone must get the same pages from the same text, because page
 * questions and "follow along" refer to page numbers. A line with only --- starts a new page;
 * long stretches are also split, at a paragraph, line or word where possible.
 */
export function splitPages(text: string, size = PAGE_SIZE): string[] {
  const pages: string[] = [];
  for (const section of text.replace(/\r\n?/g, '\n').split(/^[ \t]*---[ \t]*$/m)) {
    let rest = section.trim();
    while (rest.length > size) {
      const window = rest.slice(0, size + 1);
      let cut = -1;
      for (const mark of ['\n\n', '\n', ' ']) {
        const at = window.lastIndexOf(mark);
        // a break very early would leave a nearly empty page
        if (at > size / 2) { cut = at; break; }
      }
      if (cut < 0) cut = size;
      pages.push(rest.slice(0, cut).trim());
      rest = rest.slice(cut).trim();
    }
    if (rest) pages.push(rest);
  }
  return pages.length ? pages : [''];
}

/** Accepts a book's address from ANYFREEBOOK, or just its short name. */
export function bookSlug(input: string): string | null {
  const text = input.trim().split(/[?#]/)[0].replace(/\/+$/, '');
  const slug = text.match(/\/read\/([^/]+)$/)?.[1] ?? (text.includes('/') ? '' : text);
  return /^[a-z0-9][a-z0-9-]{0,200}$/i.test(slug) ? slug : null;
}
