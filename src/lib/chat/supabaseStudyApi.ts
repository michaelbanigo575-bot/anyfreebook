'use client';

import { createClient } from '@/lib/supabase/client';
import { NOTHING_NOW, type StudyAnswer, type StudyApi, type StudyItem, type StudyQuestion } from './study';

type Row = Record<string, unknown>;

/** The live Study Room data. Everything goes through database functions that check who is asking. */
export function supabaseStudyApi(): StudyApi {
  const sb = createClient();
  async function call<T = unknown>(name: string, args: Record<string, unknown>): Promise<T> {
    const { data, error } = await sb.rpc(name, args);
    if (error) throw new Error(error.message);
    return data as T;
  }
  const rows = async (name: string, args: Record<string, unknown>) => (await call<Row[] | null>(name, args)) || [];
  const run = async (name: string, args: Record<string, unknown>) => { await call(name, args); };

  return {
    async shelf(g) {
      return (await rows('chat_study_shelf', { p_group: g })).map((r): StudyItem => ({
        id: String(r.item_id), kind: r.kind as StudyItem['kind'], title: String(r.title), slug: (r.slug as string) || null,
        addedBy: String(r.added_by_name), canRemove: !!r.can_remove, openQuestions: Number(r.open_questions || 0),
      }));
    },
    read: (g, item) => call<string>('chat_study_read', { p_group: g, p_item: item }),
    addNote: (g, title, body) => call<string>('chat_study_add_note', { p_group: g, p_title: title, p_body: body }),
    addBook: (g, slug) => call<string>('chat_study_add_book', { p_group: g, p_slug: slug }),
    removeItem: (g, item) => run('chat_study_remove_item', { p_group: g, p_item: item }),
    async questions(g, item) {
      return (await rows('chat_study_questions_for', { p_group: g, p_item: item })).map((r): StudyQuestion => ({
        id: String(r.question_id), page: Number(r.page), body: String(r.body), author: (r.author_name as string) ?? null,
        mine: !!r.mine, answered: !!r.answered, canRemove: !!r.can_remove, canResolve: !!r.can_resolve,
        answers: (r.answers as StudyAnswer[]) || [],
      }));
    },
    ask: (g, item, page, body, anonymous) => run('chat_study_ask', { p_group: g, p_item: item, p_page: page, p_body: body, p_anonymous: anonymous }),
    answer: (g, question, body) => run('chat_study_answer', { p_group: g, p_question: question, p_body: body }),
    resolve: (g, question, answered) => run('chat_study_resolve', { p_group: g, p_question: question, p_answered: answered }),
    removePost: (g, question, answer) => run('chat_study_remove_post', { p_group: g, p_question: question, p_answer: answer }),
    report: (g, kind, target, reason, details) => run('chat_study_report', { p_group: g, p_kind: kind, p_target: target, p_reason: reason, p_details: details }),
    async now(g) {
      const [r] = await rows('chat_study_now', { p_group: g });
      if (!r) return NOTHING_NOW;
      return {
        presenter: (r.presenter_name as string) || null, iPresent: !!r.i_present, itemId: (r.item_id as string) || null, page: Number(r.page || 1),
        timer: r.timer_kind ? { kind: r.timer_kind as 'focus' | 'break', secondsLeft: Number(r.seconds_left || 0) } : null,
      };
    },
    present: (g, item, page) => run('chat_study_present', { p_group: g, p_item: item, p_page: page }),
    stopPresenting: g => run('chat_study_stop_presenting', { p_group: g }),
    timer: (g, kind, minutes) => run('chat_study_timer', { p_group: g, p_kind: kind, p_minutes: minutes }),
  };
}
