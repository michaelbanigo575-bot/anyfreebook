import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/guard';
import { createServiceClient } from '@/lib/supabase/server';
import { CHAT_ENABLED } from '@/lib/chat/types';
import { REPORT_STATUSES, URGENT, openQueue, shapeReports, type ReportPerson, type ReportRow, type ReportStatus, type ReportedGroup, type Suspension } from '@/lib/chat/reports';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PAGE = 50;
// Reports contain private messages: nothing here may be stored by a browser or a cache
const reply = (body: object, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } });

/** Checks the feature is on and the caller is an admin. Returns the admin, or the refusal to send. */
async function gate() {
  if (!CHAT_ENABLED) return { refusal: reply({ error: 'Not found' }, 404) };
  const admin = await requireAdmin();
  return admin ? { admin } : { refusal: reply({ error: 'Not allowed' }, 403) };
}

export async function GET(request: NextRequest) {
  const { refusal } = await gate();
  if (refusal) return refusal;
  const asked = request.nextUrl.searchParams.get('status') as ReportStatus;
  const status: ReportStatus = REPORT_STATUSES.includes(asked) ? asked : 'open';
  const sb = createServiceClient();

  const inStatus = () => sb.from('chat_reports').select('*').eq('status', status);
  let rows: ReportRow[];
  try {
    const take = async (query: PromiseLike<{ data: unknown; error: { message: string } | null }>) => {
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return (data || []) as ReportRow[];
    };
    rows = status === 'open'
      ? await openQueue<ReportRow>((urgent, limit) => take(
        (urgent ? inStatus().in('reason', URGENT) : inStatus().not('reason', 'in', `(${URGENT.join(',')})`))
          .order('created_at', { ascending: true }).limit(limit),
      ), PAGE)
      : await take(inStatus().order('created_at', { ascending: false }).limit(PAGE));
  } catch (e) {
    console.error('[chat-reports]', (e as Error).message);
    return reply({ error: 'Could not load reports. Has 021_chat.sql been run?' }, 500);
  }

  const [totals, held] = await Promise.all([
    Promise.all(REPORT_STATUSES.map(s => sb.from('chat_reports').select('id', { count: 'exact', head: true }).eq('status', s))),
    sb.from('chat_suspensions').select('user_id, reason, suspended_by, suspended_at').order('suspended_at', { ascending: false }).limit(200),
  ]);
  // without this list an admin could think a suspended person is free to chat, so failing is better
  if (held.error) {
    console.error('[chat-reports]', held.error.message);
    return reply({ error: 'Could not load suspensions. Try again.' }, 500);
  }
  const holds = (held.data || []) as { user_id: string; reason: string; suspended_by: string; suspended_at: string }[];

  const ids = Array.from(new Set([...rows.flatMap(r => [r.reporter_id, r.reported_id]), ...holds.map(h => h.user_id)].filter((x): x is string => !!x)));
  const reported = Array.from(new Set(rows.map(r => r.reported_id).filter((x): x is string => !!x)));
  const [profiles, history] = await Promise.all([
    ids.length ? sb.from('profiles').select('id, display_name, creator_handle').in('id', ids) : Promise.resolve({ data: [] }),
    reported.length ? sb.from('chat_reports').select('reported_id').in('reported_id', reported).limit(1000) : Promise.resolve({ data: [] }),
  ]);
  const people = new Map<string, ReportPerson>(
    ((profiles.data || []) as { id: string; display_name: string | null; creator_handle: string | null }[])
      .map(p => [p.id, { name: p.display_name || p.creator_handle || 'Reader', handle: p.creator_handle }]),
  );
  const counts = new Map<string, number>();
  for (const h of (history.data || []) as { reported_id: string }[]) counts.set(h.reported_id, (counts.get(h.reported_id) || 0) + 1);
  const suspensions: Suspension[] = holds.map(h => ({ userId: h.user_id, person: people.get(h.user_id) || { name: 'Reader', handle: null }, reason: h.reason, by: h.suspended_by, at: h.suspended_at }));

  const groupIds = Array.from(new Set(rows.map(r => r.group_id).filter((x): x is string => !!x)));
  const groups = new Map<string, ReportedGroup>();
  if (groupIds.length) {
    const found = await sb.from('chat_groups').select('id, name, visibility, closed_at').in('id', groupIds);
    // without this an open group could be shown as closed
    if (found.error) {
      console.error('[chat-reports]', found.error.message);
      return reply({ error: 'Could not load the reported groups. Try again.' }, 500);
    }
    for (const g of (found.data || []) as { id: string; name: string; visibility: string; closed_at: string | null }[]) {
      groups.set(g.id, { id: g.id, name: g.name, visibility: g.visibility, closed: !!g.closed_at });
    }
  }

  return reply({
    reports: shapeReports(rows, people, counts, new Map(suspensions.map(x => [x.userId, x])), groups),
    suspensions,
    totals: Object.fromEntries(REPORT_STATUSES.map((s, i) => [s, totals[i].count || 0])),
    pageSize: PAGE,
  });
}

