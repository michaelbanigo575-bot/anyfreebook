/**
 * Draft the reply.
 *
 * The shape is fixed by the brief and enforced here:
 *
 *   1. the answer, first and longest
 *   2. the honest insight about how it actually works
 *   3. the product, briefly, with the full disclosure, last
 *
 * The answer text is not generated. It comes from templates written from
 * things that are actually true about these sources — which repositories
 * serve what, and where the legal line sits. A draft that reads like a
 * person wrote it is the whole point; a generic paragraph that says
 * "there are many great free resources available" is worse than no reply.
 *
 * The operator edits every draft before submitting it. That is the design,
 * not a limitation.
 */

import type { RedditDraft, RedditPost, RedditTarget } from './types.ts';
import {
  disclosureFor,
  ruleChecksFor,
  valueRatioOf,
  checkDraftPolicy,
  MIN_VALUE_RATIO,
} from './policy.ts';
import { matchArticle, type ArticleMatch } from './matching.ts';
import { BLOG_POSTS } from '../blogPosts.ts';

export interface DraftResult {
  draft: RedditDraft | null;
  policy: ReturnType<typeof checkDraftPolicy>;
  /**
   * False when there was nothing to say. The thread is still saved, but no
   * reply is proposed: a person has to write it.
   */
  draftable: boolean;
}

/** The kinds of thread we know how to answer. */
export type AnswerKind =
  | 'textbooks'
  | 'ebooks'
  | 'reading-list'
  | 'exam-prep'
  | 'audiobooks'
  | 'tts'
  | 'faceless-video'
  | 'ai-pipeline'
  | 'api-cost'
  | 'flutter';

interface AnswerTemplate {
  kind: AnswerKind;
  /**
   * Which product this answer is about. A template written for narration
   * costs must never answer a question about an e-commerce backend: a reply
   * that ignores the thread is spam wearing our name, and that is how a
   * community bans you.
   */
  product: 'anyfreebook' | 'afristudio';
  /** Words that identify this template in the thread. */
  match: string[];
  /** The body of the answer. No product mention allowed in here. */
  answer: string;
  /** The second paragraph: how it actually works, and the honest caveat. */
  insight: string;
  /** The third paragraph: what to actually do about it. */
  closer: string;
}

