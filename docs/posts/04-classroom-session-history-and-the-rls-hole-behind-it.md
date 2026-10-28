# Recording who was in the room: session history, two partial unique indexes, and the RLS hole it uncovered

A live classroom that keeps one row is not a classroom with history. It is a classroom with a current state. The difference shows up the week a teacher asks the question that actually matters: *who was in my session on the 14th, and for how long?*

We added that. Getting it right turned up two bugs worth writing down — one in the schema, because of how Postgres treats NULL in a unique index, and one in a row-level security policy that had been quietly handing anyone the keys to somebody else's institution.

## What "history" needs to answer

Three questions, and each one forces a different shape of data:

1. **How long did the session run?** — a session, with a start and an end.
2. **Who was there?** — one row per attendee per session.
3. **Was the same person there twice, or two different people?** — a stable identity for an attendee who never signed in.

The third question is the one that breaks the obvious design.

## Two tables, not one

```sql
create table if not exists public.classroom_sessions (
  id uuid default gen_random_uuid() primary key,
  classroom_id uuid references public.classrooms(id) on delete cascade not null,
  host_id uuid references public.profiles(id) on delete set null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  duration_seconds int,
  attendee_count int default 0,
  title text,
  created_at timestamptz default now()
);

create table if not exists public.classroom_session_attendance (
  id uuid default gen_random_uuid() primary key,
  session_id uuid references public.classroom_sessions(id) on delete cascade not null,
  classroom_id uuid references public.classrooms(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete set null,
  guest_id text,
  display_name text not null default 'Guest',
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  watch_seconds int default 0,
  check (user_id is not null or guest_id is not null)
);
```

The `check` constraint is the first statement of intent: an attendance row must identify *someone*. Either a signed-in profile, or a guest id. Not neither.

Note that `user_id` and `guest_id` are mutually exclusive in practice but not by constraint. That is deliberate, and it is the direct cause of the bug below.

## The bug: one composite unique index does not work

The natural instinct is one unique index over the whole identity triple:

```sql
-- WRONG. Do not do this.
create unique index uq_att on classroom_session_attendance(session_id, user_id, guest_id);
```

It looks correct. It enforces "one row per attendee per session" — except it does not, because in Postgres NULL never equals another NULL.

`NULL = NULL` evaluates to NULL, not to true. A unique index treats rows as duplicates only when the comparison is *true*. So a signed-in attendee, whose row is `(session_id, 'abc-123', NULL)`, can be inserted any number of times: the second row's `guest_id` is also NULL, and NULL is not equal to NULL, so the index sees no conflict.

In practice that means every reconnect — every refresh, every flaky network, every tab opened twice — adds another row for the same person. The attendance count inflates, the list of names fills with duplicates, and nothing errors. It fails silently, which is the worst way for it to fail.

The fix is two partial unique indexes, one per identity kind:

```sql
create unique index if not exists uq_class_sess_att_user
  on public.classroom_session_attendance(session_id, user_id)
  where user_id is not null;

create unique index if not exists uq_class_sess_att_guest
  on public.classroom_session_attendance(session_id, guest_id)
  where guest_id is not null;
```

Each index covers only the rows it applies to. The `where` clause is what makes the NULL problem disappear: rows with a NULL `user_id` are not in the user index at all, so they cannot conflict there, and the guest index handles them with a real, non-NULL value.

The client has to match, which means the upsert conflict target is chosen at runtime:

```ts
// Signed-in attendees are keyed on user_id, anonymous ones on guest_id.
// A single composite conflict target would not work, because a NULL
// guest_id never equals another NULL and would insert a duplicate row
// on every reconnect.
const conflict = user ? 'session_id,user_id' : 'session_id,guest_id';

await sb.from('classroom_session_attendance').upsert(
  { session_id, classroom_id, user_id: user?.id ?? null, guest_id: user ? null : getGuestId(), display_name },
  { onConflict: conflict }
);
```

## The anonymous attendee needs a stable identity

A signed-in attendee has a profile id, so their identity is free. An anonymous visitor does not, and "the person who was there" has to mean something across two separate sessions a week apart.

The answer is a random id kept in `localStorage`:

```ts
export function getGuestId(): string {
  const KEY = 'afb_guest_id';
  if (typeof window === 'undefined') return 'guest-server';
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = `g_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
    localStorage.setItem(KEY, id);
  }
  return id;
}
```

It is not a fingerprint, not a tracking identifier, and not derived from anything about the person. It is a handle so that the same anonymous browser looks like the same attendee next time, and so that the host sees "g_k3f9x2ab" rather than a new stranger every class.

The host panel shows the display name where there is one and marks the rest as a guest, so nobody is misled about who actually signed up.

## Let the database own the derived numbers

Two fields on the session row are derived: how long it ran, and how many people attended. The obvious implementation computes them in the browser, and the obvious implementation is wrong — a browser that closes, a tab that is killed, or a client that simply forgets produces a session with a wrong duration or a wrong count, and there is nothing to compare against.

Two triggers instead:

```sql
-- Keep the denormalised counter true whenever an attendee row changes.
create or replace function public.bump_classroom_session_counts() returns trigger as $$
declare
  v_session uuid := coalesce(new.session_id, old.session_id);
