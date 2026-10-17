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