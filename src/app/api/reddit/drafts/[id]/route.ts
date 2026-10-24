import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/guard';
import { markDiscarded, markSubmitted } from '@/lib/reddit/store';

export const dynamic = 'force-dynamic';

/**
 * Record what the operator did with a draft.
 *
 * "submitted" means a human pasted the reply into Reddit themselves. We
 * write a note in our own database so the same thread does not come back
 * tomorrow. There is no call to Reddit in this file, and there is no way to
 * make one from this app.
 */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { action?: string };
    const action = body.action;

    if (action !== 'submitted' && action !== 'discarded') {
      return NextResponse.json(
        { error: 'action must be "submitted" or "discarded"' },
        { status: 400 }
      );
    }

    if (action === 'submitted') {
      await markSubmitted(params.id);
    } else {
      await markDiscarded(params.id);
    }

    return NextResponse.json({ ok: true, action, posted: false });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error';
    console.error('[reddit-draft]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
