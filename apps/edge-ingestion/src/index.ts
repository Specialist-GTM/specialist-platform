import { sha256Hex } from '@specialist-gtm/crypto-utils';

export interface Env {
  INGESTION_API_KEY?: string;
  CDN?: KVNamespace;
}

const LATEST_CACHE_CONTROL =
  'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800';
const PINNED_CACHE_CONTROL = 'public, max-age=31536000, immutable';
const SCRIPT_CONTENT_TYPE = 'application/javascript; charset=utf-8';
const ALLOW_ORIGIN = '*';
const LATEST_SCRIPT_KEY = 'v1/track.js';
const PINNED_VERSION = '0.1.0';

const PLACEHOLDER_SCRIPT = `/* Specialist GTM tracker placeholder. Configure o binding KV "CDN" para servir o bundle real. */
(function () {
  if (typeof window === 'undefined') return;
  var tracker = { version: '0.1.0' };
  window.SpecialistGTM = tracker;
  window.sgtm = tracker;
})();
`;

function scriptCacheKind(pathname: string): 'latest' | 'pinned' | null {
  if (pathname === '/track.js' || pathname === '/v1/track.js') {
    return 'latest';
  }
  if (/^\/v\d+\.\d+\.\d+\/track\.js$/.test(pathname)) {
    return 'pinned';
  }
  return null;
}

async function serveScript(
  request: Request,
  env: Env,
  kind: 'latest' | 'pinned',
): Promise<Response> {
  const key = kind === 'pinned' ? `v${PINNED_VERSION}/track.js` : LATEST_SCRIPT_KEY;
  const stored = await env.CDN?.get(key);
  const body = stored ?? PLACEHOLDER_SCRIPT;
  const etag = `"${await sha256Hex(body)}"`;

  const headers = new Headers({
    'Cache-Control': kind === 'pinned' ? PINNED_CACHE_CONTROL : LATEST_CACHE_CONTROL,
    'Content-Type': SCRIPT_CONTENT_TYPE,
    'Access-Control-Allow-Origin': ALLOW_ORIGIN,
    'Vary': 'Accept-Encoding',
    'ETag': etag,
  });

  if (request.headers.get('If-None-Match') === etag) {
    return new Response(null, { status: 304, headers });
  }
  return new Response(body, { status: 200, headers });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === 'GET') {
      const kind = scriptCacheKind(url.pathname);
      if (kind !== null) {
        return serveScript(request, env, kind);
      }
    }

    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    const body = await request.text();
    const fingerprint = await sha256Hex(body);

    return Response.json({
      ok: true,
      fingerprint,
      path: url.pathname,
      apiKeyConfigured: Boolean(env.INGESTION_API_KEY),
    });
  },
};