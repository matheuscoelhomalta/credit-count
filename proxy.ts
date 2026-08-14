import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

// Session refresh and optimistic redirects only.
//
// This is a convenience layer, NOT the authorization boundary. Anything it
// redirects away from is still independently protected by grants and RLS in the
// database, so bypassing this file gains an attacker nothing.

const PROTECTED_PREFIXES = ['/dashboard', '/history', '/coasters', '/admin', '/account'];
const AUTH_ROUTES = ['/sign-in', '/sign-up'];

export default async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const authResponseHeaders = new Headers();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) {
    return response;
  }

  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
        for (const [name, value] of Object.entries(headers)) {
          authResponseHeaders.set(name, value);
          response.headers.set(name, value);
        }
      },
    },
  });

  // getClaims() validates the token and triggers refresh when needed. Do not
  // run other logic between client creation and this call, or refreshed cookies
  // can be dropped.
  const { data } = await supabase.auth.getClaims();
  const isSignedIn = Boolean(data?.claims);

  const { pathname } = request.nextUrl;

  // A fresh NextResponse would drop refreshed auth cookies and their anti-cache
  // headers, so carry both onto every redirect we return.
  const redirectTo = (target: URL) => {
    const redirect = NextResponse.redirect(target);
    for (const cookie of response.cookies.getAll()) {
      redirect.cookies.set(cookie);
    }
    authResponseHeaders.forEach((value, name) => {
      redirect.headers.set(name, value);
    });
    return redirect;
  };

  if (!isSignedIn && PROTECTED_PREFIXES.some((p) => pathname.startsWith(p))) {
    const target = request.nextUrl.clone();
    target.pathname = '/sign-in';
    target.searchParams.set('next', pathname);
    return redirectTo(target);
  }

  if (isSignedIn && AUTH_ROUTES.includes(pathname)) {
    const target = request.nextUrl.clone();
    target.pathname = '/dashboard';
    target.search = '';
    return redirectTo(target);
  }

  return response;
}

export const config = {
  matcher: [
    // Everything except Next.js internals and static assets.
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