const TEMPLATES: AnswerTemplate[] = [
  {
    kind: 'textbooks',
    product: 'anyfreebook',
    match: ['textbook', 'textbooks', 'course', 'curriculum', 'syllabus', 'open course', 'ocw', 'openstax'],
    answer:
      'The ones that actually work for a full course are the open textbooks and the open course archives, not the file-dump forums.\n\n' +
      '**OpenStax** has peer-reviewed textbooks for the standard intro sequence — biology, chemistry, physics, statistics, algebra, economics, psychology — that you can download as PDF or read in the browser. They are Creative Commons, so you can print, adapt and redistribute them. That is the part most people miss: a textbook you can legally photocopy for a whole class is a different product from a textbook you can read.\n\n' +
      '**MIT OpenCourseWare** and **OpenStax\'s companion site** carry the actual course material for a lot of well-known subjects: lecture notes, problem sets with solutions, assignments, exams and, in some cases, video. The assignments and exams are the part students usually cannot get anywhere else.\n\n' +
      '**OER Commons** indexes everything from the above plus textbook repositories from dozens of countries, and you can filter by subject, language and licence.\n\n' +
      'For anything not covered by a peer-reviewed open text, **LibreTexts** has a large catalogue of collaboratively written chapters that are explicitly licensed for reuse.',
    insight:
      'One thing worth knowing before you spend an evening assembling a reading list: "free to read online" and "free to distribute" are different rights, and only the second one lets you hand a PDF to a class of forty. Check the licence on each individual chapter — LibreTexts chapters vary, because they are written by many different people. OpenStax and MIT OCW are consistently CC-BY or CC-BY-SA, which is why they are the safe defaults when you need to photocopy.',
    closer: 'The practical version: spend twenty minutes choosing one textbook rather than assembling a list of eight. Pick the open text that covers most of your syllabus, then fill the gaps with MIT OCW material for the parts it misses — that combination is usually more coherent than a pile of smaller resources. And check the edition: a second edition may not be open while the first one is, and OpenStax keeps both.',
  },
  {
    kind: 'ebooks',
    product: 'anyfreebook',
    match: ['ebook', 'ebooks', 'epub', 'kindle', 'mobi', 'pdf book', 'where to download', 'free download'],
    answer:
      'It depends entirely on whether the title is actually out of copyright, and most sites do not tell you that clearly — which is the trap people fall into.\n\n' +
      '**Project Gutenberg** is the safest bet for anything published before about 1930: about 79,000 ebooks, plain text and EPUB and HTML, no account, no limits. It also has the best metadata in the business — author, language, subject, popularity.\n\n' +
      '**Standard Ebooks** takes public-domain texts and produces properly typeset, proofed editions with real EPUB and Kindle files. Smaller catalogue, much better reading experience.\n\n' +
      '**The Internet Archive** has the largest collection of scanned books, but this is where the distinction matters: the lending library (borrow) and the freely-downloadable collection are different things, and a scan being visible in a search result does not mean the file is downloadable. A lot of people end up on a login wall there and assume the book is paid.\n\n' +
      '**Open Library** is the catalogue layer — it is the best place to check what exists and which edition is free, and it links out to the lending copies.\n\n' +
      '**LibriVox** is the same public-domain corpus as audiobooks, read by volunteers.',
    insight:
      'The reason a lot of "free ebook" sites are dangerous is that they do not distinguish four different states: a book that is genuinely public domain and downloadable, a book that is free to borrow under a digital-lending licence, a book that is free to read on a publisher\'s site but not to download, and a book that is still in copyright and being offered illegally. Those four need completely different links, and the first three are all legitimate. If a site gives you one URL for all four cases, that is the site to be careful with.',
    closer: 'One habit worth building: check the copyright status before you download, not after. If the edition was published within the last seventy years, assume it is still in copyright and look for a lending copy or an older edition instead. It takes ten seconds and it is the difference between a free library and a legal problem.',
  },
  {
    kind: 'reading-list',
    product: 'anyfreebook',
    match: ['reading list', 'recommend', 'what should i read', 'looking for books', 'suggestions', 'next book'],
    answer:
      'A good free reading list looks different from a paid one, because the constraint is not "good" but "legally free and still interesting".\n\n' +
      'Start with **Standard Ebooks** and **Project Gutenberg** for the public-domain end: a few hundred carefully made editions and nearly 80,000 texts, sorted by popularity rather than by algorithm.\n\n' +
      '**Open Library** covers the long tail — millions of catalogue entries, including the work that is free to borrow from the Internet Archive rather than free to download.\n\n' +
      'For non-fiction and current material, **DOAJ** indexes open-access peer-reviewed journals, and **PubMed Central** is the free full-text subset of the biomedical literature — both are genuinely free to download as PDF, which is not true of most journal articles.\n\n' +
      '**LibriVox** turns the public-domain corpus into audiobooks if you would rather listen than read.',
    insight:
      'One practical tip: search by author rather than by title when you are building a list. The same book often appears under several titles across editions, and the "free" copy is frequently attached to the edition nobody searches for — the 1911 Gutenberg edition of a novel has a different, friendlier file than the 1998 reprint. Author search also avoids the sponsored books that dominate "free ebook" search results, which is where most of the junk comes from.',
    closer: 'A practical starting point: pick two or three subjects you actually want to read rather than five you abandon in March. The public-domain catalogue rewards narrowness — the more specific the search, the better the results, because it matches titles and authors rather than descriptions. And if you want to track what you have read, a plain spreadsheet beats every reading tracker, which mostly exist to sell you the next one.',
  },
  {
    kind: 'exam-prep',
    product: 'anyfreebook',
    match: ['waec', 'jamb', 'past questions', 'exam prep', 'revision', 'mock', 'ss1', 'ss2', 'ss3', 'neco', 'namibian', 'bECE'],
    answer:
      'The past questions themselves are the hard part, because papers that are still in copyright cannot be redistributed — and most of the sites offering "free past questions" are either pirating them or selling you a PDF of the questions with the answers scraped from a site.\n\n' +
      '**The official route is the free one.** WAEC publishes past questions through its own candidate portal, and JAMB does the same — you register and download them directly. Nothing else is legitimately as complete, and it is free.\n\n' +
      '**CEMAP / WAEC Ghana\'s own resources** and the **JAMB CBT practice** material are also officially free.\n\n' +
      'For the syllabus side, the textbooks are mostly available through **OpenStax** (mathematics, physics, chemistry, biology, economics), **MIT OpenCourseWare** (problem sets and exams for many subjects) and **LibreTexts** — the specific chapters your syllabus needs, not a whole textbook, usually gets you further anyway.\n\n' +
      '**Khan Academy** covers the mathematics and physics fundamentals, and it is free.',
    insight:
      'If a site is offering you scanned past papers in exchange for nothing, treat that as a signal rather than a gift: either the papers are still in copyright and you are about to download an infringing copy, or the "answers" are generated and unreliable. The exam is worth more than the shortcut, and the official portal has the papers for the year you actually sat.',
    closer: 'The order that works: do the official past questions first, so you know the real format and the mark distribution, then work backwards to the topics you lost marks on and read only those chapters. Covering the whole syllabus and then testing yourself is the slow way round. If you can only do one thing, sit a full paper under exam conditions before you revise anything at all.',
  },
  {
    kind: 'audiobooks',
    product: 'anyfreebook',
    match: ['audiobook', 'audiobooks', 'listen', 'narrated', 'free audio'],
    answer:
      '**LibriVox** is the one that matters: volunteers record public-domain texts, and the catalogue is free with no account. It is genuinely good — a lot of the recordings are excellent, and there are genuine full-cast productions.\n\n' +
      'The **Internet Archive** also has a large audiobook collection, and some of it is downloadable rather than lending-only, which is worth checking per item.\n\n' +
      '**Open Library** can point you at specific recordings, and it is often the easiest way to find a narrated version of an obscure title.\n\n' +
      '**Standard Ebooks** has no audio, but it is the best-quality text edition if you would rather read than listen.',
    insight:
      'The catch with LibriVox is volunteer quality, so check the narrator before committing to a 30-hour recording. The metadata will tell you whether it is a solo reader or a full cast, and single-reader recordings vary a lot. For long books, the "proofread" and "cast" collections are the ones worth your time.',
    closer: 'Worth knowing: because these are recordings made by volunteers over a long period, the catalogue has a long tail of very old recordings with a lot of hiss and an unvaried delivery. Nothing personal about the volunteers — the quality spread is real. Sorting by rating or listener count in the search results tends to surface the better productions.',
  },
  {
    kind: 'tts',
    product: 'afristudio',
    match: ['text to speech', 'tts', 'voice', 'narration', 'voice cloning', 'whisper', 'piper', 'coqui', 'xtts', 'elevenlabs'],
    answer:
      'If you want it to run locally, the shortlist is **Piper**, **Kokoro** and **Coqui XTTS**. Piper is fast, small and sounds surprisingly good for its size; Kokoro is newer and noticeably more natural; XTTS v2 does near-zero-shot voice cloning, which is the one people usually want and the one that needs the most care.\n\n' +
      '**Whisper** (or faster-whisper, which is the one to actually install) handles the other direction — turning audio into text — and it is good enough to be the default.\n\n' +
      '**Kokoro** in particular runs on CPU at a speed you can use for narration, which rules out most of the hosted options on a budget.\n\n' +
      'If you want a hosted API instead, **Azure Speech** has a generous free tier and a very natural voice list; **Google Cloud TTS** and **AWS Polly** are the other two worth benchmarking. All three price by character, so the cost depends on how much you generate.\n\n' +
      '**Whisper.cpp** and **Piper** are the pairing to use if you are building a pipeline that has to work offline.',
    insight:
      'The thing nobody mentions up front is licensing of the voice itself. A TTS model can be open source and the voice can still be restricted — many models ship with voices derived from paid voice actors, and using them commercially can be a different question from using the model. Piper and Kokoro ship voices with explicit licences; XTTS is trained on data whose provenance is not clean, which is fine for a prototype and worth knowing before you bill a client for it. Separately: a voice that imitates a specific person is a consent question, not only a technical one, and that applies however you generated it.',
    closer: 'One more practical point: the difference between a demo and a product here is usually the queue, not the model. Local TTS on a modest machine will not keep up with real-time generation for a long piece, so the pipeline needs to render ahead and cache the output. Once it renders ahead, model speed stops being the constraint and voice quality becomes the thing worth optimising.',
  },
  {
    kind: 'faceless-video',
    product: 'afristudio',
    match: ['faceless', 'youtube automation', 'shorts', 'reels', 'tiktok', 'auto captions', 'burned in'],
    answer:
      'The pipeline that tends to survive contact with reality is: **script → TTS → images → captions → edit**. The parts people usually underestimate are the captions and the edit.\n\n' +
      'For the voice, a local model (Piper or Kokoro) removes the per-character cost entirely, which is the difference between a channel that makes money and one that does not. For captions, **Whisper** or **whisper.cpp** transcribes the audio you just generated, which means the captions are accurate rather than whatever a stock library happened to label.\n\n' +
      'For the visuals, most of the channels doing this well are not doing generation — they are using licensed stock and b-roll, and letting the pacing and the narration carry it.\n\n' +
      'For the edit, **ffmpeg** does everything you need; there is no reason to reach for a GUI at volume.\n\n' +
      'The other half is platform policy: mass-produced reused content is what YouTube\'s "repetitious content" policy targets, so the variation between videos matters as much as the pipeline.',
    insight:
      'The failure mode is not technical, it is that these channels do not sound like anyone. The TTS voice is the same on every video, the script structure is the same, and viewers pick that up in seconds. The people who make it work vary pacing and topic between videos and let the narration have some personality, which means a voice with more range than the default — and that is a model choice, not a settings choice.',
    closer: 'If you are starting from zero, do not begin with the video. Start with the script, because the script is the only part of the pipeline that decides whether the finished thing is worth watching. Write ten of them first, find the format that holds up, and only then build the automation around the format you have already validated.',
  },
  {
    kind: 'ai-pipeline',
    product: 'afristudio',
    match: ['workflow', 'pipeline', 'ai video', 'diffusion', 'model', 'inference'],
    answer:
      'The architecture question usually comes down to where you put the boundaries, and the answer that tends to hold up is: keep the generative steps local and the orchestration in code.\n\n' +
      'Locally, that means a diffusion model for images and a local TTS for voice, with the model server on one machine and the pipeline logic on another. The boundary matters because the expensive part is inference time, and a local box you control is the only way to make a batch job economically sensible.\n\n' +
      'In code, that means a job queue, per-step retries, and an artefact store — you want to be able to re-run the caption step without re-running the render, which is normal the first time you have to do it for the twentieth video.\n\n' +
      'For serving, **vLLM** or **llama.cpp** for text, **ComfyUI** for image workflows you want to keep editable, and **ffmpeg** as the joinery layer.',
    insight:
      'The failure that catches everyone is treating the pipeline as one big step. The moment the script changes, you re-run everything; the moment one frame renders wrong, you re-render the video. Keeping each step\'s output addressable is what turns a demo into something you can actually put on a schedule, and it costs an afternoon to build in and weeks to retrofit.',
    closer: 'The other half of the answer is observability: log which prompt, which seed and which model produced each artefact, and you can re-roll one step of one video instead of the whole batch. When something comes out wrong, that record is the difference between a five-minute fix and a five-hour one.',
  },
  {
    kind: 'api-cost',
    product: 'afristudio',
    match: ['api cost', 'rate limit', 'pricing', 'cost per', 'credits', 'free tier', 'per minute'],
    answer:
      'The cost model that surprises people is that text-to-speech is priced per character and video is priced per second, so the unit you are billed in is not the unit you think in.\n\n' +
      'A 10-minute narrated video at roughly 900 words is about 5,400 characters — which sounds tiny next to a video-render API that bills by the second of output. The render is almost always the expensive half, not the voice.\n\n' +
      'The three levers, in order of impact: render fewer seconds, cache the expensive artefact across every video that reuses it, and move the step with a predictable cost onto your own hardware. Self-hosting the image model usually moves the bill the most.\n\n' +
      'On rate limits, the thing that breaks naive clients is not the per-minute ceiling but the concurrency limit. Ten parallel requests to a service that allows three concurrent will get you throttled even though you are nowhere near the request quota.\n\n' +
      'The pattern that survives is a token bucket on your side, exponential backoff with jitter on 429, and idempotency keys so a retry does not charge twice.',
    insight:
      'The number people get wrong is retries. A naive exponential backoff with no jitter has every client in the fleet retrying at the same instant, which is how a traffic spike turns into an outage on the provider side and a ban for you. Adding jitter and capping concurrency fixes most of the "I got rate limited even though I am under my quota" reports.',
    closer: 'One more thing worth separating: cost and rate limit get confused constantly. The rate limit is a property of the provider\'s capacity and your concurrency; the cost is a property of how much output you generate. You can be well under the monthly spend and still get throttled, and throttled nowhere and still overspend. Track them separately or you will optimise the wrong one.',
  },
  {
    kind: 'flutter',
    product: 'afristudio',
    match: ['flutter', 'dart', 'plugin', 'package', 'pub.dev'],
    answer:
      'For text-to-speech inside a Flutter app there are two routes and they are not equivalent.\n\n' +
      '**flutter_tts** wraps the platform engines — Android\'s TextToSpeech and iOS\'s AVSpeechSynthesizer. It is free, it is on pub.dev, and it is the right choice for most apps: offline, no key, no per-character cost, and it reads system voices.\n\n' +
      'For a specific voice with more character than the system default, or for consistent output across Android and iOS, you want server-side synthesis: generate the audio with Piper or a hosted TTS and play it as an asset or stream it. That costs you a backend and it removes the platform inconsistency.\n\n' +
      '**just_audio** handles playback properly if you are streaming generated audio — gapless playback, background modes, and caching, which flutter_tts does not do.\n\n' +
      'For local Whisper transcription in a Flutter app, **whisper.cpp** with a FFI binding is the path; there is also `flutter_whisper` for the same purpose.',
    insight:
      'The decision point is whether the narration has to sound identical on every device. If it does, system TTS will not do it, because Android and iOS ship different voices and the same words come out differently. Generate once, ship audio, and you get consistency. If it does not — which is more common than people assume — flutter_tts is simpler and free, and the difference in quality is mostly about voice choice rather than the engine.',
    closer: 'One more consideration for shipping: generated audio is large, and a narrated long text is often bigger than the text itself. Shipping one pre-generated file per chapter is usually the better trade than generating on device, and it removes the TTS dependency from the app entirely. If you do generate on device, cache aggressively — nobody should hear the same sentence synthesised twice.',
  },
];

