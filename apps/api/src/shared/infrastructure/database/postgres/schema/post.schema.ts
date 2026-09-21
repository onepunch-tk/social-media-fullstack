import { index, integer, pgTable, primaryKey, text, uuid } from 'drizzle-orm/pg-core';
import { dateColumns, idColumn } from './common.schema';
import { profiles } from './profile.schema';

export const posts = pgTable('posts', {
  ...idColumn,
  authorId: uuid('author_id')
    .references(() => profiles.id, { onDelete: 'cascade' })
    .notNull(),
  content: text('content').notNull(),
  ...dateColumns,
});

export const postLikes = pgTable(
  'post_likes',
  {
    profileId: uuid('profile_id').references(() => profiles.id, { onDelete: 'cascade' }),
    postId: uuid('post_id').references(() => posts.id),
    createdAt: dateColumns.createdAt,
  },
  (table) => [primaryKey({ columns: [table.profileId, table.postId] }), index().on(table.postId)],
);

export const postCounters = pgTable('post_counters', {
  postId: uuid('post_id')
    .primaryKey()
    .references(() => posts.id, { onDelete: 'cascade' }),
  likesCount: integer('likes_count')
    .notNull()
    .$defaultFn(() => 0),
});
