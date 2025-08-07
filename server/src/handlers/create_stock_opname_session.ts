import { db } from '../db';
import { stockOpnameSessionsTable, usersTable, locationsTable } from '../db/schema';
import { type CreateStockOpnameSessionInput, type StockOpnameSession } from '../schema';
import { eq } from 'drizzle-orm';

export const createStockOpnameSession = async (input: CreateStockOpnameSessionInput): Promise<StockOpnameSession> => {
  try {
    // Validate that user exists
    const userExists = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.user_id))
      .execute();

    if (userExists.length === 0) {
      throw new Error(`User with id ${input.user_id} does not exist`);
    }

    // Validate that location exists
    const locationExists = await db.select()
      .from(locationsTable)
      .where(eq(locationsTable.id, input.location_id))
      .execute();

    if (locationExists.length === 0) {
      throw new Error(`Location with id ${input.location_id} does not exist`);
    }

    // Insert stock opname session record
    const result = await db.insert(stockOpnameSessionsTable)
      .values({
        location_id: input.location_id,
        user_id: input.user_id,
        session_name: input.session_name,
        status: 'active' // Default status for new sessions
      })
      .returning()
      .execute();

    const session = result[0];
    return session;
  } catch (error) {
    console.error('Stock opname session creation failed:', error);
    throw error;
  }
};