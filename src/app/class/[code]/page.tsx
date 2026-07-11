import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
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

  // Private rooms require the invite token in the URL
  if (room.visibility === 'private' && searchParams.t !== room.invite_token) {
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

  return <ClassroomClient room={room} inviteToken={searchParams.t ?? null} />;
}
