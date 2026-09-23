import { pgTable, text, uuid, varchar } from 'drizzle-orm/pg-core';
import { accounts } from './account.schema';
import { dateColumns } from './common.schema';

export const PROFILES_HANDLE_UNIQUE = 'profiles_handle_unique';

export const profiles = pgTable('profiles', {
  id: uuid('id')
    .primaryKey()
    .references(() => accounts.id, { onDelete: 'cascade' }),
  handle: varchar('handle', { length: 15 }).notNull().unique(PROFILES_HANDLE_UNIQUE),
  name: varchar('name', { length: 50 }).notNull(),
  avatarUrl: text('avatar_url'),
  ...dateColumns,
});
