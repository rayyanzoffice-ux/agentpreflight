import type { NextRequest } from 'next/server';

/**
 * Optional LOCAL-DEVELOPMENT proxy for the AgentPreflight backend.
 * Copy to your existing Next.js app when its frontend source is available.
 * WARNING: No authentication/rate limiting in this MVP. DO NOT publicly deploy
 * this proxy without securing both the proxy and backend.
 */
const BACKEND_URL = process.env.PREFLIGHT_BACKEND_URL ?? 'http://127.0.0.1:8787';

async function forward(
  request: NextRequest,
  context: { params: Promise<{ path?: string[] }> }
): Promise<Response> {
  const { path = [] } = await context.params;
  const segments = path.filter(s => /^[A-Za-z0-9_.-]+$/.test(s));
  if (segments.length !== path.length) {
    return Response.json({ error: { code: 'BAD_PATH', message: 'Invalid route.' } }, { status: 400 });
  }
  const upstream = new URL(`/api/${segments.join('/')}`, BACKEND_URL);
  upstream.search = request.nextUrl.search;
  try {
    const response = await fetch(upstream, {
      method: request.method,
      headers: {
        ...(request.method === 'POST' ? { 'content-type': 'application/json' } : {})
      },
      body: request.method === 'POST' ? await request.text() : undefined,
      cache: 'no-store',
      signal: AbortSignal.timeout(15_000)
    });
    const headers = new Headers({
      'content-type': response.headers.get('content-type') || 'application/json',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff'
    });
    if (response.headers.get('content-disposition')) {
      headers.set('content-disposition', response.headers.get('content-disposition')!);
    }
    return new Response(await response.arrayBuffer(), { status: response.status, headers });
  } catch {
    return Response.json({ error: { code: 'BACKEND_UNAVAILABLE', message: 'The local preflight service is unavailable.' } }, { status: 502 });
  }
}

export const GET = forward;
export const POST = forward;
export const DELETE = forward;