/**
 * Choose the template that best fits a thread.
 *
 * Returns null when nothing fits. A null means we have nothing to say, and
 * the honest answer to that is to write nothing and let the operator decide.
 * Falling back to a generic paragraph about free books in a thread about
 * Postgres is how a community decides we are spam.
 */
export function chooseTemplate(post: RedditPost): AnswerTemplate | null {
  const haystack = `${post.title} ${post.body} ${post.intentSignals.join(' ')}`.toLowerCase();
  let best: AnswerTemplate | null = null;
  let bestScore = 0;

  for (const template of TEMPLATES) {
    // A template written for another product is never the right answer here,
    // however well its keywords happen to fit.
    if (template.product !== post.product) continue;

    let score = 0;
    for (const word of template.match) {
      // A hit in the title is what the person is actually asking about. A
      // hit in the body might be a passing mention.
      if (post.title.toLowerCase().includes(word)) score += 25;
      else if (post.body.toLowerCase().includes(word)) score += 8;
    }
    if (score > bestScore) {
      bestScore = score;
      best = template;
    }
  }

  // One loose keyword in the body is not a match. A phrase in the title, or
  // three separate words, is.
  if (best && bestScore >= 25) return best;
  return null;
}

/**
 * Build an answer out of the article that actually answers the thread.
 *
 * This is the whole idea of the article map: the article is the value, and
 * the product is only the byline. When a thread matches one of our technical
 * articles, the reply carries the article's own explanation of the problem
 * the thread is asking about — on-topic by construction, because it is the
 * same text.
 *
 * Returns null when the article is too thin to carry a reply.
 */
