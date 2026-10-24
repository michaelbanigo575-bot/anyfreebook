# The Reddit system

Discovery, drafting and human review for Reddit. It **never posts**.

There is no code in this repository that submits a comment to Reddit, and no
API route that can be made to. That is the design, not a limitation. Reddit
bans accounts for behaviour that looks like spam, and the reliable way to stay
under the line is to have a person in the loop on every single reply.

## How it works

```
your machine                  the site                    you
─────────────                  ──────                    ───
reddit-discover.mjs  ──────▶  /api/reddit/ingest  ──▶  /admin/reddit
  (read-only fetch)              (score + draft)         (read, edit, copy)
                                          │                    │
                                          ▼                    ▼
                                    Supabase queue      you paste it in
```

1. **Discovery** runs on your machine. Reddit blocks datacenter IP ranges on
   its JSON endpoints, so a cron on Vercel gets a 403 and finds nothing. From
   a home connection it works. The script reads the newest threads in the
   subreddits we watch and hands them to the site.
2. **Scoring and drafting** happen on the site, in one place, so there is only
   ever one implementation of the rules.
3. **You** read the draft, check the subreddit's rules, copy it, paste it into
   Reddit yourself, then mark it submitted so the same thread does not come
   back tomorrow.

## Setup

### 1. Apply the migration

Paste `supabase/migrations/013_reddit.sql` into the Supabase SQL editor for
project `ichmkzwjaftteyzrbwji`. It creates four tables: `reddit_targets`,
`reddit_posts`, `reddit_drafts` and `reddit_events`. All service-role only.

### 2. Set the ingest secret

Add to `.env.local` **and** to the Vercel environment variables:

```
REDDIT_INGEST_SECRET=<any long random string>
```

This is what lets your local script hand threads to the site. It is not a
Reddit credential and it grants no ability to post.

### 3. Run discovery

```bash
node scripts/reddit-discover.mjs --dry-run     # show what it would read
node scripts/reddit-discover.mjs                # read and ingest
node scripts/reddit-discover.mjs --product anyfreebook
node scripts/reddit-discover.mjs --subreddit freebooks
```

The script waits at least a minute between subreddits and reads at most five a
day. Both limits are enforced again on the server, counting from the
database, so restarting the process does not reset them.

### 4. Review

Open `/admin/reddit`. Each draft shows the reply, the value ratio, and the
list of checks to do before you post. Copy it, paste it into Reddit, click
"I posted this".

## The rules the code enforces

These are in `src/lib/reddit/policy.ts` and they are enforced at the point of
action, not left to whoever runs it today.

| Rule | Where |
|---|---|
| No call to a Reddit write endpoint, ever | there is no such function |
| Max 5 subreddits read per day | `MAX_SUBREDDITS_PER_DAY` |
| Max 3 per product per day | `MAX_SUBREDDITS_PER_PRODUCT_PER_DAY` |
| At least 60 seconds between requests | `MIN_REQUEST_INTERVAL_MS` |
| A descriptive User-Agent naming us | `USER_AGENT` |
| Full disclosure in every draft that mentions us | `checkDraftPolicy` |
| At least 9:1 answer words to mention words | `MIN_VALUE_RATIO` |
| At least 60 words of answer | `MIN_ANSWER_WORDS` |
| At most 45 words of product mention | `checkDraftPolicy` |
| No link in a subreddit that does not allow links | `checkDraftPolicy` |

`scripts/reddit-policy-check.ts` tests these. Run it with:

```bash
node --experimental-strip-types scripts/reddit-policy-check.ts
```

## The reply format

Every draft is the same three-part shape:

1. **The answer.** The actual information the person asked for. This is the
   bulk of the reply and it comes first.
2. **The honest insight.** How it actually works, including the caveat that
   trips people up — that "free to read", "free to download" and "free to
   borrow" are three different rights.
3. **The product**, briefly, ending with the disclosure line.

The answer text is not generated. It comes from templates written from things
that are actually true about these sources. A draft that reads like a person
wrote it is the whole point; a generic paragraph saying "there are many great
free resources" is worse than no reply.

The mention is the smallest part that can still be honest:

> Full disclosure: I built Anyfreebook (https://anyfreebook.com). It searches
> those sources live and marks each title as a real download, a borrow-only
> copy, or a catalogue record.

## Linking an article instead of the homepage

The article is the value; the product is the byline. `src/lib/reddit/matching.ts`
picks a blog post that genuinely covers the thread's topic, using the explicit
topic map in `src/lib/reddit/articleTopics.ts`.

Word overlap alone cannot do this — a thread about a first-year biology course
overlaps heavily with the business-book article on "free", "first" and "books".
So each article declares the topics it covers, and a thread has to mention one
of them. If nothing matches, the reply is link-free, which is often the
right answer.

The matcher is deliberately conservative: a wrong link is worse than no link,
because the link is the part that looks like promotion.

## The communities we watch

Five per product, in `src/lib/reddit/targets.ts`.

**Anyfreebook** — r/freebooks, r/reading, r/educational-tools, r/SideProject,
r/Nigeria

**AfriStudio** — r/LocalLLaMA, r/ContentCreators, r/ArtificialInteligence,
r/SaaS, r/FlutterDev

The rules columns are `null` until a human confirms them, and `null` means
"nobody has checked" — not "no restriction". A draft cannot be marked ready
while its subreddit's rules are unverified, and anything older than a month
needs re-reading, because Reddit changes its rules without notice.

## What this system will not do

- Post, comment, vote, message, upvote or downvote on Reddit.
- Run more than five reads a day, or read the same subreddit twice in a day.
- Post a draft that fails the policy check.
- Link the homepage when a relevant article exists, or link an article that
  does not cover the question.

If you want to add any of those, that is a decision for you to make
deliberately, in writing, with the ban risk in mind — not a config flag.
