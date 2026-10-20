import { NextRequest, NextResponse } from 'next/server';
import { resolveInternalApiUrl } from '@/lib/api-base-url';

/**
 * Same-origin proxy to the API. Session cookies are HttpOnly and read by both
 * the browser and this Next server (proxy.ts, Server Components), so they must
 * live on the web origin. Hosts that put web and API on different public
 * suffixes (e.g. *.onrender.com) cannot share cookies, so the browser talks to
 * /api here and the API URL stays a server-side secret.
 */
export const dynamic = 'force-dynamic';

const FORWARDED_REQUEST_HEADERS = ['content-type', 'accept', 'cookie', 'origin', 'referer', 'authorization', 'user-agent', 'x-forwarded-for'];
const FORWARDED_RESPONSE_HEADERS = ['content-type', 'cache-control', 'x-request-id', 'retry-after'];
const BODYLESS_METHODS = ['GET', 'HEAD'];
const BODYLESS_STATUSES = [204, 205, 304];

function buildUpstreamHeaders(request: NextRequest): Headers {
  const headers = new Headers();
  FORWARDED_REQUEST_HEADERS.forEach((name) => {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  });
  return headers;
}

// Allow-list rather than copying upstream headers: fetch() has already decoded
// the body, so forwarding content-encoding/length would corrupt the response.
function buildClientHeaders(upstream: Response): Headers {
  const headers = new Headers();
  FORWARDED_RESPONSE_HEADERS.forEach((name) => {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  });
  upstream.headers.getSetCookie().forEach((cookie) => headers.append('set-cookie', cookie));
  return headers;
}

async function forward(request: NextRequest, context: { params: Promise<{ path: string[] }> }): Promise<NextResponse> {
  const { path } = await context.params;
  const target = `${resolveInternalApiUrl()}/${path.join('/')}${request.nextUrl.search}`;
  const body = BODYLESS_METHODS.includes(request.method) ? undefined : await request.arrayBuffer();

  const upstream = await fetch(target, {
    method: request.method,
    headers: buildUpstreamHeaders(request),
    body,
    redirect: 'manual',
    cache: 'no-store',
  });

  const payload = BODYLESS_STATUSES.includes(upstream.status) ? null : await upstream.arrayBuffer();
  return new NextResponse(payload, { status: upstream.status, headers: buildClientHeaders(upstream) });
}

export { forward as GET, forward as POST, forward as PATCH, forward as DELETE };