/** A request from another website would carry a different Origin. */
function foreign(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  try { return new URL(origin).host !== request.headers.get('host'); } catch { return true; }
}

const REFUSALS: Record<string, [string, number]> = {
  'reason-required': ['Write a reason of at least 3 characters.', 400],
  'already-suspended': ['This person is already suspended.', 409],
  'not-suspended': ['This person is not suspended.', 409],
  'not-found': ['That account no longer exists.', 404],
};

/** Suspends or restores one person's chat, or closes a group. Who did it comes from the signed-in admin, never from the page. */
export async function POST(request: NextRequest) {
  const { admin, refusal } = await gate();
  if (refusal) return refusal;
  if (foreign(request)) return reply({ error: 'Not allowed' }, 403);

  const { userId, groupId, action, reason, reportId } = (await request.json().catch(() => ({}))) as { userId?: string; groupId?: string; action?: string; reason?: string; reportId?: string | null };
  if (action === 'close-group') {
    if (typeof groupId !== 'string' || !UUID.test(groupId) || typeof reason !== 'string' || (reportId != null && !UUID.test(String(reportId)))) {
      return reply({ error: 'Bad request' }, 400);
    }
    const closed = await createServiceClient().rpc('chat_admin_close_group', {
      p_group: groupId, p_reason: reason, p_admin: admin!.email, p_report: reportId || null,
    });
    if (!closed.error) return reply({ ok: true });
    const code = closed.error.message.match(/chat:([a-z-]+)/)?.[1];
    if (code === 'reason-required') return reply({ error: REFUSALS[code][0] }, 400);
    if (code === 'not-found') return reply({ error: 'This group is already closed or removed.' }, 409);
    console.error('[chat-reports]', closed.error.message);
    return reply({ error: 'Could not close the group.' }, 500);
  }
  if (typeof userId !== 'string' || !UUID.test(userId) || (action !== 'suspend' && action !== 'restore') || typeof reason !== 'string' || (reportId != null && !UUID.test(String(reportId)))) {
    return reply({ error: 'Bad request' }, 400);
  }
  if (action === 'suspend' && userId === admin!.id) return reply({ error: 'You can’t suspend your own account.' }, 400);

  const { error } = await createServiceClient().rpc('chat_admin_set_suspension', {
    p_user: userId, p_suspend: action === 'suspend', p_reason: reason, p_admin: admin!.email, p_report: reportId || null,
  });
  if (error) {
    const known = REFUSALS[error.message.match(/chat:([a-z-]+)/)?.[1] || ''];
    if (known) return reply({ error: known[0] }, known[1]);
    console.error('[chat-reports]', error.message);
    return reply({ error: 'Could not change the suspension.' }, 500);
  }
  return reply({ ok: true });
}

export async function PATCH(request: NextRequest) {
  const { admin, refusal } = await gate();
  if (refusal) return refusal;
  if (foreign(request)) return reply({ error: 'Not allowed' }, 403);

  const { id, status, note } = (await request.json().catch(() => ({}))) as { id?: string; status?: ReportStatus; note?: string };
  if (typeof id !== 'string' || !UUID.test(id) || !REPORT_STATUSES.includes(status as ReportStatus) || (note !== undefined && typeof note !== 'string')) {
    return reply({ error: 'Bad request' }, 400);
  }
  const { data, error } = await createServiceClient()
    .from('chat_reports')
    .update({
      status,
      handled_by: admin!.email,
      handled_at: new Date().toISOString(),
      ...(note !== undefined ? { admin_note: note.trim().slice(0, 1000) } : {}),
    })
    .eq('id', id)
    .select('id');
  if (error) {
    console.error('[chat-reports]', error.message);
    return reply({ error: 'Could not update the report.' }, 500);
  }
  return data?.length ? reply({ ok: true }) : reply({ error: 'Report not found' }, 404);
}
