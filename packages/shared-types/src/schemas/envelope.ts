import { z } from 'zod';

import { ContextPayloadSchema } from './context.js';
import { TrackerPayloadSchema } from './tracker.js';
import { UserDataPayloadSchema } from './user.js';

export const UnifiedEventEnvelopeSchema = z.object({
  data_key: z.string().min(1, 'data_key é obrigatório'),
  container_id: z.string().optional(),
  received_at: z.string().datetime().optional(),
  tracker: TrackerPayloadSchema,
  user_data: UserDataPayloadSchema.optional().default({}),
  context: ContextPayloadSchema.optional().default({}),
});

export type UnifiedEventEnvelope = z.infer<typeof UnifiedEventEnvelopeSchema>;