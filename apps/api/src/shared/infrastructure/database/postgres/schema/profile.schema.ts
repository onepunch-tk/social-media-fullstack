import { pgTable, text, varchar } from 'drizzle-orm/pg-core';
import { dateColumns, idColumn } from './common.schema.js';

export const profiles = pgTable('profiles', {
  ...idColumn,
  handle: varchar('handle', { length: 15 }).notNull().unique(),
  name: varchar('name', { length: 50 }).notNull(),
  avatarUrl: text('avatar_url'),
  ...dateColumns,
});
