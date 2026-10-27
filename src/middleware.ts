import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // The current @supabase/ssr API is getAll/setAll. The older
        // get/set/remove form is deprecated, and using it here is what produced
        // "@supabase/ssr: chunked cookie decoded to invalid JSON, treating as
        // absent" in the browser console: a long auth cookie is split across
        // several chunks, and the deprecated adapter could write only part of
        // them, so the next request read a half-written cookie as no session
        // at all. That is why sign-in sometimes appeared not to stick.
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request: { headers: request.headers } });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options as CookieOptions);
          }
        },
      },
    }
  );

  await supabase.auth.getSession();

  return response;
}

export const config = {
  matcher: [
    // Static PWA assets and /.well-known/assetlinks.json must be served
    // verbatim — the middleware must not sit in front of them.
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|icon-|apple-touch-icon|offline\\.html|\\.well-known|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
