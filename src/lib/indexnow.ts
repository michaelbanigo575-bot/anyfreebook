/**
 * IndexNow: an open protocol (backed by Bing, Yandex, Seznam, Naver — Google
 * does not participate) that lets a site push "this URL changed" directly to
 * search engines instead of waiting for the next crawl. Free, no account,
 * just a key file hosted at the domain root (see public/<key>.txt).
 */

const INDEXNOW_KEY = 'f16d2fa08ff2a5d924f47747df7f893e';

export async function pingIndexNow(urls: string[]): Promise<void> {
  if (!urls.length) return;
  try {
    await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        host: 'anyfreebook.com',
        key: INDEXNOW_KEY,
        keyLocation: `https://anyfreebook.com/${INDEXNOW_KEY}.txt`,
        urlList: urls.slice(0, 10000),
      }),
      signal: AbortSignal.timeout(8000),
    });
  } catch { /* best effort — never block the caller on this */ }
}