export function answerFromArticle(
  post: RedditPost,
  article: ArticleMatch
): { answer: string; insight: string; closer: string } | null {
  const entry = BLOG_POSTS.find((p) => p.slug === article.slug);
  if (!entry) return null;

  const paragraphs = entry.content
    .filter((block) => block.type === 'p' && (block.text ?? '').trim().length > 80)
    .map((block) => (block.text ?? '').trim())
    // A paragraph that ends in a colon is introducing a code block. Quoted on
    // its own it dangles, so it is not a paragraph to quote.
    .filter((text) => !text.endsWith(':'));
  if (paragraphs.length < 2) return null;

  const tips = entry.content
    .filter((block) => block.type === 'tip' && (block.text ?? '').trim().length > 40)
    .map((block) => (block.text ?? '').trim());

  // Prefer the paragraphs that talk about what the thread is about. The
  // paragraph with the most distinct matched topics is the one that answers
  // the question; the opening paragraph of an article usually does not.
  const topics = article.matched.map((t) => t.toLowerCase());
  const scored = paragraphs
    .map((text, index) => {
      const lower = text.toLowerCase();
      const hit = topics.filter((topic) => lower.includes(topic));
      return { text, index, hits: hit.length };
    })
    .sort((a, b) => b.hits - a.hits || a.index - b.index);

  const answer = scored[0].text;
  const insight = scored.find((s) => s.text !== answer)?.text;
  const closer = tips[0] ?? scored.find((s) => s.text !== answer && s.text !== insight)?.text;

  if (!insight || !closer) return null;

  return { answer, insight, closer };
}

