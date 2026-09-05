import { sha256Hex } from '@specialist-gtm/crypto-utils';

export interface Env {
  INGESTION_API_KEY?: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    const body = await request.text();
    const fingerprint = await sha256Hex(body);
    const url = new URL(request.url);

    return Response.json({
      ok: true,
      fingerprint,
      path: url.pathname,
      apiKeyConfigured: Boolean(env.INGESTION_API_KEY),
    });
  },
};
