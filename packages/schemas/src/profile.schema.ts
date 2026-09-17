import { z } from 'zod';

export const ProfileSchema = z.object({
  id: z.uuid(),
  handle: z.string().regex(/^[a-z0-9_]{3,15}$/),
  name: z.string().min(1).max(50),
  avatarUrl: z.string().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export type Profile = z.infer<typeof ProfileSchema>;
export type RegisterProfileDto = Pick<Profile, 'handle' | 'name' | 'avatarUrl'>;
