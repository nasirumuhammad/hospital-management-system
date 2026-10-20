import { NextRequest, NextResponse } from 'next/server';

const ACCESS_COOKIE = 'cp_access';
const PUBLIC_ROUTES = new Set(['/login', '/forgot-password', '/reset-password', '/verify-email']);

/**
 * Next 15 only loads this file as `middleware.ts` (the `proxy.ts` name belongs to Next 16).
 * Navigation boundary only: API guards remain the source of truth for identity
 * and permissions. The proxy prevents anonymous users from entering the app shell.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_ROUTES.has(pathname) || pathname.startsWith('/_next/') || pathname === '/favicon.ico';
  if (isPublic) return NextResponse.next();

  // All app routes other than the explicit auth pages are private.
  if (!request.cookies.has(ACCESS_COOKIE)) {
    const loginUrl = new URL('/login', request.url);
    if (pathname !== '/') loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
