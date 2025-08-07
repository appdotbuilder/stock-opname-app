import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { 
  usersTable, 
  locationsTable, 
  stockOpnameSessionsTable,
  stockOpnameItemsTable 
} from '../db/schema';
import { type GetSessionItemsInput } from '../schema';
import { getSessionItems } from '../handlers/get_session_items';

describe('getSessionItems', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  const testInput: GetSessionItemsInput = {
    session_id: 1
  };

  it('should return empty array for session with no items', async () => {
    // Create test user
    const [user] = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        full_name: 'Test User',
        password_hash: 'hashedpassword'
      })
      .returning()
      .execute();

    // Create test location
    const [location] = await db.insert(locationsTable)
      .values({
        name: 'Test Location',
        code: 'LOC001',
        description: 'Test location description'
      })
      .returning()
      .execute();

    // Create test session
    const [session] = await db.insert(stockOpnameSessionsTable)
      .values({
        location_id: location.id,
        user_id: user.id,
        session_name: 'Test Session'
      })
      .returning()
      .execute();

    const result = await getSessionItems({ session_id: session.id });

    expect(result).toEqual([]);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should return all items for a session', async () => {
    // Create test user
    const [user] = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        full_name: 'Test User',
        password_hash: 'hashedpassword'
      })
      .returning()
      .execute();

    // Create test location
    const [location] = await db.insert(locationsTable)
      .values({
        name: 'Test Location',
        code: 'LOC001',
        description: 'Test location description'
      })
      .returning()
      .execute();

    // Create test session
    const [session] = await db.insert(stockOpnameSessionsTable)
      .values({
        location_id: location.id,
        user_id: user.id,
        session_name: 'Test Session'
      })
      .returning()
      .execute();

    // Create test items
    const testItems = [
      {
        session_id: session.id,
        sku: 'SKU001',
        lot_number: 'LOT2024001',
        quantity: 10,
        barcode_data: '1234567890123'
      },
      {
        session_id: session.id,
        sku: 'SKU002',
        lot_number: 'LOT2024002',
        quantity: 25,
        barcode_data: '2345678901234'
      },
      {
        session_id: session.id,
        sku: 'SKU003',
        lot_number: 'LOT2024003',
        quantity: 5,
        barcode_data: '3456789012345'
      }
    ];

    await db.insert(stockOpnameItemsTable)
      .values(testItems)
      .execute();

    const result = await getSessionItems({ session_id: session.id });

    expect(result).toHaveLength(3);
    expect(result[0]).toMatchObject({
      session_id: session.id,
      sku: 'SKU001',
      lot_number: 'LOT2024001',
      quantity: 10,
      barcode_data: '1234567890123'
    });
    expect(result[1]).toMatchObject({
      session_id: session.id,
      sku: 'SKU002',
      lot_number: 'LOT2024002',
      quantity: 25,
      barcode_data: '2345678901234'
    });
    expect(result[2]).toMatchObject({
      session_id: session.id,
      sku: 'SKU003',
      lot_number: 'LOT2024003',
      quantity: 5,
      barcode_data: '3456789012345'
    });

    // Verify all items have required timestamp fields
    result.forEach(item => {
      expect(item.id).toBeDefined();
      expect(item.scanned_at).toBeInstanceOf(Date);
      expect(item.created_at).toBeInstanceOf(Date);
    });
  });

  it('should return items ordered by scan time', async () => {
    // Create test user
    const [user] = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        full_name: 'Test User',
        password_hash: 'hashedpassword'
      })
      .returning()
      .execute();

    // Create test location
    const [location] = await db.insert(locationsTable)
      .values({
        name: 'Test Location',
        code: 'LOC001',
        description: 'Test location description'
      })
      .returning()
      .execute();

    // Create test session
    const [session] = await db.insert(stockOpnameSessionsTable)
      .values({
        location_id: location.id,
        user_id: user.id,
        session_name: 'Test Session'
      })
      .returning()
      .execute();

    // Create items with specific scan times
    const now = new Date();
    const earlier = new Date(now.getTime() - 60000); // 1 minute earlier
    const latest = new Date(now.getTime() + 60000); // 1 minute later

    const testItems = [
      {
        session_id: session.id,
        sku: 'SKU002',
        lot_number: 'LOT002',
        quantity: 20,
        barcode_data: '2222222222222',
        scanned_at: latest
      },
      {
        session_id: session.id,
        sku: 'SKU001',
        lot_number: 'LOT001',
        quantity: 10,
        barcode_data: '1111111111111',
        scanned_at: earlier
      },
      {
        session_id: session.id,
        sku: 'SKU003',
        lot_number: 'LOT003',
        quantity: 30,
        barcode_data: '3333333333333',
        scanned_at: now
      }
    ];

    await db.insert(stockOpnameItemsTable)
      .values(testItems)
      .execute();

    const result = await getSessionItems({ session_id: session.id });

    expect(result).toHaveLength(3);
    // Should be ordered by scanned_at (earliest first based on our ORDER BY)
    expect(result[0].sku).toBe('SKU001'); // earliest
    expect(result[1].sku).toBe('SKU003'); // middle
    expect(result[2].sku).toBe('SKU002'); // latest
  });

  it('should throw error for non-existent session', async () => {
    const nonExistentSessionId = 999;

    await expect(getSessionItems({ session_id: nonExistentSessionId }))
      .rejects.toThrow(/session with ID 999 not found/i);
  });

  it('should only return items for the specific session', async () => {
    // Create test user
    const [user] = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        full_name: 'Test User',
        password_hash: 'hashedpassword'
      })
      .returning()
      .execute();

    // Create test location
    const [location] = await db.insert(locationsTable)
      .values({
        name: 'Test Location',
        code: 'LOC001',
        description: 'Test location description'
      })
      .returning()
      .execute();

    // Create two test sessions
    const [session1] = await db.insert(stockOpnameSessionsTable)
      .values({
        location_id: location.id,
        user_id: user.id,
        session_name: 'Test Session 1'
      })
      .returning()
      .execute();

    const [session2] = await db.insert(stockOpnameSessionsTable)
      .values({
        location_id: location.id,
        user_id: user.id,
        session_name: 'Test Session 2'
      })
      .returning()
      .execute();

    // Add items to both sessions
    await db.insert(stockOpnameItemsTable)
      .values([
        {
          session_id: session1.id,
          sku: 'SKU001',
          lot_number: 'LOT001',
          quantity: 10,
          barcode_data: '1111111111111'
        },
        {
          session_id: session1.id,
          sku: 'SKU002',
          lot_number: 'LOT002',
          quantity: 20,
          barcode_data: '2222222222222'
        },
        {
          session_id: session2.id,
          sku: 'SKU003',
          lot_number: 'LOT003',
          quantity: 30,
          barcode_data: '3333333333333'
        }
      ])
      .execute();

    // Get items for session1 only
    const result = await getSessionItems({ session_id: session1.id });

    expect(result).toHaveLength(2);
    expect(result.every(item => item.session_id === session1.id)).toBe(true);
    expect(result.some(item => item.sku === 'SKU001')).toBe(true);
    expect(result.some(item => item.sku === 'SKU002')).toBe(true);
    expect(result.some(item => item.sku === 'SKU003')).toBe(false); // Should not include session2 items
  });
});