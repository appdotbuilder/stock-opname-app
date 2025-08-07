import { serial, text, pgTable, timestamp, integer, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const sessionStatusEnum = pgEnum('session_status', ['active', 'completed', 'cancelled']);

// Users table
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  username: text('username').notNull().unique(),
  email: text('email').notNull().unique(),
  full_name: text('full_name').notNull(),
  password_hash: text('password_hash').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Locations table
export const locationsTable = pgTable('locations', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  code: text('code').notNull().unique(),
  description: text('description'), // Nullable by default
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Stock opname sessions table
export const stockOpnameSessionsTable = pgTable('stock_opname_sessions', {
  id: serial('id').primaryKey(),
  location_id: integer('location_id').notNull().references(() => locationsTable.id),
  user_id: integer('user_id').notNull().references(() => usersTable.id),
  session_name: text('session_name').notNull(),
  status: sessionStatusEnum('status').notNull().default('active'),
  started_at: timestamp('started_at').defaultNow().notNull(),
  completed_at: timestamp('completed_at'), // Nullable - only set when session is completed
  signature_data: text('signature_data'), // Nullable - Base64 encoded signature image
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Stock opname items table
export const stockOpnameItemsTable = pgTable('stock_opname_items', {
  id: serial('id').primaryKey(),
  session_id: integer('session_id').notNull().references(() => stockOpnameSessionsTable.id),
  sku: text('sku').notNull(),
  lot_number: text('lot_number').notNull(),
  quantity: integer('quantity').notNull(),
  barcode_data: text('barcode_data').notNull(),
  scanned_at: timestamp('scanned_at').defaultNow().notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(usersTable, ({ many }) => ({
  sessions: many(stockOpnameSessionsTable),
}));

export const locationsRelations = relations(locationsTable, ({ many }) => ({
  sessions: many(stockOpnameSessionsTable),
}));

export const stockOpnameSessionsRelations = relations(stockOpnameSessionsTable, ({ one, many }) => ({
  user: one(usersTable, {
    fields: [stockOpnameSessionsTable.user_id],
    references: [usersTable.id],
  }),
  location: one(locationsTable, {
    fields: [stockOpnameSessionsTable.location_id],
    references: [locationsTable.id],
  }),
  items: many(stockOpnameItemsTable),
}));

export const stockOpnameItemsRelations = relations(stockOpnameItemsTable, ({ one }) => ({
  session: one(stockOpnameSessionsTable, {
    fields: [stockOpnameItemsTable.session_id],
    references: [stockOpnameSessionsTable.id],
  }),
}));

// TypeScript types for the table schemas
export type User = typeof usersTable.$inferSelect;
export type NewUser = typeof usersTable.$inferInsert;

export type Location = typeof locationsTable.$inferSelect;
export type NewLocation = typeof locationsTable.$inferInsert;

export type StockOpnameSession = typeof stockOpnameSessionsTable.$inferSelect;
export type NewStockOpnameSession = typeof stockOpnameSessionsTable.$inferInsert;

export type StockOpnameItem = typeof stockOpnameItemsTable.$inferSelect;
export type NewStockOpnameItem = typeof stockOpnameItemsTable.$inferInsert;

// Export all tables and relations for proper query building
export const tables = {
  users: usersTable,
  locations: locationsTable,
  stockOpnameSessions: stockOpnameSessionsTable,
  stockOpnameItems: stockOpnameItemsTable,
};

export const relations_exports = {
  usersRelations,
  locationsRelations,
  stockOpnameSessionsRelations,
  stockOpnameItemsRelations,
};