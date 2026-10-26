/**
 * Shared timeout for every call to a third-party book/research API.
 *
 * Why this exists: `next build` statically generates the catalog pages, and each
 * one performs live upstream fetches. Without an abort signal a single slow
 * upstream (gutendex, archive.org, NCBI) can hold a request open indefinitely and
 * stall a deploy. A bounded timeout turns "the build hangs forever" into "this
 * page falls back to the unverified tier", which is the behaviour we want.
 *
 * 10s is comfortably above normal upstream latency (including cold DNS) while
 * still bounding a deploy.
 */
export const UPSTREAM_TIMEOUT_MS = 10_000;

/** AbortSignal that fires after UPSTREAM_TIMEOUT_MS. Safe to pass to every fetch. */
export const UPSTREAM_TIMEOUT = () => AbortSignal.timeout(UPSTREAM_TIMEOUT_MS);

/**
 * The one place that decides whether an upstream failure is a *failure* or an
 * *empty answer*.
 *
 * That distinction is the whole point of the `partial` / `failedSources`
 * contract. If a source says "I have no matches for python", the honest report
 * is a count of 0 and the source is named as having answered. If a source says
 * "here is a 503", the honest report is that the source did not answer, and the
 * caller must record it as failed — otherwise a shorter list is presented as a
 * complete one, and the reader cannot tell "that is all there is" from "we could
 * not ask".
 *
 * Returning an empty list for both cases is the bug this exists to prevent.
 */

/** Thrown when an upstream did not answer. Callers catch it and record the failure. */
export class UpstreamError extends Error {
  constructor(
    readonly source: string,
    readonly status: number,
    message?: string
  ) {
    super(message ?? `${source}: upstream responded ${status}`);
    this.name = 'UpstreamError';
  }
}

/**
 * Statuses that mean "ask again in a moment" rather than "this will never
 * work". A 503 from a busy API is a transient condition, and one retry costs
 * far less than reporting the source as failed.
 */
function isTransient(status: number): boolean {
  return status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
}

/** How many times a transient failure is retried before the source is called failed. */
const TRANSIENT_RETRIES = 2;

/** Delay before the first retry. Doubles on each attempt. */
const RETRY_BASE_DELAY_MS = 250;

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export interface UpstreamJsonOptions {
  /** Human-readable source name, used in the error message. */
  source: string;
  /**
   * Statuses that mean "the upstream answered, and what it said is nothing".
   *
   * A 404 from an upstream that documents 404-as-no-match belongs here. A 404
   * from an upstream where 404 means "wrong URL" does not.
   */
  emptyOnStatus?: number[];
  /** Retry transient failures this many times. Default 2. */
  retries?: number;
}

/**
 * Fetch a JSON document from an upstream API, with an honest failure mode.
 *
 * Returns the parsed body on success, or `null` when the upstream answered
 * "no results" (see `emptyOnStatus`). Throws UpstreamError when the upstream
 * genuinely did not answer, after retrying transient statuses.
 *
 * The timeout is shared across the retries, so one source can never consume
 * more than UPSTREAM_TIMEOUT_MS in total, however many attempts it takes.
 *
 * Note on caching: Next.js only caches a fetch whose response status is 200
 * (see `patch-fetch`), so a 503 is never cached and a retry always reaches the
 * real upstream.
 */
export async function fetchUpstreamJson<T>(
  url: string,
  init: RequestInit & { next?: { revalidate?: number } } = {},
  options: UpstreamJsonOptions
): Promise<T | null> {
  const { source, emptyOnStatus = [], retries = TRANSIENT_RETRIES } = options;
  const empty = new Set(emptyOnStatus);

  // One deadline for the whole call, retries included.
  const signal = init.signal ?? UPSTREAM_TIMEOUT();

  for (let attempt = 0; attempt <= retries; attempt++) {
    let res: Response;
    try {
      res = await fetch(url, { ...init, signal });
    } catch (err) {
      // A network-level failure (DNS, TLS, timeout). Transient, so retry it —
      // unless the deadline has already run out, in which case the abort will
      // throw again immediately and we report the failure.
      if (attempt === retries) {
        throw new UpstreamError(
          source,
          0,
          `${source}: request failed (${err instanceof Error ? err.message : String(err)})`
        );
      }
      await sleep(RETRY_BASE_DELAY_MS * 2 ** attempt);
      continue;
    }

    if (res.ok) {
      return (await res.json()) as T;
    }

    // The upstream answered, and what it said is "nothing here".
    if (empty.has(res.status)) {
      return null;
    }

    if (!isTransient(res.status) || attempt === retries) {
      throw new UpstreamError(source, res.status, `${source}: upstream responded ${res.status}`);
    }

    await sleep(RETRY_BASE_DELAY_MS * 2 ** attempt);
  }

  // Unreachable: the loop either returns or throws.
  throw new UpstreamError(source, 0, `${source}: upstream failed`);
}
