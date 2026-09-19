import { pgTable, text, varchar } from 'drizzle-orm/pg-core';
import { dateColumns, idColumn } from './common.schema.js';

export const ACCOUNTS_EMAIL_UNIQUE = 'accounts_email_unique';

export const accounts = pgTable('accounts', {
  ...idColumn,
  email: varchar('email', { length: 255 }).notNull().unique(ACCOUNTS_EMAIL_UNIQUE),
  passwordHash: text('password_hash').notNull(),
  ...dateColumns,
});
