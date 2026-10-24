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
      'free books', 'free ebook', 'free ebooks', 'where to get books', 'public domain',
      'free pdf books', 'free textbook', 'library', 'pirate', 'open library',
      'gutenberg', 'internet archive', 'audiobook', 'free audiobook', 'study material',
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
      'free books', 'free ebook', 'reading list', 'what should i read', 'book recommendations',
      'public domain', 'classics', 'free novel', 'look for books', 'download books',
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
      'free textbooks', 'free textbook', 'study materials', 'free course', 'open course',
      'free curriculum', 'free resources', 'for students', 'for my class', 'free lectures',
      'openstax', 'ocw', 'khan academy',
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
    subreddit: 'Nigeria',
    purpose: 'Nigerians asking about free textbooks, WAEC and JAMB preparation.',
    intentKeywords: [
      'free books', 'textbook', 'waec', 'jamb', 'study materials', 'free novels',
      'nigerian literature', 'free pdf', 'download books', 'revision',
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
