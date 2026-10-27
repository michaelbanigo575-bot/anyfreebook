/**
 * The release history, as data.
 *
 * The site had no changelog, so a reader (or a crawler) could not tell what
 * the product actually does beyond the marketing pages. This file is the
 * single place that lists what shipped and when, and /changelog renders it.
 *
 * Entries are append-only: a new release is added at the top of the list.
 * Dates are the day the change went live on production, not the day it was
 * written — a changelog that lies about dates is worse than none.
 */

export interface ChangelogEntry {
  /** ISO date, YYYY-MM-DD. */
  date: string;
  /** Short title, shown as the entry heading. */
  title: string;
  /** What actually changed, in plain words. */
  changes: string[];
  /** Optional grouping label, e.g. "Search", "Creators". */
  area?: string;
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    date: '2026-10-27',
    area: 'Stability',
    title: 'The app no longer shows a raw client-side error',
    changes: [
      'Every route now has an error boundary, so a crash shows a page you can act on — retry, or go home — instead of Next.js’s "Application error: a client-side exception has occurred".',
      'Fixed the three real causes behind the crashes: the same ad slot being pushed to AdSense twice, a PDF page being rendered onto one canvas by two handlers at once, and a login cookie being written to the browser in two chunks of which only the second arrived.',
      'Errors are now reported to the server, so a crash is visible in the logs instead of only on your screen.',
    ],
  },
  {
    date: '2026-10-27',
    area: 'Creators',
    title: 'Publish with a cover image, and download what your readers read',
    changes: [
      'Publishers can upload a cover image when they publish. The image is stored with the publication and shown on its page.',
      'Every published book can be downloaded as an EPUB or as plain text, from a real download button on the reading page.',
      'A book published as an attached file downloads that file itself, so the file the author uploaded is the file the reader gets.',
    ],
  },
  {
    date: '2026-10-27',
    area: 'Classrooms',
    title: 'A class keeps its own history',
    changes: [
      'Every live session is recorded: how long it ran, how many people attended, and who they were.',
      'Signed-in attendees are listed by name. Visitors who did not sign in are listed by a stable anonymous id, so the same guest is recognisable across sessions.',
      'The host sees how much time each attendee spent in the class.',
    ],
  },
  {
    date: '2026-10-27',
    area: 'Institutions',
    title: 'Anyone can join an institution',
    changes: [
      'Visitors can now join an institution with one click and leave again when they want.',
      'Joining never changes an existing role, so it cannot demote an owner or grant admin rights.',
      'The institution page lists its members with their roles.',
    ],
  },
  {
    date: '2026-10-26',
    area: 'Search',
    title: 'A source that did not answer is no longer reported as zero results',
    changes: [
      'When an upstream source failed or rate-limited us, it used to be returned as "this source has zero matches" — which read as a real answer.',
      'Now every response says which sources failed and whether the result is partial, so an incomplete answer is never presented as a complete one.',
      'Sources that answer a failed request are retried twice before they are written off.',
    ],
  },
  {
    date: '2026-10-25',
    area: 'Search',
    title: 'Twelve live sources, and the website searches the same ones as the API',
    changes: [
      'Added OpenAlex, Wikisource, Europeana, Zenodo and the Open Textbook Library to the fan-out.',
      'The website’s own search now covers the same sources as the public API, so the two agree.',
      'A language category searches in its own language.',
    ],
  },
  {
    date: '2026-10-24',
    area: 'Developers',
    title: 'A public API and an npm client',
    changes: [
      'A versioned public API at /api/v1 with search, resolve and health endpoints. Every result carries a legal tier, so you know whether a title is really free to download before you link to it.',
      'A source registry at /api/v1/sources, so the documentation cannot drift from the code.',
      'A rate limiter that is enforced in the database rather than in memory.',
      'An npm client, `anyfreebook-cli`, for searching from a terminal.',
    ],
  },
  {
    date: '2026-10-24',
    area: 'Community',
    title: 'Reddit outreach that cannot post by itself',
    changes: [
      'Discovery, drafting and rules checking for Reddit communities, with a hard rule that nothing is ever posted automatically — every post is reviewed by a person first.',
      'Subreddit rules are read and recorded, because rules differ per community and are checked by hand.',
      'A rate limiter, a descriptive user agent, full disclosure and a minimum answer length, so the community side cannot become spam.',
    ],
  },
  {
    date: '2026-10-22',
    area: 'Mobile',
    title: 'The Android app and the installable site',
    changes: [
      'The site installs as an app on Android and iOS, and works offline from what it has already loaded.',
      'An Android App Bundle is signed and built from the same Next.js source, so the app and the site never drift apart.',
      'Digital Asset Links are set up, so the installed app opens as the real site.',
    ],
  },
  {
    date: '2026-10-21',
    area: 'Site',
    title: 'Installable, and honest about its own catalogue',
    changes: [
      'The site became a PWA: installable, offline-capable, and with a real app icon.',
      'The catalogue claims were replaced with numbers that were measured against the live sources on the day they were written.',
    ],
  },
];
