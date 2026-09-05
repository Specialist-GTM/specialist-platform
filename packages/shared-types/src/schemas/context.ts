import { z } from 'zod';

export const UtmParamsSchema = z
  .object({
    utm_source: z.string().optional(),
    utm_medium: z.string().optional(),
    utm_campaign: z.string().optional(),
    utm_term: z.string().optional(),
    utm_content: z.string().optional(),
  })
  .partial();

export const ContextPayloadSchema = z.object({
  ip: z.string().nullable().optional(),
  user_agent: z.string().nullable().optional(),
  locale: z.string().optional(),
  screen_resolution: z.string().optional(),
  session_id: z.string().optional(),
  utms: UtmParamsSchema.optional().default({}),
  cookies: z.record(z.string()).optional().default({}),
});

export type ContextPayload = z.infer<typeof ContextPayloadSchema>;