/**
 * Build the draft. The body is answer + insight + mention, in that order.
 *
 * There are two ways to get an answer, and only two. A template written for
 * this kind of question, or the article that answers it. When neither
 * applies, nothing is drafted: `draftable` is false and the thread is left
 * for a person. A reply that does not answer the question is worse than no
 * reply, because it is indistinguishable from spam.
 */
export function buildDraft(
  post: RedditPost,
  target: RedditTarget,
  options: { article?: ArticleMatch | null; includeLink?: boolean } = {}
): DraftResult {
  const template = chooseTemplate(post);
  // Some communities do not allow a service to be promoted at all. There the
  // reply is the value and nothing else: no link, no URL in the disclosure.
  const linksAllowed = target.linksAllowed !== false;
  const disclosure = disclosureFor(post.product, { allowUrl: linksAllowed });
  const article = options.article ?? matchArticle(post.title, post.body, post.product);
  const includeLink = (options.includeLink ?? true) && linksAllowed;

  // A template first, because it is written for the question. Failing that,
  // the article that matches the thread, which carries the answer itself.
  const fromArticle = template ? null : article ? answerFromArticle(post, article) : null;

  if (!template && !fromArticle) {
    return {
      draft: null,
      policy: {
        ok: false,
        problems: ['no template and no matching article — this one needs a person to write it'],
      },
      draftable: false,
    };
  }

  const answerBody = template
    ? `${template.answer}\n\n${template.insight}\n\n${template.closer}`
    : `${fromArticle!.answer}\n\n${fromArticle!.insight}\n\n${fromArticle!.closer}`;

  // The mention has to stay short: it is the minority of the reply by design,
  // and a reply where the product is a third of the text is an ad.
  const mentionParts: string[] = [];
  mentionParts.push(disclosure);
  // Where a service cannot be promoted at all, the disclosure is the whole
  // mention: who we are, no pitch, no link.
  if (linksAllowed) {
    mentionParts.push(
      template
        ? post.product === 'anyfreebook'
          ? 'It searches those sources live and marks each title as a real download, a borrow-only copy, or a catalogue record.'
          : 'It runs the narration and caption steps together so the per-character cost is not what decides whether a channel is viable.'
        : // The answer came from an article, so the article is what the mention
          // should point at. Saying "it searches those sources live" in a thread
          // about a Postgres index would be a non sequitur.
          'The write-up above is from that codebase, which is a free-book aggregator.'
    );
  }

  if (includeLink && article) {
    mentionParts.push(`Longer write-up: ${article.url}`);
  }

  const mentionBody = mentionParts.join(' ');
  const valueRatio = valueRatioOf(answerBody, mentionBody);

  const hasLink = /https?:\/\//.test(mentionBody);
  const ruleChecks = ruleChecksFor({
    subreddit: post.subreddit,
    linksAllowed: target.linksAllowed,
    selfPromoThread: target.selfPromoThread,
    minAccountAgeDays: target.minAccountAgeDays,
    minKarma: target.minKarma,
    rulesVerifiedAt: target.rulesVerifiedAt,
    hasLink,
  });

  const draft: RedditDraft = {
    postId: post.id ?? null,
    product: post.product,
    subreddit: post.subreddit,
    body: `${answerBody}\n\n${mentionBody}`,
    answerBody,
    mentionBody,
    disclosure,
    valueRatio,
    linkedArticleSlug: article?.slug ?? null,
    linkedArticleUrl: article?.url ?? null,
    ruleChecks,
    status: 'draft',
  };

  const policy = checkDraftPolicy({
    answerBody: draft.answerBody,
    mentionBody: draft.mentionBody,
    disclosure: draft.disclosure,
    subreddit: draft.subreddit,
    linksAllowed: target.linksAllowed,
  });
  return { draft, policy, draftable: true };
}

/** The floor a draft has to clear to be worth an operator's time. */
export const READY_RATIO = MIN_VALUE_RATIO;
