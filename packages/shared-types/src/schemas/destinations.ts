import { z } from 'zod';

// Destinos individuais
export const MetaDestinationConfigSchema = z.object({
  enabled: z.boolean().default(false),
  pixel_id: z.string().min(1),
  access_token: z.string().min(1), // Armazenado criptografado no cofre
  test_event_code: z.string().optional(),
});

export const Ga4DestinationConfigSchema = z.object({
  enabled: z.boolean().default(false),
  measurement_id: z.string().min(1),
  api_secret: z.string().min(1),
  debug_mode: z.boolean().optional().default(false),
});

export const GoogleAdsDestinationConfigSchema = z.object({
  enabled: z.boolean().default(false),
  conversion_id: z.string().min(1),
  conversion_label: z.string().min(1),
  enhanced_conversions: z.boolean().default(true),
});

export const TikTokDestinationConfigSchema = z.object({
  enabled: z.boolean().default(false),
  pixel_code: z.string().min(1),
  access_token: z.string().min(1),
  test_event_code: z.string().optional(),
});

export type MetaDestinationConfig = z.infer<typeof MetaDestinationConfigSchema>;
export type Ga4DestinationConfig = z.infer<typeof Ga4DestinationConfigSchema>;
export type GoogleAdsDestinationConfig = z.infer<typeof GoogleAdsDestinationConfigSchema>;
export type TikTokDestinationConfig = z.infer<typeof TikTokDestinationConfigSchema>;