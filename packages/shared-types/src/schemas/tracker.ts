import { z } from 'zod';

export const TrackerPayloadSchema = z.object({
  event_name: z.string().min(1, 'Nome do evento é obrigatório'),
  event_id: z.string().min(1, 'ID do evento é obrigatório'),
  url: z.string().url('URL inválida').or(z.string().min(1)),
  referrer: z.string().nullable().optional(),
  timestamp: z.union([z.number().int().positive(), z.string().datetime()]),
  custom_data: z.record(z.unknown()).optional().default({}),
});

export type TrackerPayload = z.infer<typeof TrackerPayloadSchema>;