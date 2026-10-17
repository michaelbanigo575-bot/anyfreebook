import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { rateLimit, clientIp } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

/**
 * Pushes a study_plan_template's goal/category onto each selected student's
 * own study_plans row. study_plans RLS is owner-only (auth.uid() = user_id),
 * so a teacher writing into a student's row needs the service role — this
 * route re-verifies the caller is institution staff before doing so.
 */
export async function POST(request: NextRequest) {
  const rl = rateLimit(`assign-plan:${clientIp(request.headers)}`, 20, 60_000);
  if (!rl.ok) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

  const { templateId, studentIds } = await request.json().catch(() => ({}));
  if (typeof templateId !== 'string' || !Array.isArray(studentIds) || studentIds.length === 0) {
    return NextResponse.json({ error: 'Missing templateId or studentIds' }, { status: 400 });
  }

  const sb = createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  const { data: template } = await sb.from('study_plan_templates').select('institution_id, goal_books_per_week, focus_category').eq('id', templateId).single();
  if (!template) return NextResponse.json({ error: 'Template not found' }, { status: 404 });

  const { data: membership } = await sb
    .from('institution_members')
    .select('role')
    .eq('institution_id', template.institution_id)
    .eq('profile_id', user.id)
    .maybeSingle();
  if (!membership || !['owner', 'admin', 'teacher'].includes(membership.role)) {
    return NextResponse.json({ error: 'Not authorized to assign plans for this institution' }, { status: 403 });
  }

  // Only assign to students who are actually members of this institution.
  const { data: validStudents } = await sb
    .from('institution_members')
    .select('profile_id')
    .eq('institution_id', template.institution_id)
    .in('profile_id', studentIds);
  const validIds = (validStudents || []).map(r => r.profile_id);
  if (validIds.length === 0) return NextResponse.json({ error: 'No valid students in this institution' }, { status: 400 });

  const svc = createServiceClient();
  const rows = validIds.map(id => ({
    user_id: id,
    enabled: true,
    goal_books_per_week: template.goal_books_per_week,
    focus_category: template.focus_category,
    updated_at: new Date().toISOString(),
  }));
  const { error } = await svc.from('study_plans').upsert(rows, { onConflict: 'user_id' });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ assigned: validIds.length });
}
