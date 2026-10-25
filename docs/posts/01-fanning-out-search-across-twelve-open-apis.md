# Fanning out a search across twelve APIs, and telling the user when one of them fails

ANYFREEBOOK searches Project Gutenberg, Open Library, the Internet Archive, Google Books, PubMed Central, DOAJ, LibriVox, OpenAlex, Wikisource, Europeana, Zenodo and the Open Textbook Library at the same time. (The public API fans out to all twelve. The website's own search page leaves LibriVox out, because an audiobook is usually not what someone typing a book title is after — that source has its own page.) The parallelism is the easy part. The part that took real thought was deciding what to do when one of the twelve does not answer — because the default behaviour of most multi-source search code is to quietly return a shorter list, and a shorter list is indistinguishable from "that is everything there is".

## There is no search index

Start with the constraint, because it dictates everything else. ANYFREEBOOK does not maintain a search index. We keep a curated catalogue of 258 books across 241 categories in `src/lib/data.ts`, and that catalogue powers the category pages and the per-title detail pages. But a search query is not answered out of that catalogue. It is fanned out, live, to twelve separate upstream APIs — each with its own index, its own rate limits, its own idea of what a result is, and its own bad days.

There is no replica of those indexes in our database and we do not crawl and re-store. Every search is twelve outbound HTTP requests in parallel, and the answer is the union of whatever they returned.

That design is cheap to start and awkward to operate, because the failure modes of twelve separate services are now our failure modes.

## One source failing must not cost you the other six

The obvious version looks like this:

```ts
const [gutenberg, openLibrary, googleBooks, archive, pubmed, doaj, librivox, openAlex] =
  await Promise.all([
    searchGutenberg(query, page),
    searchOpenLibrary(query, 20, page),
    // ...and so on
  ]);
```

`Promise.all` short-circuits. The first promise that rejects rejects the whole thing, and you throw away eleven responses that already arrived, or would have arrived had the fan-out waited. On a good day nobody notices; when one upstream times out, the search errors out for a query eleven sources could answer perfectly well.

`Promise.allSettled` waits for every promise to reach a terminal state and hands you each outcome separately. One rejected shelf costs you that shelf, never the page.

## How the fan-out actually looks

In `src/lib/api/searchAll.ts` each source gets its own block, and each block catches its own error:

```ts
export interface SearchOutcome {
  books: Book[];
  total: number;
  sources: Record<string, number>;
  failedSources: string[];
}

export async function searchAllSources(
  query: string,
  page: number,
  source: SearchSource,
  options: { includeLibrivox?: boolean } = {}
): Promise<SearchOutcome> {
  const results: SearchOutcome = { books: [], total: 0, sources: {}, failedSources: [] };
  const fetches: Promise<void>[] = [];

  if (source === 'all' || source === 'openlibrary') {
    fetches.push(
      (async () => {
        try {
          const ol = await searchOpenLibrary(query, 20, page);
          results.books.push(...ol.books);
          results.sources['Open Library'] = ol.total;
          results.total += ol.total;
        } catch {
          results.failedSources.push('Open Library');
        }
      })()
    );
  }

  // ...the same block for Gutenberg, Google Books, the Internet Archive,
  // PubMed Central, DOAJ and LibriVox...

  await Promise.all(fetches);
  return results;
}
```

A note on why this uses `Promise.all` rather than `Promise.allSettled`: because every block swallows its own error, none of these promises ever rejects. `Promise.all` here is safe by construction — it is `allSettled` semantics, with the outcome recorded in `failedSources` instead of in a result object.

Where the shape of the data allows it, we write the intent more directly. The category pages do exactly that:

```ts
// src/app/category/[slug]/page.tsx
const [ol, archive, gb] = await Promise.allSettled([
  searchOpenLibrary(query, 30, 1),
  searchArchive(query, 1, 24),
  searchGoogleBooks(query, 0, 20),
]);

const olTotal = ol.status === 'fulfilled' ? ol.value.total : 0;
const archiveTotal = archive.status === 'fulfilled' ? archive.value.total : 0;
const gbTotal = gb.status === 'fulfilled' ? gb.value.total : 0;
```

Both patterns are fine. What matters is that a rejected source produces a smaller list — never an exception, and never a silently truncated list presented as complete.

The other half of the story is timeouts. An upstream that never responds is worse than one that errors, because it holds the request open. Every call to a third-party book API goes through one shared abort signal with a 10-second ceiling (`src/lib/api/http.ts`), so a hung source costs that one shelf instead of the request.

## The contract: failedSources and partial

A failure record is only useful if it reaches the client. The public API (`https://anyfreebook.com/api/v1/search`) returns it. This is a real response, captured from the live API:

```json
{
  "query": "python",
  "page": 1,
  "limit": 2,
  "total": 25197940,
  "count": 2,
  "sources": {
    "ANYFREEBOOK": 3,
    "DOAJ": 17425,
    "Internet Archive": 23530878,
    "Open Library": 6588,
    "OpenAlex": 1248862,
    "Europeana": 409,
    "Wikisource": 0,
    "Zenodo": 71311,
    "Open Textbook Library": 38,
    "Project Gutenberg": 22537,
    "PubMed Central": 299892,
    "Google Books": 0
  },
  "failedSources": ["LibriVox"],
  "partial": true,
  "results": [ "..." ]
}
```

That capture is the interesting case. Ten of the twelve sources answered. LibriVox did not, and Google Books happened to be down at the same moment, which is why its count is zero rather than absent. The response says so: `failedSources` names LibriVox and `partial` is true.

Without that flag the same payload would read as a confident "25,197,940 results", and a reader would have no way to know that a slice of the answer was missing. With it, the client can say "here is what we found, and here is what we could not ask". A shorter list is not a wrong list, but an undeclared short list is a misleading one.

`partial` is derived on every request, never stored:

```ts
// src/app/api/v1/search/route.ts
failedSources: outcome.failedSources,
partial: outcome.failedSources.length > 0,
```

This is the part I care about most. If a UI renders `results` without looking at `partial`, then every time an upstream has a bad afternoon the site presents a truncated list as though it were the complete answer, and the reader concludes there are only a handful of books about Python. That is not a rendering bug — it is a factual claim, and the code is making it.

So the UI has to say something. On our own search page a partial result set gets an explicit banner naming the sources that did not answer, rather than a smaller grid with no explanation. The same contract is documented for API consumers on `/developers/api`.

## Twelve upstream calls per request forces a real rate limit

The cost model is unforgiving: one API request from us is up to twelve requests to somebody else's server. Expose a public API on top of that without a quota and you have turned yourself into a load generator aimed at twelve services you do not control.

The first version of the limiter was a `Map` of timestamp arrays in process memory (`src/lib/rateLimit.ts`):

```ts
const buckets = new Map<string, number[]>();
```

It works fine on a single long-lived Node process. On serverless it is decoration. Every cold start gets a fresh empty map, and traffic spread across several instances gives every instance its own private bucket. A caller who exceeds the limit on instance A simply lands on instance B and starts again. You cannot cap a public API with process-local state.

The fix is to keep the counters in Postgres, where every instance sees the same row. One round trip does the counting and the check together:

```sql
-- supabase/migrations/012_public_api.sql
insert into public.api_rate_limit as r (bucket, window_started_at, hits)
values (p_bucket, v_now, 1)
on conflict (bucket) do update
  set hits = case
               when r.window_started_at < v_window then 1
               else r.hits + 1
             end,
      window_started_at = case
               when r.window_started_at < v_window then v_now
               else r.window_started_at
             end
returning r.hits, r.window_started_at into v_hits, v_started;
```

The `on conflict ... do update` is the load-bearing part. It takes a row lock on the bucket for the duration of the statement, so two concurrent requests cannot both read the old count and both conclude they are under the limit. The naive version — select the count, compare, then update — has a read-modify-write race exactly when it matters most.

Two details around it are easy to get wrong. First, the function is `security definer`, and Postgres functions are executable by `PUBLIC` by default; without an explicit revoke, anyone holding the anon key could call it with a limit of a billion and reset everyone's counters. We revoke execute from `public`, `anon` and `authenticated`, granting it to `service_role` only. Second, it is created with `set search_path = public`, so a caller who can create objects in a schema they control cannot hijack name resolution inside it.

We apply the per-minute and per-day windows in parallel, so the two counters cost one round trip of latency, and report the window the caller actually has to wait out — the minute window when that is the one that was exceeded, the day window when that is. And if the migration has not been applied yet, the RPC errors; rather than breaking the API outright we fall back to the per-instance limiter and report which scope answered, so the degradation is visible instead of silent.

## The part I keep coming back to

A partial result set and a complete result set are different things, and they should look different at every layer above the fan-out: the function signature, the JSON response, the rendered page, and the documentation for anyone consuming the API.

An API that hides partial failure is lying, and the user cannot tell — which is exactly why the failure record has to travel all the way out to the screen instead of stopping at the function boundary.
