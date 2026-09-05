import { z } from 'zod';

const SHA256_REGEX = /^[a-f0-9]{64}$/i;
export const Sha256HashSchema = z.string().regex(SHA256_REGEX, 'Hash SHA-256 inválido');

export const UserDataPayloadSchema = z
  .object({
    em_hash: Sha256HashSchema.nullable().optional(), // email hash
    ph_hash: Sha256HashSchema.nullable().optional(), // phone hash
    fn_hash: Sha256HashSchema.nullable().optional(), // first name hash
    ln_hash: Sha256HashSchema.nullable().optional(), // last name hash
    fbp: z.string().nullable().optional(), // _fbp cookie
    fbc: z.string().nullable().optional(), // _fbc cookie
    client_id: z.string().nullable().optional(), // GA4 client_id
    external_id: z.string().nullable().optional(),
    lead_id: z.string().nullable().optional(),
    gclid: z.string().nullable().optional(),
    ttclid: z.string().nullable().optional(),
  })
  .passthrough();

export type UserDataPayload = z.infer<typeof UserDataPayloadSchema>;