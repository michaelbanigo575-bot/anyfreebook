import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * Returns the video room URL for a classroom.
 *
 * Provider selection:
 *  - DAILY_API_KEY set  => Daily.co room (created on demand). Nobody has to
 *    sign in — not even the host. The host additionally gets an owner token
 *    (kick/mute powers, no prejoin friction).
 *  - no key             => Jitsi Meet fallback (meet.jit.si), which works with
 *    zero config but asks the first participant to authenticate.
 */

const DAILY_API = 'https://api.daily.co/v1';

async function ensureDailyRoom(apiKey: string, name: string): Promise<string | null> {
  const headers = { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' };

  const existing = await fetch(`${DAILY_API}/rooms/${name}`, { headers, signal: AbortSignal.timeout(8000) });
  if (existing.ok) return (await existing.json()).url;

  const created = await fetch(`${DAILY_API}/rooms`, {
    method: 'POST',
    headers,
    signal: AbortSignal.timeout(8000),
    body: JSON.stringify({
      name,
      privacy: 'public', // the room name embeds the class code; private classes share it only via invite link
      properties: {
        enable_screenshare: true,
        enable_chat: false, // we run our own class chat
        start_video_off: true,
        start_audio_off: true,
        enable_prejoin_ui: true,
        max_participants: 200,
      },
    }),
  });
  if (!created.ok) return null;
  return (await created.json()).url;
}

async function createOwnerToken(apiKey: string, roomName: string, userName: string): Promise<string | null> {
  const res = await fetch(`${DAILY_API}/meeting-tokens`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(8000),
    body: JSON.stringify({ properties: { room_name: roomName, is_owner: true, user_name: userName } }),
  });
  if (!res.ok) return null;
  return (await res.json()).token;
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const displayName = request.nextUrl.searchParams.get('name') || 'Student';
  if (!code || !/^[a-z0-9-]{3,60}$/.test(code)) {
    return NextResponse.json({ error: 'Invalid class code' }, { status: 400 });
  }

  const supabase = createClient();
  const { data: room } = await supabase
    .from('classrooms')
    .select('id, host_id, room_code')
    .eq('room_code', code)
    .single();
  if (!room) return NextResponse.json({ error: 'Class not found' }, { status: 404 });

  const jitsiUrl = `https://meet.jit.si/anyfreebook-${room.room_code}#userInfo.displayName="${encodeURIComponent(displayName)}"&config.prejoinConfig.enabled=true`;

  const apiKey = process.env.DAILY_API_KEY;
  if (!apiKey) return NextResponse.json({ provider: 'jitsi', url: jitsiUrl });

  const dailyName = `afb-${room.room_code}`.slice(0, 40);
  const roomUrl = await ensureDailyRoom(apiKey, dailyName);
  if (!roomUrl) return NextResponse.json({ provider: 'jitsi', url: jitsiUrl }); // Daily hiccup → degrade gracefully

  // Host gets an owner token (moderator powers). Identified via their session cookie.
  const { data: { user } } = await supabase.auth.getUser();
  let url = roomUrl;
  if (user && user.id === room.host_id) {
    const token = await createOwnerToken(apiKey, dailyName, displayName);
    if (token) url = `${roomUrl}?t=${token}`;
  }

  return NextResponse.json({ provider: 'daily', url });
}
