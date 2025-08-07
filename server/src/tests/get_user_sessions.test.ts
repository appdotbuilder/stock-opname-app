import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, locationsTable, stockOpnameSessionsTable, stockOpnameItemsTable } from '../db/schema';
import { getUserSessions } from '../handlers/get_user_sessions';
import { eq } from 'drizzle-orm';

describe('getUserSessions', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when user has no sessions', async () => {
    // Create a user but no sessions
    const [user] = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        full_name: 'Test User',
        password_hash: 'hashed_password'
      })
      .returning()
      .execute();

    const result = await getUserSessions(user.id);

    expect(result).toEqual([]);
  });

  it('should return sessions with location and user data for valid user', async () => {
    // Create prerequisite data
    const [user] = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        full_name: 'Test User',
        password_hash: 'hashed_password'
      })
      .returning()
      .execute();

    const [location] = await db.insert(locationsTable)
      .values({
        name: 'Warehouse A',
        code: 'WH-A',
        description: 'Main warehouse facility'
      })
      .returning()
      .execute();

    // Create a session
    const [session] = await db.insert(stockOpnameSessionsTable)
      .values({
        location_id: location.id,
        user_id: user.id,
        session_name: 'Morning Count - Warehouse A',
        status: 'active'
      })
      .returning()
      .execute();

    const result = await getUserSessions(user.id);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: session.id,
      location_id: location.id,
      user_id: user.id,
      session_name: 'Morning Count - Warehouse A',
      status: 'active',
      location: {
        id: location.id,
        name: 'Warehouse A',
        code: 'WH-A',
        description: 'Main warehouse facility'
      },
      user: {
        id: user.id,
        username: 'testuser',
        email: 'test@example.com',
        full_name: 'Test User'
      },
      items: []
    });

    // Verify dates are present
    expect(result[0].started_at).toBeInstanceOf(Date);
    expect(result[0].created_at).toBeInstanceOf(Date);
    expect(result[0].updated_at).toBeInstanceOf(Date);
    expect(result[0].location.created_at).toBeInstanceOf(Date);
    expect(result[0].user.created_at).toBeInstanceOf(Date);

    // Verify nullable fields
    expect(result[0].completed_at).toBeNull();
    expect(result[0].signature_data).toBeNull();

    // Verify password_hash is not included in user data
    expect('password_hash' in result[0].user).toBe(false);
  });

  it('should include session items when they exist', async () => {
    // Create prerequisite data
    const [user] = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        full_name: 'Test User',
        password_hash: 'hashed_password'
      })
      .returning()
      .execute();

    const [location] = await db.insert(locationsTable)
      .values({
        name: 'Warehouse A',
        code: 'WH-A',
        description: 'Main warehouse facility'
      })
      .returning()
      .execute();

    const [session] = await db.insert(stockOpnameSessionsTable)
      .values({
        location_id: location.id,
        user_id: user.id,
        session_name: 'Morning Count - Warehouse A',
        status: 'active'
      })
      .returning()
      .execute();

    // Add items to the session
    const [item1] = await db.insert(stockOpnameItemsTable)
      .values({
        session_id: session.id,
        sku: 'SKU001',
        lot_number: 'LOT001',
        quantity: 10,
        barcode_data: 'BARCODE001'
      })
      .returning()
      .execute();

    const [item2] = await db.insert(stockOpnameItemsTable)
      .values({
        session_id: session.id,
        sku: 'SKU002',
        lot_number: 'LOT002',
        quantity: 25,
        barcode_data: 'BARCODE002'
      })
      .returning()
      .execute();

    const result = await getUserSessions(user.id);

    expect(result).toHaveLength(1);
    expect(result[0].items).toHaveLength(2);

    // Verify items data
    const items = result[0].items;
    expect(items).toContainEqual(
      expect.objectContaining({
        id: item1.id,
        session_id: session.id,
        sku: 'SKU001',
        lot_number: 'LOT001',
        quantity: 10,
        barcode_data: 'BARCODE001'
      })
    );

    expect(items).toContainEqual(
      expect.objectContaining({
        id: item2.id,
        session_id: session.id,
        sku: 'SKU002',
        lot_number: 'LOT002',
        quantity: 25,
        barcode_data: 'BARCODE002'
      })
    );

    // Verify item dates
    items.forEach(item => {
      expect(item.scanned_at).toBeInstanceOf(Date);
      expect(item.created_at).toBeInstanceOf(Date);
    });
  });

  it('should handle multiple sessions for a user', async () => {
    // Create prerequisite data
    const [user] = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        full_name: 'Test User',
        password_hash: 'hashed_password'
      })
      .returning()
      .execute();

    const [location1] = await db.insert(locationsTable)
      .values({
        name: 'Warehouse A',
        code: 'WH-A',
        description: 'Main warehouse facility'
      })
      .returning()
      .execute();

    const [location2] = await db.insert(locationsTable)
      .values({
        name: 'Warehouse B',
        code: 'WH-B',
        description: 'Secondary warehouse'
      })
      .returning()
      .execute();

    // Create multiple sessions
    const [session1] = await db.insert(stockOpnameSessionsTable)
      .values({
        location_id: location1.id,
        user_id: user.id,
        session_name: 'Morning Count - Warehouse A',
        status: 'active'
      })
      .returning()
      .execute();

    const [session2] = await db.insert(stockOpnameSessionsTable)
      .values({
        location_id: location2.id,
        user_id: user.id,
        session_name: 'Evening Count - Warehouse B',
        status: 'completed'
      })
      .returning()
      .execute();

    // Add items to different sessions
    await db.insert(stockOpnameItemsTable)
      .values({
        session_id: session1.id,
        sku: 'SKU001',
        lot_number: 'LOT001',
        quantity: 10,
        barcode_data: 'BARCODE001'
      })
      .execute();

    await db.insert(stockOpnameItemsTable)
      .values({
        session_id: session2.id,
        sku: 'SKU002',
        lot_number: 'LOT002',
        quantity: 25,
        barcode_data: 'BARCODE002'
      })
      .execute();

    const result = await getUserSessions(user.id);

    expect(result).toHaveLength(2);

    // Find sessions by name for verification
    const session1Result = result.find(s => s.session_name === 'Morning Count - Warehouse A');
    const session2Result = result.find(s => s.session_name === 'Evening Count - Warehouse B');

    expect(session1Result).toBeDefined();
    expect(session2Result).toBeDefined();

    // Verify each session has correct location and items
    expect(session1Result!.location.name).toBe('Warehouse A');
    expect(session1Result!.status).toBe('active');
    expect(session1Result!.items).toHaveLength(1);
    expect(session1Result!.items[0].sku).toBe('SKU001');

    expect(session2Result!.location.name).toBe('Warehouse B');
    expect(session2Result!.status).toBe('completed');
    expect(session2Result!.items).toHaveLength(1);
    expect(session2Result!.items[0].sku).toBe('SKU002');
  });

  it('should not return sessions for other users', async () => {
    // Create two users
    const [user1] = await db.insert(usersTable)
      .values({
        username: 'user1',
        email: 'user1@example.com',
        full_name: 'User One',
        password_hash: 'hashed_password'
      })
      .returning()
      .execute();

    const [user2] = await db.insert(usersTable)
      .values({
        username: 'user2',
        email: 'user2@example.com',
        full_name: 'User Two',
        password_hash: 'hashed_password'
      })
      .returning()
      .execute();

    const [location] = await db.insert(locationsTable)
      .values({
        name: 'Warehouse A',
        code: 'WH-A',
        description: 'Main warehouse facility'
      })
      .returning()
      .execute();

    // Create sessions for both users
    await db.insert(stockOpnameSessionsTable)
      .values({
        location_id: location.id,
        user_id: user1.id,
        session_name: 'User 1 Session',
        status: 'active'
      })
      .execute();

    await db.insert(stockOpnameSessionsTable)
      .values({
        location_id: location.id,
        user_id: user2.id,
        session_name: 'User 2 Session',
        status: 'active'
      })
      .execute();

    // Get sessions for user1
    const result = await getUserSessions(user1.id);

    expect(result).toHaveLength(1);
    expect(result[0].session_name).toBe('User 1 Session');
    expect(result[0].user_id).toBe(user1.id);
    expect(result[0].user.username).toBe('user1');
  });

  it('should handle completed session with signature data', async () => {
    // Create prerequisite data
    const [user] = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        full_name: 'Test User',
        password_hash: 'hashed_password'
      })
      .returning()
      .execute();

    const [location] = await db.insert(locationsTable)
      .values({
        name: 'Warehouse A',
        code: 'WH-A',
        description: 'Main warehouse facility'
      })
      .returning()
      .execute();

    const completedAt = new Date();
    const signatureData = 'base64encodedSignatureData';

    // Create completed session with signature
    const [session] = await db.insert(stockOpnameSessionsTable)
      .values({
        location_id: location.id,
        user_id: user.id,
        session_name: 'Completed Count Session',
        status: 'completed',
        completed_at: completedAt,
        signature_data: signatureData
      })
      .returning()
      .execute();

    const result = await getUserSessions(user.id);

    expect(result).toHaveLength(1);
    expect(result[0].status).toBe('completed');
    expect(result[0].completed_at).toBeInstanceOf(Date);
    expect(result[0].signature_data).toBe(signatureData);
  });
});