/**
 * Checks the anti-ban policy actually rejects bad drafts.
 *
 * Run with: node --experimental-strip-types scripts/reddit-policy-check.ts
 */
import { checkDraftPolicy, valueRatioOf, wordCount, MIN_VALUE_RATIO } from '../src/lib/reddit/policy.ts';

let failures = 0;
function check(name: string, condition: boolean, detail = '') {
  if (condition) {
    console.log(`  ok   ${name}`);
  } else {
    console.log(`  FAIL ${name}${detail ? ' — ' + detail : ''}`);
    failures++;
  }
}

console.log('policy module:');

// A short, link-only reply must fail.
const thin = checkDraftPolicy({
  answerBody: 'Just use Anyfreebook, it is great.',
  mentionBody: 'Full disclosure: I built Anyfreebook (https://anyfreebook.com).',
  subreddit: 'freebooks',
  linksAllowed: true,
  disclosure: 'Full disclosure: I built Anyfreebook.',
});
check('short answer rejected', !thin.ok, JSON.stringify(thin.problems));
check('short answer flagged as too short', thin.problems.some((p) => p.includes('minimum')));

// A long answer with a short mention must pass.
const longAnswer =
  'Project Gutenberg has around 79,000 public-domain ebooks and needs no account at all. ' +
  'Standard Ebooks takes the same corpus and produces properly typeset editions that read like real books. ' +
  'Open Library is the catalogue layer, useful for finding which edition of a title is actually free. ' +
  'The Internet Archive has the largest collection of scanned books, but a lot of it is lending-only rather than downloadable, ' +
  'which is the distinction most people get wrong. DOAJ and PubMed Central are both genuinely free as PDF for academic work, ' +
  'and LibriVox has the public-domain catalogue as volunteer-read audiobooks. The thing worth learning early is that ' +
  'free to read, free to download and free to borrow are three different rights and need three different links.';
const mention = 'Full disclosure: I built Anyfreebook (https://anyfreebook.com).';

const good = checkDraftPolicy({
  answerBody: longAnswer,
  mentionBody: mention,
  subreddit: 'freebooks',
  linksAllowed: true,
  disclosure: 'Full disclosure: I built Anyfreebook.',
});
const ratio = valueRatioOf(longAnswer, mention);
check('long answer passes', good.ok, JSON.stringify(good.problems));
check('ratio meets the floor', ratio >= MIN_VALUE_RATIO, `ratio=${ratio}`);
console.log(`       ratio ${ratio}:1 (answer ${wordCount(longAnswer)} words, mention ${wordCount(mention)} words)`);

// Missing disclosure must fail even with a great answer.
const noDisclosure = checkDraftPolicy({
  answerBody: longAnswer,
  mentionBody: 'I built Anyfreebook, it searches those sources live.',
  subreddit: 'freebooks',
  linksAllowed: true,
  disclosure: '',
});
check('missing disclosure rejected', !noDisclosure.ok);
check('disclosure problem named', noDisclosure.problems.some((p) => p.includes('disclosure')));

// A link in a no-links subreddit must fail.
const noLinks = checkDraftPolicy({
  answerBody: longAnswer,
  mentionBody: 'Full disclosure: I built Anyfreebook (https://anyfreebook.com).',
  subreddit: 'somewhere-strict',
  linksAllowed: false,
  disclosure: 'Full disclosure: I built Anyfreebook.',
});
check('link in a no-links subreddit rejected', !noLinks.ok);
check('link problem named', noLinks.problems.some((p) => p.includes('does not allow links')));

console.log(failures === 0 ? '\nALL POLICY CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
