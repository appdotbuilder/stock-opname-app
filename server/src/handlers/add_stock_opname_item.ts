import { db } from '../db';
import { stockOpnameSessionsTable, stockOpnameItemsTable } from '../db/schema';
import { type AddStockOpnameItemInput, type StockOpnameItem } from '../schema';
import { eq } from 'drizzle-orm';

export const addStockOpnameItem = async (input: AddStockOpnameItemInput): Promise<StockOpnameItem> => {
  try {
    // First, validate that the session exists and is active
    const sessions = await db.select()
      .from(stockOpnameSessionsTable)
      .where(eq(stockOpnameSessionsTable.id, input.session_id))
      .execute();

    if (sessions.length === 0) {
      throw new Error('Stock opname session not found');
    }

    const session = sessions[0];
    if (session.status !== 'active') {
      throw new Error('Cannot add items to inactive session');
    }

    // Insert the stock opname item
    const result = await db.insert(stockOpnameItemsTable)
      .values({
        session_id: input.session_id,
        sku: input.sku,
        lot_number: input.lot_number,
        quantity: input.quantity,
        barcode_data: input.barcode_data,
        scanned_at: new Date() // Set current timestamp for when item was scanned
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Add stock opname item failed:', error);
    throw error;
  }
};