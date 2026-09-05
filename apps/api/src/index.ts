import { createServer } from 'node:http';
import type { Server } from 'node:http';
import { pathToFileURL } from 'node:url';
import { sha256Hex } from '@specialist-gtm/crypto-utils';
import { PLATFORM_VERSION } from '@specialist-gtm/shared-types';

export interface ApiConfig {
  port?: number;
}

function sendJson(
  res: {
    writeHead: (statusCode: number, headers: Record<string, string>) => void;
    end: (body: string) => void;
  },
  statusCode: number,
  body: unknown,
): void {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

export async function handleRequest(
  req: { method?: string; url?: string },
  res: {
    writeHead: (statusCode: number, headers: Record<string, string>) => void;
    end: (body: string) => void;
  },
): Promise<void> {
  if (req.method === 'GET' && req.url === '/health') {
    sendJson(res, 200, { status: 'ok', version: PLATFORM_VERSION });
    return;
  }

  if (req.method === 'GET' && req.url?.startsWith('/fingerprint/')) {
    const key = req.url.slice('/fingerprint/'.length);
    const fingerprint = await sha256Hex(key);
    sendJson(res, 200, { fingerprint });
    return;
  }

  sendJson(res, 404, { status: 'not_found' });
}

export function startServer(config: ApiConfig = {}): Server {
  const port = config.port ?? 3000;
  return createServer((req, res) => {
    void handleRequest(req, res);
  }).listen(port);
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  startServer();
}
