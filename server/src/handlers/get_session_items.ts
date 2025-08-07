import { db } from '../db';
import { stockOpnameItemsTable, stockOpnameSessionsTable } from '../db/schema';
import { type GetSessionItemsInput, type StockOpnameItem } from '../schema';
import { eq } from 'drizzle-orm';

export const getSessionItems = async (input: GetSessionItemsInput): Promise<StockOpnameItem[]> => {
  try {
    // First, validate that the session exists
    const sessionExists = await db.select()
      .from(stockOpnameSessionsTable)
      .where(eq(stockOpnameSessionsTable.id, input.session_id))
      .execute();

    if (sessionExists.length === 0) {
      throw new Error(`Stock opname session with ID ${input.session_id} not found`);
    }

    // Fetch all items for the session, ordered by scan time (most recent first)
    const items = await db.select()
      .from(stockOpnameItemsTable)
      .where(eq(stockOpnameItemsTable.session_id, input.session_id))
      .orderBy(stockOpnameItemsTable.scanned_at)
      .execute();

    return items;
  } catch (error) {
    console.error('Failed to get session items:', error);
    throw error;
  }
};