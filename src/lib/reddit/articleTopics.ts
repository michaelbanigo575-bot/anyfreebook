/**
 * Topic map: what each blog post is actually the right answer to.
 *
 * Word overlap alone is not enough. A thread asking about "free textbooks for
 * a first-year biology course" overlaps heavily with the business-book article
 * on the words "free", "first" and "books" — and linking the wrong article is
 * worse than linking none, because the link is the only part that looks like
 * promotion.
 *
 * So each article gets the topics it actually covers. A thread has to mention
 * one of them, and if it does not, the reply is link-free.
 */

export interface ArticleTopic {
  slug: string;
  /** Lowercase terms. A phrase matches as a phrase; a word matches as a word. */
  topics: string[];
}

export const ARTICLE_TOPICS: ArticleTopic[] = [
  {
    slug: 'fanning-out-search-across-twelve-apis',
    topics: [
      'api', 'apis', 'parallel', 'fan out', 'fan-out', 'aggregation', 'aggregator',
      'multi-source', 'multiple sources', 'multiple apis', 'third-party api',
      'third-party apis', 'upstream', 'upstreams', 'timeout', 'timeouts',
      'retry', 'retries', 'backoff', 'rate limit', 'rate limits', 'partial results',
      'failed sources', 'empty result', 'empty results', 'graphql', 'rest api',
      'search api', 'api aggregation', 'microservice', 'reverse proxy',
      'one of several apis', 'several apis', 'multiple endpoints',
    ],
  },
  {
    slug: 'your-free-book-api-might-not-be-free',
    topics: [
      'licence', 'license', 'licensing', 'copyright', 'public domain', 'creative commons',
      'cc by', 'fair use', 'legal', 'piracy', 'pirated', 'piracy free', 'dmca',
      'open access', 'oa', 'open educational resources', 'oer', 'rights', 'attribution',
      'ebook legality', 'free books legal', 'borrowing', 'lending library', 'tier',
    ],
  },
  {
    slug: 'one-codebase-two-install-paths-pwa-and-twa',
    topics: [
      'pwa', 'trusted web activity', 'twa', 'bubblewrap', 'digital asset links',
      'assetlinks', 'play store', 'google play', 'android app', 'app bundle',
      'aab', 'keystore', 'signing key', 'fingerprint', 'service worker',
      'offline', 'installable', 'web app manifest', 'manifest.json', 'next.js pwa',
      'mobile app from website', 'splash screen',
    ],
  },
  {
    slug: 'classroom-session-history-and-the-rls-hole',
    topics: [
      'attendance', 'attendance tracking', 'classroom', 'session history', 'roster',
      'who attended', 'duration', 'elapsed time', 'tracking time', 'engagement',
      'unique index', 'unique indexes', 'null', 'nulls', 'partial index',
      'partial unique index', 'upsert', 'upserts', 'on conflict', 'conflict target',
      'row level security', 'rls', 'postgres policy', 'rls policy', 'trigger',
      'triggers', 'schema design', 'anonymous user', 'guest id', 'privacy',
      'supabase', 'next.js', 'attendance sheet', 'session table',
    ],
  },
  {
    slug: 'top-25-free-programming-books-2026',
    topics: ['programming', 'python', 'javascript', 'typescript', 'rust', 'golang', 'java', 'c++', 'linux', 'git', 'algorithms', 'web development'],
  },
  {
    slug: 'free-alternatives-campbell-biology',
    topics: ['biology', 'campbell', 'anatomy', 'genetics', 'ecology', 'molecular biology', 'cell biology', 'botany', 'zoology', 'biomedical'],
  },
  {
    slug: 'learn-machine-learning-free-reading-list',
    topics: ['machine learning', 'ml', 'deep learning', 'neural network', 'neural networks', 'ai', 'artificial intelligence', 'gradient descent', 'statistical learning'],
  },
  {
    slug: 'where-to-download-free-medical-textbooks',
    topics: ['medical', 'medicine', 'anatomy', 'pharmacology', 'pathology', 'clinical', 'nursing', 'pharmacy', 'mcat', 'usmle', 'histology', 'physiology', 'medical school', 'medical student'],
  },
  {
    slug: '15-best-free-audiobooks-all-time',
    topics: ['audiobook', 'audiobooks', 'narrated', 'listening', 'listen', 'librivox', 'spoken word', 'audio book'],
  },
  {
    slug: 'free-books-yoruba-igbo-hausa',
    topics: ['yoruba', 'igbo', 'hausa', 'nigerian language', 'african language'],
  },
  {
    slug: 'best-free-nigerian-literature',
    topics: ['nigerian', 'nigeria', 'lagos', 'achebe', 'soyinka', 'wole', 'chinua', 'african literature', 'abuja'],
  },
  {
    slug: 'author-payout-models-explained',
    topics: ['author', 'authors', 'payout', 'royalties', 'royalty', 'writer', 'writing', 'earn', 'revenue', 'self publish', 'self publishing', 'publishing'],
  },
  {
    slug: 'public-domain-classics-reading-list',
    topics: ['classics', 'classic', 'shakespeare', 'dickens', 'austen', 'tolstoy', 'novel', 'literature', 'public domain', 'victorian', '19th century'],
  },
  {
    slug: 'free-poetry-collections-worth-reading',
    topics: ['poetry', 'poem', 'poems', 'verse', 'sonnet', 'poet'],
  },
  {
    slug: 'free-waec-jamb-study-resources',
    topics: ['waec', 'jamb', 'exam', 'exams', 'past questions', 'past question', 'ss1', 'ss2', 'ss3', 'neco', 'secondary school', 'test preparation', 'study resources', 'revision'],
  },
  {
    slug: 'free-french-literature-original-and-translation',
    topics: ['french', 'french literature', 'francais', 'moliere', 'camus', 'translation', 'translated'],
  },
  {
    slug: 'how-to-host-free-live-online-class',
    topics: ['live class', 'online class', 'teaching', 'teacher', 'teachers', 'webinar', 'virtual class', 'live online', 'host a class', 'educator', 'educators', 'tutor', 'tutoring', 'live lessons'],
  },
  {
    slug: 'free-philosophy-books-that-change-thinking',
    topics: ['philosophy', 'philosopher', 'plato', 'kant', 'nietzsche', 'ethics', 'moral', 'metaphysics'],
  },
  {
    slug: 'free-business-startup-books-for-founders',
    topics: ['business', 'startup', 'founder', 'entrepreneurship', 'management', 'marketing', 'saas', 'lean', 'small business'],
  },
  {
    slug: 'free-engineering-textbooks-subject-guide',
    topics: ['engineering', 'mechanical', 'civil engineering', 'electrical', 'chemical engineering', 'engineer', 'materials science', 'thermodynamics'],
  },
  {
    slug: 'free-books-swahili-amharic-zulu',
    topics: ['swahili', 'amharic', 'zulu', 'ethiopia'],
  },
  {
    slug: 'best-free-kenyan-south-african-ghanaian-literature',
    topics: ['kenya', 'kenyan', 'south africa', 'ghana', 'ghanaian', 'african', 'south african'],
  },
  {
    slug: 'free-classic-russian-literature-reading-list',
    topics: ['russian', 'russia', 'tolstoy', 'dostoevsky', 'chekhov', 'gogol', 'turgenev'],
  },
  {
    slug: 'best-free-resources-learning-new-language',
    topics: ['language learning', 'learn a language', 'learning a language', 'vocabulary', 'grammar', 'dictionary', 'graded reader', 'learn spanish', 'learn german', 'learn italian', 'duolingo'],
  },
  {
    slug: 'free-mythology-folklore-collections',
    topics: ['mythology', 'folklore', 'myths', 'greek myths', 'norse', 'odyssey', 'hesiod', 'fairy tales'],
  },
  {
    slug: 'free-world-history-books-that-read-like-a-story',
    topics: ['history', 'historical', 'world history', 'ancient', 'medieval', 'historian'],
  },
  {
    slug: 'free-psychology-books-worth-reading',
    topics: ['psychology', 'psych', 'freud', 'cognitive', 'cognitive behavioral', 'psychoanalysis'],
  },
  {
    slug: 'reading-anyfreebook-in-your-own-language',
    topics: ['read in your own language', 'translation feature', 'how do i use this site', 'how to use anyfreebook', 'translate the site', 'site feature', 'using anyfreebook'],
  },
  {
    slug: 'free-short-story-collections-for-busy-readers',
    topics: ['short story', 'short stories', 'story collection', 'quick read', 'flash fiction', 'short fiction'],
  },
  {
    slug: 'introducing-anyfreebook-live-classrooms',
    topics: ['live classroom', 'live classrooms', 'classroom feature', 'video class', 'live video', 'study together', 'new feature', 'announcement'],
  },
  {
    slug: 'free-personal-finance-books-worth-reading',
    topics: ['personal finance', 'money', 'investing', 'budgeting', 'retirement', 'wealth', 'stocks', 'financial literacy'],
  },
  {
    slug: 'free-books-spanish-portuguese-chinese',
    topics: ['spanish', 'portuguese', 'chinese', 'espanol', 'books in spanish', 'books in chinese'],
  },
  {
    slug: 'free-astronomy-space-science-books',
    topics: ['astronomy', 'space', 'stars', 'telescope', 'cosmology', 'astrophysics', 'planets', 'solar system'],
  },
  {
    slug: 'free-productivity-habits-books',
    topics: ['productivity', 'habits', 'focus', 'procrastination', 'deep work', 'discipline', 'getting things done'],
  },
  {
    slug: 'introducing-institutions-on-anyfreebook',
    topics: ['institutions', 'schools', 'universities', 'library for students', 'ngo', 'study plan', 'assignments', 'for teachers and schools'],
  },
];

/**
 * Which topics a thread mentions.
 *
 * Multi-word topics match as phrases; single words match as whole words, so
 * "ml" does not fire on "html".
 */
export function matchedTopics(text: string, topics: string[]): string[] {
  const lower = ` ${text.toLowerCase().replace(/[^a-z0-9+\s]/g, ' ').replace(/\s+/g, ' ')} `;
  const hits: string[] = [];
  for (const topic of topics) {
    const needle = topic.toLowerCase();
    if (needle.includes(' ')) {
      if (lower.includes(` ${needle} `)) hits.push(topic);
    } else if (new RegExp(`\\b${needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(lower)) {
      hits.push(topic);
    }
  }
  return hits;
}
