import { z } from 'zod';

import {
  Ga4DestinationConfigSchema,
  GoogleAdsDestinationConfigSchema,
  MetaDestinationConfigSchema,
  TikTokDestinationConfigSchema,
} from './destinations.js';

export const ContainerRulesSchema = z.object({
  track_whatsapp_clicks: z.boolean().default(true),
  track_forms: z.boolean().default(true),
  track_elementor_ajax: z.boolean().default(true),
  track_phone_clicks: z.boolean().default(true),
  auto_hash_pii: z.boolean().default(true),
});

export const ContainerConfigSchema = z.object({
  container_id: z.string().uuid(),
  data_key: z.string().min(1),
  domain: z.string().min(1),
  rules: ContainerRulesSchema.default({}),
  destinations: z
    .object({
      meta: MetaDestinationConfigSchema.optional(),
      ga4: Ga4DestinationConfigSchema.optional(),
      google_ads: GoogleAdsDestinationConfigSchema.optional(),
      tiktok: TikTokDestinationConfigSchema.optional(),
    })
    .default({}),
});

export type ContainerRules = z.infer<typeof ContainerRulesSchema>;
export type ContainerConfig = z.infer<typeof ContainerConfigSchema>;