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
