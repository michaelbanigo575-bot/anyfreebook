/**
 * Builds a real draft against a fake thread and prints it, so the output can
 * be read and judged before anything is ever pasted into Reddit.
 *
 *   node --experimental-strip-types scripts/reddit-draft-sample.ts
 */
import { buildDraft } from '../src/lib/reddit/drafting.ts';
import { matchArticle } from '../src/lib/reddit/matching.ts';
import { REDDIT_TARGETS } from '../src/lib/reddit/targets.ts';

const samples = [
  {
    subreddit: 'freebooks',
    title: 'Where can I actually download free textbooks that are legal?',
    body: 'I keep finding sites that say free and then hit a login wall or an ebook that only exists in a pirated scan. Is there anything genuinely free and genuinely legal?',
  },
  {
    subreddit: 'freebooks',
    title: 'Is it legal to download books off the internet archive lending library?',
    body: 'Confused about what counts as borrowing versus downloading. What is actually public domain here?',
  },
  {
    subreddit: 'educational-tools',
    title: 'Free textbook recommendations for a first-year biology course?',
    body: 'Teaching a first-year biology module and the textbooks are expensive. Looking for something I can legally copy for 60 students.',
  },
  {
    subreddit: 'LocalLLaMA',
    title: 'What is the best local text-to-speech model that runs on CPU?',
    body: 'I need narration for a pipeline, but hosted TTS is too expensive per character. What runs on CPU with decent quality?',
  },
  {
    subreddit: 'Nigeria',
    title: 'Where do I get free WAEC past questions?',
    body: 'Everyone keeps posting links to PDFs of past papers. Are any of those legitimate, and is there an official free source?',
  },
];

for (const sample of samples) {
  const target = REDDIT_TARGETS.find((t) => t.subreddit === sample.subreddit);
  if (!target) {
    console.log(`no target for r/${sample.subreddit}`);
    continue;
  }

  const post = {
    product: target.product,
    subreddit: target.subreddit,
    redditId: 'sample',
    title: sample.title,
    body: sample.body,
    author: 'someone',
    url: 'https://www.reddit.com/example',
    permalink: '/r/example',
    createdUtc: new Date().toISOString(),
    score: 1,
    numComments: 0,
    intentScore: 60,
    intentSignals: [],
    status: 'new' as const,
  };

  const article = matchArticle(sample.title, sample.body, target.product);
  const { draft, policy } = buildDraft(post, target, { article });

  console.log('='.repeat(78));
  console.log(`r/${sample.subreddit} — ${sample.title}`);
  console.log(`article matched: ${article ? `${article.title} (${article.url})` : 'none — reply will be link-free'}`);
  console.log(`value ratio: ${draft.valueRatio}:1   ready: ${policy.ok}`);
  if (!policy.ok) console.log(`problems: ${policy.problems.join(' | ')}`);
  console.log('-'.repeat(78));
  console.log(draft.body);
  console.log();
}