begin
  update public.classroom_sessions
  set attendee_count = (
        select count(*)::int from public.classroom_session_attendance where session_id = v_session
      )
  where id = v_session;
  return null;
end; $$ language plpgsql security definer;

-- Fill in the duration when a session ends.
create or replace function public.set_classroom_session_duration() returns trigger as $$
begin
  if new.ended_at is not null and (new.duration_seconds is null or new.duration_seconds = 0) then
    new.duration_seconds := greatest(0, extract(epoch from (new.ended_at - new.started_at))::int);
  end if;
  return new;
end; $$ language plpgsql;
```

The duration trigger is `before update`, so it writes into the row that is being updated. The count trigger is `after insert or delete` on the attendance table and re-derives the count. `security definer` matters here: the trigger updates `classroom_sessions`, and without it the update would run as the invoking user, who may well not be allowed to write session rows.

The client then only has to write `ended_at` and let the database work out the rest:

```ts
export async function endClassroomSession(sessionId: string): Promise<{ error: string | null }> {
  const sb = createClient();
  const { error } = await sb.from('classroom_sessions')
    .update({ ended_at: new Date().toISOString() })
    .eq('id', sessionId);
  return { error: error?.message ?? null };
}
```

Verified against production: a seeded 42-minute session with two signed-in attendees and one guest came back as `duration_seconds: 2520` and `attendee_count: 3`, both written by the triggers rather than by the client.

## The hole: "self-join" was "take over"

The other half of this change was letting a reader join an institution without an invite. The existing policy on `institution_members` looked like this:

```sql
create policy "admins add members" on public.institution_members
  for insert with check (auth.uid() = profile_id);
```

Read it carefully. It permits an insert when the row's `profile_id` is the current user — and says nothing at all about the `role` column. The role is attacker-controlled data in that row.

So any signed-in user could insert themselves into any institution with `role = 'owner'`. Not "join" — take over. The owner of the institution would then find their own institution controlled by a stranger, and every downstream permission check that trusts the owner role would be answering for the wrong person.

The fix is to constrain the role in the same policy, so that a self-insert can only ever be a student:

```sql
create policy "admins add members" on public.institution_members
  for insert with check (
    (
      auth.uid() = profile_id
      and role = 'student'
    )
    or exists (select 1 from public.institutions i where i.id = institution_id and i.owner_id = auth.uid())
    or exists (
      select 1 from public.institution_members m
      where m.institution_id = institution_members.institution_id
        and m.profile_id = auth.uid()
        and m.role in ('owner','admin')
    )
  );
```

The three branches are: you are joining yourself, and only as a student; or you own the institution; or you are an owner or admin of it. Owners and admins are still added by owners and admins. Nobody can grant themselves a role they were not given.

There is a matching change in the client, because the database rule is not the whole story. The client must not *upsert* on join:

```ts
// Joining never upserts: an existing membership is left exactly as it is, so
// a self-join cannot demote an owner or re-grant a role.
```

An upsert here would take the row for an existing owner and write `role = 'student'` over it — not a takeover, but a self-inflicted demotion, and in a school that is just as broken. The database policy says what a *new* row may contain; the client decides whether it is writing a new row at all.

This is the general shape of RLS work: the policy constrains the row, and the client constrains the write. Both have to agree, or the stricter one is either bypassed or useless.

## What the host sees

The host-only panel lists each session newest-first with its duration, its attendance count, the number of unique people across the class's history, the total time taught, and per attendee the display name, their minutes in the room, and whether they were signed in or a guest:

```
📊 Class history

  Sessions   Attendances   Unique people   Time taught
     3            47            31           6h 12m

  Mon, 27 Oct, 14:00
  42m · 3 attendees
    Amara Okonkwo            38m
    tunde_a                   41m
    g_k3f9x2ab   guest         12m
```

Attendee rows are readable by anyone who can see the classroom, because the history is not private information — it is the class roster. Only the host can write to it, and only the host can correct a display name.

## The takeaways

1. **A unique index over a nullable column is not a uniqueness constraint.** NULL is not equal to NULL, so a composite unique over `(session_id, user_id, guest_id)` permits unlimited duplicate rows for signed-in users. Use partial unique indexes, one per identity kind.
2. **Derive, do not trust.** Duration and attendance count belong in triggers. A browser cannot be relied on to report how long a class lasted, and a derived number that lives only in client memory cannot be audited.
3. **Read your own policies as an attacker would.** "You may insert a row where you are the subject" is a statement about *who*, not about *what*. If the row carries a role, the role has to be in the policy too.
4. **The strictest layer is only as good as the layer above it.** A policy that forbids self-promotion is defeated by a client that upserts. Write both, and check that they agree.

The whole change is about a teacher being able to answer "who was actually there" without guessing. That answer is only worth anything if the database will not let it be faked, and the schema that stores it will not quietly duplicate a person's attendance every time they reconnect.
