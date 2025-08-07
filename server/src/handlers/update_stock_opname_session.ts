import { db } from '../db';
import { stockOpnameSessionsTable } from '../db/schema';
import { type UpdateStockOpnameSessionInput, type StockOpnameSession } from '../schema';
import { eq } from 'drizzle-orm';

export const updateStockOpnameSession = async (input: UpdateStockOpnameSessionInput): Promise<StockOpnameSession> => {
  try {
    // First, verify the session exists
    const existingSessions = await db.select()
      .from(stockOpnameSessionsTable)
      .where(eq(stockOpnameSessionsTable.id, input.id))
      .execute();

    if (existingSessions.length === 0) {
      throw new Error(`Stock opname session with ID ${input.id} not found`);
    }

    // Build update values object dynamically based on provided fields
    const updateValues: Partial<typeof stockOpnameSessionsTable.$inferInsert> = {
      updated_at: new Date()
    };

    if (input.status !== undefined) {
      updateValues.status = input.status;
    }

    if (input.signature_data !== undefined) {
      updateValues.signature_data = input.signature_data;
    }

    if (input.completed_at !== undefined) {
      updateValues.completed_at = input.completed_at;
    }

    // If status is being set to 'completed' and completed_at is not provided, set it to current time
    if (input.status === 'completed' && input.completed_at === undefined) {
      updateValues.completed_at = new Date();
    }

    // Update the session
    const result = await db.update(stockOpnameSessionsTable)
      .set(updateValues)
      .where(eq(stockOpnameSessionsTable.id, input.id))
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Stock opname session update failed:', error);
    throw error;
  }
};