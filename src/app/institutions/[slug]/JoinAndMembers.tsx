'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { joinInstitution, leaveInstitution, getMembers, type InstitutionMember } from '@/lib/institutions/client';
import { createClient } from '@/lib/supabase/client';

/**
 * Join / leave controls and the public member list for an institution.
 *
 * Anyone signed in can be part of an institution without waiting for an
 * invite: joining adds them as a 'student' member, which is what the RLS
 * policy "admins add members" allows for `auth.uid() = profile_id`. Leaving
 * removes their own row, which the policy "admins or self remove members"
 * allows.
 *
 * The member list is fetched on the client because the public page is a server
 * component and the membership changes as people join.
 */
export function InstitutionJoin({
  institutionId,
  slug,
  initialRole,
}: {
  institutionId: string;
  slug: string;
  initialRole: string | null;
}) {
  const [role, setRole] = useState<string | null>(initialRole);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const [members, setMembers] = useState<InstitutionMember[] | null>(null);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const list = await getMembers(institutionId);
      if (cancelled) return;
      setMembers(list);
      // If the server could not resolve a role (not signed in), the member
      // list still loads, so we can tell "signed out" from "not a member".
      if (initialRole === null) {
        try {
          const { data } = await createClient().auth.getUser();
          if (!cancelled) setSignedIn(Boolean(data?.user));
        } catch {
          if (!cancelled) setSignedIn(false);
        }
      } else {
        setSignedIn(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [institutionId, initialRole]);

  const refresh = async () => {
    const list = await getMembers(institutionId);
    setMembers(list);
  };

  const onJoin = async () => {
    setBusy(true);
    setMessage(null);
    const { error } = await joinInstitution(institutionId);
    if (error) {
      setMessage({ text: error, error: true });
    } else {
      setRole('student');
      setMessage({ text: 'You are now a member of this institution.', error: false });
      await refresh();
    }
    setBusy(false);
  };

  const onLeave = async () => {
    setBusy(true);
    setMessage(null);
    const { error } = await leaveInstitution(institutionId);
    if (error) {
      setMessage({ text: error, error: true });
    } else {
      setRole(null);
      setMessage({ text: 'You have left this institution.', error: false });
      await refresh();
    }
    setBusy(false);
  };

  const isMember = role !== null;

  return (
    <div className="mb-10">
      <div className="flex flex-wrap items-center gap-3">
        {isMember ? (
          <>
            <Link
              href={`/institutions/${slug}/dashboard`}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)] text-white text-sm font-semibold hover:shadow-lg transition-all"
            >
              Go to dashboard
            </Link>
            <button
              type="button"
              onClick={onLeave}
              disabled={busy}
              className="px-4 py-2.5 rounded-xl border border-[var(--border)] text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] transition-all disabled:opacity-60"
            >
              {busy ? 'Leaving…' : 'Leave'}
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={onJoin}
            disabled={busy}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)] text-white text-sm font-semibold hover:shadow-lg transition-all disabled:opacity-60"
          >
            {busy ? 'Joining…' : 'Join this institution'}
          </button>
        )}

        {signedIn === false && (
          <Link href="/login" className="text-sm text-[var(--primary)] hover:underline">
            Sign in to join
          </Link>
        )}
      </div>

      {message && (
        <p
          role="status"
          className={`mt-3 text-sm ${message.error ? 'text-red-500' : 'text-[var(--text-secondary)]'}`}
        >
          {message.text}
        </p>
      )}

      {members && members.length > 0 && (
        <section className="mt-8">
          <h2 className="text-sm font-bold uppercase tracking-widest text-[var(--text-muted)] mb-3">
            Members ({members.length})
          </h2>
          <ul className="flex flex-wrap gap-2">
            {members.map((m) => {
              const name = m.profile?.display_name || m.profile?.email || 'Member';
              return (
                <li
                  key={m.id}
                  className="px-3 py-1.5 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)]"
                >
                  {name}
                  {m.role !== 'student' && (
                    <span className="ml-1.5 text-[10px] uppercase tracking-wide text-[var(--primary)]">
                      {m.role}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
