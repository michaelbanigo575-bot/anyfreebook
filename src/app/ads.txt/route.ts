import { NextResponse } from 'next/server';

export async function GET() {
  const clientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;
  if (!clientId) {
    return new NextResponse('', { status: 200, headers: { 'Content-Type': 'text/plain' } });
  }

  const pubId = clientId.replace('ca-pub-', 'pub-');
  const body = `google.com, ${pubId}, DIRECT, f08c47fec0942fa0`;

  return new NextResponse(body, { status: 200, headers: { 'Content-Type': 'text/plain' } });
}
