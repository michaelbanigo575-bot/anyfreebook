import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * ICE server config for classroom WebRTC.
 *
 * Always returns public STUN. When TURN relay credentials are configured
 * (free 50GB/mo at dashboard.metered.ca — set the three env vars below in
 * Vercel), the relay is included automatically and classrooms start working
 * on strict carrier NATs with no code change.
 *
 *   TURN_URLS        e.g. "turn:a.relay.metered.ca:80,turn:a.relay.metered.ca:443,turns:a.relay.metered.ca:443?transport=tcp"
 *   TURN_USERNAME
 *   TURN_CREDENTIAL
 */
export async function GET() {
  // Preferred: Cloudflare TURN. The long-lived key never leaves the server; each
  // visitor gets short-lived relay credentials generated on demand.
  const keyId = process.env.TURN_KEY_ID;
  const keyToken = process.env.TURN_KEY_API_TOKEN;
  if (keyId && keyToken) {
    try {
      const res = await fetch(`https://rtc.live.cloudflare.com/v1/turn/keys/${keyId}/credentials/generate-ice-servers`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${keyToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ttl: 6 * 60 * 60 }),
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) {
        const data = (await res.json()) as { iceServers?: RTCIceServer[] };
        if (Array.isArray(data.iceServers) && data.iceServers.length > 0) {
          // Short-lived credentials: must not be cached by shared caches
          return NextResponse.json({ iceServers: data.iceServers, relay: true }, { headers: { 'Cache-Control': 'private, no-store' } });
        }
      }
    } catch { /* fall through to STUN-only / static TURN */ }
  }

  const iceServers: RTCIceServer[] = [
    { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
    { urls: 'stun:stun.cloudflare.com:3478' },
  ];

  const urls = process.env.TURN_URLS;
  if (urls && process.env.TURN_USERNAME && process.env.TURN_CREDENTIAL) {
    iceServers.push({
      urls: urls.split(',').map(u => u.trim()).filter(Boolean),
      username: process.env.TURN_USERNAME,
      credential: process.env.TURN_CREDENTIAL,
    });
  }

  return NextResponse.json(
    { iceServers, relay: !!urls },
    { headers: { 'Cache-Control': 'public, max-age=300' } }
  );
}
