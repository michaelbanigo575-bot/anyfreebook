import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { getClassroomByCode } from '@/lib/classrooms/server';
import { ClassroomClient } from './ClassroomClient';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: { code: string } }): Promise<Metadata> {
  const room = await getClassroomByCode(params.code);
  if (!room) return {};
  return {
    title: `${room.title} — Live Class`,
    description: room.description || `A live class hosted by ${room.host?.display_name || 'an ANYFREEBOOK author'}.`,
    robots: room.visibility === 'private' ? { index: false, follow: false } : undefined,
  };
}

export default async function ClassroomPage({ params, searchParams }: { params: { code: string }; searchParams: { t?: string } }) {
  const room = await getClassroomByCode(params.code);
  if (!room) notFound();

  // Private rooms require the invite token in the URL (hosts always pass)
  let inviteToken = searchParams.t ?? null;
  let allowed = room.visibility !== 'private';
  if (!allowed) {
    const sb = createClient();
    const { data: ok } = await sb.rpc('classroom_access_ok', { p_code: room.room_code, p_token: inviteToken });
    allowed = ok === true;
    if (allowed && !inviteToken) {
      // Host opened their own private class without ?t= — fetch the token so the share link works
      const { data: inv } = await sb.from('classroom_invites').select('token').eq('classroom_id', room.id).maybeSingle();
      inviteToken = (inv as { token: string } | null)?.token ?? null;
    }
  }
  if (!allowed) {
    return (
      <div className="content-wrapper py-20 text-center max-w-md mx-auto">
        <p className="text-5xl mb-4">🔒</p>
        <h1 className="text-xl font-bold text-[var(--text)] mb-2">This is a private class</h1>
        <p className="text-sm text-[var(--text-muted)]">
          You need the invite link from the host to join. Ask them to share it with you.
        </p>
      </div>
    );
  }

  return <ClassroomClient room={room} inviteToken={inviteToken} />;
}
