import { index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { accounts } from './account.schema';
import { idColumn } from './common.schema';

export const refreshTokens = pgTable(
  'refresh_tokens',
  {
    ...idColumn,
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull().unique(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('refresh_tokens_expires_at_idx').on(t.expiresAt)],
);
