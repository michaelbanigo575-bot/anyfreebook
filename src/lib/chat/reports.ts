import { REPORT_REASONS, type ReportReason } from './types';

/** The moderation queue: what the admin page shows and what it may change. */
export const REPORT_STATUSES = ['open', 'reviewed', 'closed'] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

/** These are looked at first: they can mean someone is at risk right now. */
export const URGENT: ReportReason[] = ['underage', 'sexual'];

/**
 * The open queue. Urgent reports are fetched on their own and fill the page first, so a new urgent
 * report is never stuck behind a long line of older ones. Each group is oldest first.
 */
export async function openQueue<T>(fetchGroup: (urgent: boolean, limit: number) => Promise<T[]>, pageSize: number): Promise<T[]> {
  const urgent = await fetchGroup(true, pageSize);
  const room = pageSize - urgent.length;
  return room > 0 ? urgent.concat(await fetchGroup(false, room)) : urgent;
}

export interface Suspension { userId: string; person: ReportPerson; reason: string; by: string; at: string }

export interface ReportRow {
  id: string;
  reporter_id: string | null;
  reported_id: string | null;
  reason: ReportReason;
  details: string;
  evidence: { id: number; sender_id: string; body: string; created_at: string }[] | null;
  status: ReportStatus;
  handled_by: string | null;
  handled_at: string | null;
  admin_note: string;
  created_at: string;
  /** Set for reports from a group or its Study Room. */
  group_id?: string | null;
}

export interface ReportedGroup { id: string; name: string; visibility: string; closed: boolean }

export interface ReportPerson { name: string; handle: string | null }

export interface Report {
  id: string;
  reason: string;
  urgent: boolean;
  details: string;
  status: ReportStatus;
  createdAt: string;
  handledBy: string | null;
  handledAt: string | null;
  note: string;
  reporter: ReportPerson;
  reported: ReportPerson;
  /** null when the account was deleted. */
  reportedId: string | null;
  /** Set while the reported person's chat is suspended. */
  suspension: Suspension | null;
  /** How many reports, in any state, name the same person. */
  reportsAboutPerson: number;
  messages: { id: number; from: 'reported' | 'reporter' | 'other'; body: string; at: string }[];
  /** null for one-to-one reports. A group that has since been deleted shows as closed. */
  group: ReportedGroup | null;
}

const GONE: ReportPerson = { name: 'Deleted account', handle: null };

/** Whose message this is. In a group, other members' messages can be part of the evidence. */
function sideOf(r: ReportRow, sender: string): 'reported' | 'reporter' | 'other' {
  if (r.reported_id && sender === r.reported_id) return 'reported';
  if (r.reporter_id && sender === r.reporter_id) return 'reporter';
  if (r.group_id) return 'other';
  // one to one with a deleted account: the other side's id still tells them apart
  return r.reported_id ? 'reporter' : 'reported';
}

export function shapeReports(rows: ReportRow[], people: Map<string, ReportPerson>, counts: Map<string, number>, suspended: Map<string, Suspension> = new Map(), groups: Map<string, ReportedGroup> = new Map()): Report[] {
  return rows
    .map((r): Report => ({
      id: r.id,
      reason: REPORT_REASONS.find(x => x.id === r.reason)?.label || r.reason,
      urgent: URGENT.includes(r.reason),
      details: r.details || '',
      status: r.status,
      createdAt: r.created_at,
      handledBy: r.handled_by,
      handledAt: r.handled_at,
      note: r.admin_note || '',
      reporter: (r.reporter_id && people.get(r.reporter_id)) || GONE,
      reported: (r.reported_id && people.get(r.reported_id)) || GONE,
      reportedId: r.reported_id,
      suspension: (r.reported_id && suspended.get(r.reported_id)) || null,
      reportsAboutPerson: (r.reported_id && counts.get(r.reported_id)) || 1,
      messages: (r.evidence || []).map(m => ({
        id: m.id,
        from: sideOf(r, m.sender_id),
        body: m.body,
        at: m.created_at,
      })),
      group: r.group_id ? groups.get(r.group_id) || { id: r.group_id, name: 'Removed group', visibility: '', closed: true } : null,
    }))
    // open reports: urgent first, then the longest waiting. Finished ones: newest first.
    .sort((a, b) => (a.status === 'open' && b.status === 'open'
      ? Number(b.urgent) - Number(a.urgent) || a.createdAt.localeCompare(b.createdAt)
      : b.createdAt.localeCompare(a.createdAt)));
}
