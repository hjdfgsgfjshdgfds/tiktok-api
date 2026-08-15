import { z } from 'zod';

export const lookupRequestSchema = z.object({
  query: z.string().min(1).max(500),
  includeRaw: z.boolean().default(false),
});

const mediaSchema = z
  .object({
    url_list: z.array(z.string()).optional(),
  })
  .passthrough();

export const legacyUserSchema = z
  .object({
    avatar_larger: mediaSchema.optional(),
    avatar_medium: mediaSchema.optional(),
    avatar_thumb: mediaSchema.optional(),
    aweme_count: z.number().optional(),
    create_time: z.number().optional(),
    custom_verify: z.string().optional(),
    favoriting_count: z.number().optional(),
    follower_count: z.number().optional(),
    following_count: z.number().optional(),
    is_verified: z.boolean().optional(),
    nickname: z.string().optional(),
    region: z.string().optional(),
    secret: z.number().optional(),
    signature: z.string().optional(),
    total_favorited: z.number().optional(),
    uid: z.string().optional(),
    unique_id: z.string().optional(),
  })
  .passthrough();

export const legacyPostSchema = z
  .object({
    author: legacyUserSchema.optional(),
    author_user_id: z.string().optional(),
    aweme_id: z.string(),
    aweme_type: z.number().optional(),
    create_time: z.number().optional(),
    desc: z.string().optional(),
    music: z.record(z.unknown()).optional(),
    prevent_download: z.boolean().optional(),
    region: z.string().optional(),
    statistics: z.record(z.unknown()).optional(),
    status: z.record(z.unknown()).optional(),
    video: z.record(z.unknown()).optional(),
  })
  .passthrough();

export const signerResponseSchema = z.object({
  signedUrl: z.string().url(),
});
