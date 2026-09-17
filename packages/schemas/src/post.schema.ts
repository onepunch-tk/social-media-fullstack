import { z } from 'zod';
import { ProfileSchema } from './profile.schema.js';

export const PostSchema = z.object({
  id: z.uuid(),
  author: ProfileSchema,
  content: z.string().min(1).max(280),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  likesCount: z.int().nonnegative(),
  isLiked: z.boolean(),
});

export const FeedResponseSchema = z.object({
  items: z.array(PostSchema),
});

export type Post = z.infer<typeof PostSchema>;
export type FeedResponse = z.infer<typeof FeedResponseSchema>;
