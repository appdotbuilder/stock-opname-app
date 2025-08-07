import { z } from 'zod';

// User schema
export const userSchema = z.object({
  id: z.number(),
  username: z.string(),
  email: z.string(),
  full_name: z.string(),
  password_hash: z.string(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type User = z.infer<typeof userSchema>;

// Location schema
export const locationSchema = z.object({
  id: z.number(),
  name: z.string(),
  code: z.string(),
  description: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Location = z.infer<typeof locationSchema>;

// Stock opname session schema
export const stockOpnameSessionSchema = z.object({
  id: z.number(),
  location_id: z.number(),
  user_id: z.number(),
  session_name: z.string(),
  status: z.enum(['active', 'completed', 'cancelled']),
  started_at: z.coerce.date(),
  completed_at: z.coerce.date().nullable(),
  signature_data: z.string().nullable(), // Base64 encoded signature image
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type StockOpnameSession = z.infer<typeof stockOpnameSessionSchema>;

// Stock opname item schema
export const stockOpnameItemSchema = z.object({
  id: z.number(),
  session_id: z.number(),
  sku: z.string(),
  lot_number: z.string(),
  quantity: z.number().int().nonnegative(),
  barcode_data: z.string(),
  scanned_at: z.coerce.date(),
  created_at: z.coerce.date()
});

export type StockOpnameItem = z.infer<typeof stockOpnameItemSchema>;

// Input schemas for creating/updating records

// User authentication input
export const loginInputSchema = z.object({
  username: z.string(),
  password: z.string()
});

export type LoginInput = z.infer<typeof loginInputSchema>;

// Create user input
export const createUserInputSchema = z.object({
  username: z.string(),
  email: z.string().email(),
  full_name: z.string(),
  password: z.string().min(6)
});

export type CreateUserInput = z.infer<typeof createUserInputSchema>;

// Create location input
export const createLocationInputSchema = z.object({
  name: z.string(),
  code: z.string(),
  description: z.string().nullable().optional()
});

export type CreateLocationInput = z.infer<typeof createLocationInputSchema>;

// Create stock opname session input
export const createStockOpnameSessionInputSchema = z.object({
  location_id: z.number(),
  user_id: z.number(),
  session_name: z.string()
});

export type CreateStockOpnameSessionInput = z.infer<typeof createStockOpnameSessionInputSchema>;

// Update stock opname session input
export const updateStockOpnameSessionInputSchema = z.object({
  id: z.number(),
  status: z.enum(['active', 'completed', 'cancelled']).optional(),
  signature_data: z.string().nullable().optional(),
  completed_at: z.coerce.date().nullable().optional()
});

export type UpdateStockOpnameSessionInput = z.infer<typeof updateStockOpnameSessionInputSchema>;

// Add stock opname item input
export const addStockOpnameItemInputSchema = z.object({
  session_id: z.number(),
  sku: z.string(),
  lot_number: z.string(),
  quantity: z.number().int().nonnegative(),
  barcode_data: z.string()
});

export type AddStockOpnameItemInput = z.infer<typeof addStockOpnameItemInputSchema>;

// Get session items input
export const getSessionItemsInputSchema = z.object({
  session_id: z.number()
});

export type GetSessionItemsInput = z.infer<typeof getSessionItemsInputSchema>;

// Generate report input
export const generateReportInputSchema = z.object({
  session_id: z.number(),
  format: z.enum(['excel', 'pdf'])
});

export type GenerateReportInput = z.infer<typeof generateReportInputSchema>;

// Session with relations
export const sessionWithRelationsSchema = stockOpnameSessionSchema.extend({
  location: locationSchema,
  user: userSchema.omit({ password_hash: true }),
  items: z.array(stockOpnameItemSchema)
});

export type SessionWithRelations = z.infer<typeof sessionWithRelationsSchema>;