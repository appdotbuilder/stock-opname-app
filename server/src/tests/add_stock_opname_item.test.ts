import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, locationsTable, stockOpnameSessionsTable, stockOpnameItemsTable } from '../db/schema';
import { type AddStockOpnameItemInput } from '../schema';
import { addStockOpnameItem } from '../handlers/add_stock_opname_item';
import { eq } from 'drizzle-orm';

describe('addStockOpnameItem', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: number;
  let testLocationId: number;
  let activeSessionId: number;
  let completedSessionId: number;

  beforeEach(async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        full_name: 'Test User',
        password_hash: 'hashedpassword123'
      })
      .returning()
      .execute();
    testUserId = userResult[0].id;

    // Create test location
    const locationResult = await db.insert(locationsTable)
      .values({
        name: 'Test Warehouse',
        code: 'TW01',
        description: 'Test warehouse location'
      })
      .returning()
      .execute();
    testLocationId = locationResult[0].id;

    // Create active test session
    const activeSessionResult = await db.insert(stockOpnameSessionsTable)
      .values({
        location_id: testLocationId,
        user_id: testUserId,
        session_name: 'Active Test Session',
        status: 'active'
      })
      .returning()
      .execute();
    activeSessionId = activeSessionResult[0].id;

    // Create completed test session for negative testing
    const completedSessionResult = await db.insert(stockOpnameSessionsTable)
      .values({
        location_id: testLocationId,
        user_id: testUserId,
        session_name: 'Completed Test Session',
        status: 'completed',
        completed_at: new Date()
      })
      .returning()
      .execute();
    completedSessionId = completedSessionResult[0].id;
  });

  const testInput: AddStockOpnameItemInput = {
    session_id: 0, // Will be set in tests
    sku: 'SKU-12345',
    lot_number: 'LOT-2024-001',
    quantity: 50,
    barcode_data: 'barcode123456789'
  };

  it('should add item to active session', async () => {
    const input = { ...testInput, session_id: activeSessionId };
    const result = await addStockOpnameItem(input);

    // Verify returned data
    expect(result.id).toBeDefined();
    expect(result.session_id).toEqual(activeSessionId);
    expect(result.sku).toEqual('SKU-12345');
    expect(result.lot_number).toEqual('LOT-2024-001');
    expect(result.quantity).toEqual(50);
    expect(result.barcode_data).toEqual('barcode123456789');
    expect(result.scanned_at).toBeInstanceOf(Date);
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save item to database', async () => {
    const input = { ...testInput, session_id: activeSessionId };
    const result = await addStockOpnameItem(input);

    // Verify item was saved to database
    const items = await db.select()
      .from(stockOpnameItemsTable)
      .where(eq(stockOpnameItemsTable.id, result.id))
      .execute();

    expect(items).toHaveLength(1);
    expect(items[0].session_id).toEqual(activeSessionId);
    expect(items[0].sku).toEqual('SKU-12345');
    expect(items[0].lot_number).toEqual('LOT-2024-001');
    expect(items[0].quantity).toEqual(50);
    expect(items[0].barcode_data).toEqual('barcode123456789');
    expect(items[0].scanned_at).toBeInstanceOf(Date);
    expect(items[0].created_at).toBeInstanceOf(Date);
  });

  it('should throw error for non-existent session', async () => {
    const input = { ...testInput, session_id: 99999 };

    await expect(addStockOpnameItem(input)).rejects.toThrow(/session not found/i);
  });

  it('should throw error for inactive session', async () => {
    const input = { ...testInput, session_id: completedSessionId };

    await expect(addStockOpnameItem(input)).rejects.toThrow(/cannot add items to inactive session/i);
  });

  it('should handle cancelled session', async () => {
    // Create cancelled session
    const cancelledSessionResult = await db.insert(stockOpnameSessionsTable)
      .values({
        location_id: testLocationId,
        user_id: testUserId,
        session_name: 'Cancelled Test Session',
        status: 'cancelled'
      })
      .returning()
      .execute();

    const input = { ...testInput, session_id: cancelledSessionResult[0].id };

    await expect(addStockOpnameItem(input)).rejects.toThrow(/cannot add items to inactive session/i);
  });

  it('should handle multiple items in same session', async () => {
    const input1 = { ...testInput, session_id: activeSessionId, sku: 'SKU-001' };
    const input2 = { ...testInput, session_id: activeSessionId, sku: 'SKU-002' };

    const result1 = await addStockOpnameItem(input1);
    const result2 = await addStockOpnameItem(input2);

    expect(result1.id).not.toEqual(result2.id);
    expect(result1.session_id).toEqual(activeSessionId);
    expect(result2.session_id).toEqual(activeSessionId);
    expect(result1.sku).toEqual('SKU-001');
    expect(result2.sku).toEqual('SKU-002');

    // Verify both items exist in database
    const items = await db.select()
      .from(stockOpnameItemsTable)
      .where(eq(stockOpnameItemsTable.session_id, activeSessionId))
      .execute();

    expect(items).toHaveLength(2);
  });

  it('should set scanned_at timestamp correctly', async () => {
    const beforeScan = new Date();
    const input = { ...testInput, session_id: activeSessionId };
    const result = await addStockOpnameItem(input);
    const afterScan = new Date();

    expect(result.scanned_at.getTime()).toBeGreaterThanOrEqual(beforeScan.getTime());
    expect(result.scanned_at.getTime()).toBeLessThanOrEqual(afterScan.getTime());
  });
});