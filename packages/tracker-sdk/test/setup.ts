import { vi } from 'vitest';

vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 200 })));