import { timestamp, uuid } from 'drizzle-orm/pg-core';

export const dateColumns = {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
};

export const idColumn = {
  id: uuid('id').primaryKey(),
};
