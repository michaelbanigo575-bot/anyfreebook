/**
 * The communities we watch.
 *
 * The rules columns are deliberately null where we have not confirmed them.
 * A null is not "no restriction" — it is "nobody has checked yet", and the
 * operator UI refuses to mark a draft ready while that is true. Reddit
 * changes its rules without notice, so anything older than a month has to be
 * re-read before we post.
 */

import type { RedditTarget } from './types';

export const REDDIT_TARGETS: RedditTarget[] = [
  // ------------------------------------------------------------ Anyfreebook
  {
    product: 'anyfreebook',
    subreddit: 'freebooks',
    purpose: 'People asking where to get genuinely free, legal ebooks.',
    intentKeywords: [
      'free book', 'free books', 'free ebook', 'free ebooks', 'free pdf', 'free pdf books',
      'free textbook', 'free textbooks', 'free novel', 'free novels', 'free audiobook',
      'free audiobooks', 'where to get books', 'where to download', 'where can i download',
      'download books', 'download a book', 'looking for a free', 'need a free',
      'public domain', 'public domain books', 'open access', 'open textbook',
      'open educational', 'free course material', 'free research papers', 'free papers',
      'free classic', 'free classics', 'online library', 'borrow books', 'audiobook',
      'study material', 'study materials', 'textbook alternatives', 'alternative to textbook',
      'library', 'pirate', 'open library', 'gutenberg', 'internet archive',
    ],
    linksAllowed: null,
    selfPromoThread: null,
    minAccountAgeDays: null,
    minKarma: null,
    rulesVerifiedAt: null,
    active: true,
  },
  {
    product: 'anyfreebook',
    subreddit: 'reading',
    purpose: 'Readers looking for something to read without paying.',
    intentKeywords: [
      'free book', 'free books', 'free ebook', 'free ebooks', 'free novel', 'free novels',
      'free audiobook', 'free audiobooks', 'reading list', 'what should i read',
      'book recommendations', 'book recommendation', 'looking for a book', 'need a new book',
      'public domain', 'public domain books', 'classics', 'free to read',
      'download books', 'look for books', 'online library', 'free classics',
    ],
    linksAllowed: null,
    selfPromoThread: null,
    minAccountAgeDays: null,
    minKarma: null,
    rulesVerifiedAt: null,
    active: true,
  },
  {
    product: 'anyfreebook',
    subreddit: 'educational-tools',
    purpose: 'Teachers and students looking for free course material.',
    intentKeywords: [
      'free textbook', 'free textbooks', 'textbook alternatives', 'alternative to textbook',
      'study materials', 'study material', 'free course', 'open course', 'open courseware',
      'free curriculum', 'free resources', 'for students', 'for my class', 'for my students',
      'free lectures', 'free lecture notes', 'course materials', 'open educational resources',
      'oer', 'openstax', 'ocw', 'khan academy', 'free worksheets', 'free slides',
      'cannot afford', "can't afford", 'too expensive', 'free learning materials',
    ],
    linksAllowed: null,
    selfPromoThread: null,
    minAccountAgeDays: null,
    minKarma: null,
    rulesVerifiedAt: null,
    active: true,
  },
  {
    product: 'anyfreebook',
    subreddit: 'SideProject',
    purpose: 'Developers showing what they built. Community feedback, not promotion.',
    intentKeywords: [
      'free books', 'book aggregator', 'open library', 'gutenberg', 'public domain',
      'ebook', 'i built', 'show hn', 'scraping', 'api', 'rate limit',
    ],
    linksAllowed: null,
    selfPromoThread: null,
    minAccountAgeDays: null,
    minKarma: null,
    rulesVerifiedAt: null,
    active: true,
  },
  {
    product: 'anyfreebook',
    subreddit: 'webdev',
    purpose:
      'Web developers with the same problems we solved: fanning a search across many upstreams, telling the user when an upstream failed, and shipping one codebase as both a PWA and a Play app.',
    intentKeywords: [
      // Deliberately specific. A bare "api" or "timeout" matches most threads
      // in r/webdev, and a reply to a thread about cinema listings would be
      // spam wearing our name. These are the phrases our articles actually
      // answer.
      'fan out', 'fan-out', 'multiple apis', 'third-party api', 'api aggregation',
      'partial results', 'failed sources', 'incomplete results', 'upstream failed',
      'rate limit', 'retry', 'backoff', 'parallel requests', 'aggregator',
      'digital asset links', 'trusted web activity', 'assetlinks', 'pwa',
      'play store', 'app bundle', 'service worker', 'web app manifest',
      'row level security', 'rls', 'unique index', 'partial index',
      'on conflict', 'upsert', 'postgres trigger', 'digital asset links fingerprint',
    ],
    linksAllowed: null,
    selfPromoThread: null,
    minAccountAgeDays: null,
    minKarma: null,
    rulesVerifiedAt: null,
    active: true,
  },
  {
    product: 'anyfreebook',
    subreddit: 'programming',
    purpose:
      'Working programmers asking about database and API design, especially Postgres constraints and multi-source backends.',
    intentKeywords: [
      'unique index', 'null', 'postgres', 'postgresql', 'database constraint',
      'row level security', 'rls', 'trigger', 'upsert', 'conflict target',
      'partial index', 'schema design', 'api design', 'error handling',
    ],
    linksAllowed: null,
    selfPromoThread: null,
    minAccountAgeDays: null,
    minKarma: null,
    rulesVerifiedAt: null,
    active: true,
  },
  {
    product: 'anyfreebook',
    subreddit: 'Postgres',
    purpose:
      'Postgres users with the exact questions our session-history schema raised: partial unique indexes over nullable columns, and what an RLS policy actually permits.',
    intentKeywords: [
      'unique index', 'null', 'partial index', 'upsert', 'on conflict',
      'row level security', 'rls', 'policy', 'trigger', 'constraint',
      'composite key', 'foreign key', 'postgres schema',
    ],
    linksAllowed: null,
    selfPromoThread: null,
    minAccountAgeDays: null,
    minKarma: null,
    rulesVerifiedAt: null,
    active: true,
  },
  {
    product: 'anyfreebook',
    subreddit: 'supabase',
    purpose:
      'Supabase users working with RLS policies, realtime presence and database triggers.',
    intentKeywords: [
      'supabase', 'rls', 'row level security', 'policy', 'realtime', 'presence',
      'postgres', 'trigger', 'auth', 'service role', 'anon key',
    ],
    linksAllowed: null,
    selfPromoThread: null,
    minAccountAgeDays: null,
    minKarma: null,
    rulesVerifiedAt: null,
    active: true,
  },
  {
    product: 'anyfreebook',
    subreddit: 'Nigeria',
    purpose: 'Nigerians asking about free textbooks, WAEC and JAMB preparation.',
    intentKeywords: [
      'free books', 'free book', 'free ebook', 'free ebooks', 'free pdf', 'free novels',
      'textbook', 'textbooks', 'waec', 'jamb', 'study materials', 'study material',
      'nigerian literature', 'download books', 'revision', 'past questions',
      'free course materials', 'free online books',
    ],
    linksAllowed: null,
    selfPromoThread: null,
    minAccountAgeDays: null,
    minKarma: null,
    rulesVerifiedAt: null,
    active: true,
  },

  // ------------------------------------------------------------- AfriStudio
  {
    product: 'afristudio',
    subreddit: 'LocalLLaMA',
    purpose: 'People running local models who want narration and text-to-speech.',
    intentKeywords: [
      'text to speech', 'tts', 'voice', 'narration', 'local voice', 'whisper',
      'voice cloning', 'offline voice', 'storyteller', 'audiobook ai', 'elevenlabs',
      'piper', 'coqui', 'xtts',
    ],
    linksAllowed: null,
    selfPromoThread: null,
    minAccountAgeDays: null,
    minKarma: null,
    rulesVerifiedAt: null,
    active: true,
  },
  {
    product: 'afristudio',
    subreddit: 'ContentCreators',
    purpose: 'Creators who need voice-overs and faceless video tooling.',
    intentKeywords: [
      'text to speech', 'voiceover', 'voice over', 'faceless video', 'faceless channel',
      'ai voice', 'narration', 'youtube automation', 'shorts automation', 'tts',
      'burned in captions', 'auto captions',
    ],
    linksAllowed: null,
    selfPromoThread: null,
    minAccountAgeDays: null,
    minKarma: null,
    rulesVerifiedAt: null,
    active: true,
  },
  {
    product: 'afristudio',
    subreddit: 'ArtificialInteligence',
    purpose: 'AI practitioners interested in the pipeline behind the tool.',
    intentKeywords: [
      'text to speech', 'tts model', 'voice synthesis', 'ai video', 'diffusion',
      'workflow', 'pipeline', 'api', 'open source',
    ],
    linksAllowed: null,
    selfPromoThread: null,
    minAccountAgeDays: null,
    minKarma: null,
    rulesVerifiedAt: null,
    active: true,
  },
  {
    product: 'afristudio',
    subreddit: 'SaaS',
    purpose: 'Builders talking about API costs, rate limits and pricing.',
    intentKeywords: [
      'api cost', 'rate limit', 'pricing', 'self hosted', 'open source', 'cost per',
      'credits', 'tts api', 'voice api', 'free tier',
    ],
    linksAllowed: null,
    selfPromoThread: null,
    minAccountAgeDays: null,
    minKarma: null,
    rulesVerifiedAt: null,
    active: true,
  },
  {
    product: 'afristudio',
    subreddit: 'FlutterDev',
    purpose: 'Flutter developers looking for narration in their apps.',
    intentKeywords: [
      'flutter', 'text to speech', 'tts', 'audio', 'plugin', 'package', 'speech',
      'narration', 'offline',
    ],
    linksAllowed: null,
    selfPromoThread: null,
    minAccountAgeDays: null,
    minKarma: null,
    rulesVerifiedAt: null,
    active: true,
  },
];

/** The product a subreddit is watched for. */
export function targetFor(subreddit: string, product?: RedditTarget['product']): RedditTarget | undefined {
  const lower = subreddit.toLowerCase().replace(/^\/?r\//, '');
  return REDDIT_TARGETS.find(
    (t) => t.subreddit.toLowerCase() === lower && (!product || t.product === product)
  );
}
