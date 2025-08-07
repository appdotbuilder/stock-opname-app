import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { stockOpnameSessionsTable, usersTable, locationsTable } from '../db/schema';
import { type CreateStockOpnameSessionInput } from '../schema';
import { createStockOpnameSession } from '../handlers/create_stock_opname_session';
import { eq } from 'drizzle-orm';

// Test user data
const testUser = {
  username: 'testuser',
  email: 'test@example.com',
  full_name: 'Test User',
  password_hash: 'hashed_password'
};

// Test location data  
const testLocation = {
  name: 'Warehouse A',
  code: 'WH-A',
  description: 'Main warehouse location'
};

// Test input for creating stock opname session
const testInput: CreateStockOpnameSessionInput = {
  location_id: 1, // Will be set after creating location
  user_id: 1,     // Will be set after creating user
  session_name: 'Stock Count Q1 2024'
};

describe('createStockOpnameSession', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a stock opname session', async () => {
    // Create prerequisite user and location
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const user = userResult[0];

    const locationResult = await db.insert(locationsTable)
      .values(testLocation)
      .returning()
      .execute();
    const location = locationResult[0];

    // Update test input with actual IDs
    const input = {
      ...testInput,
      user_id: user.id,
      location_id: location.id
    };

    const result = await createStockOpnameSession(input);

    // Basic field validation
    expect(result.session_name).toEqual('Stock Count Q1 2024');
    expect(result.location_id).toEqual(location.id);
    expect(result.user_id).toEqual(user.id);
    expect(result.status).toEqual('active');
    expect(result.id).toBeDefined();
    expect(result.started_at).toBeInstanceOf(Date);
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.completed_at).toBeNull();
    expect(result.signature_data).toBeNull();
  });

  it('should save session to database', async () => {
    // Create prerequisite user and location
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const user = userResult[0];

    const locationResult = await db.insert(locationsTable)
      .values(testLocation)
      .returning()
      .execute();
    const location = locationResult[0];

    // Update test input with actual IDs
    const input = {
      ...testInput,
      user_id: user.id,
      location_id: location.id
    };

    const result = await createStockOpnameSession(input);

    // Query database to verify session was saved
    const sessions = await db.select()
      .from(stockOpnameSessionsTable)
      .where(eq(stockOpnameSessionsTable.id, result.id))
      .execute();

    expect(sessions).toHaveLength(1);
    expect(sessions[0].session_name).toEqual('Stock Count Q1 2024');
    expect(sessions[0].location_id).toEqual(location.id);
    expect(sessions[0].user_id).toEqual(user.id);
    expect(sessions[0].status).toEqual('active');
    expect(sessions[0].started_at).toBeInstanceOf(Date);
    expect(sessions[0].created_at).toBeInstanceOf(Date);
  });

  it('should throw error when user does not exist', async () => {
    // Create only location, not user
    const locationResult = await db.insert(locationsTable)
      .values(testLocation)
      .returning()
      .execute();
    const location = locationResult[0];

    const input = {
      ...testInput,
      user_id: 999, // Non-existent user ID
      location_id: location.id
    };

    await expect(createStockOpnameSession(input))
      .rejects.toThrow(/User with id 999 does not exist/i);
  });

  it('should throw error when location does not exist', async () => {
    // Create only user, not location
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const user = userResult[0];

    const input = {
      ...testInput,
      user_id: user.id,
      location_id: 999 // Non-existent location ID
    };

    await expect(createStockOpnameSession(input))
      .rejects.toThrow(/Location with id 999 does not exist/i);
  });

  it('should create multiple sessions for same user and location', async () => {
    // Create prerequisite user and location
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const user = userResult[0];

    const locationResult = await db.insert(locationsTable)
      .values(testLocation)
      .returning()
      .execute();
    const location = locationResult[0];

    // Create first session
    const input1 = {
      location_id: location.id,
      user_id: user.id,
      session_name: 'First Session'
    };

    const result1 = await createStockOpnameSession(input1);

    // Create second session
    const input2 = {
      location_id: location.id,
      user_id: user.id,
      session_name: 'Second Session'
    };

    const result2 = await createStockOpnameSession(input2);

    // Verify both sessions were created
    expect(result1.id).not.toEqual(result2.id);
    expect(result1.session_name).toEqual('First Session');
    expect(result2.session_name).toEqual('Second Session');

    // Verify both are in database
    const sessions = await db.select()
      .from(stockOpnameSessionsTable)
      .where(eq(stockOpnameSessionsTable.user_id, user.id))
      .execute();

    expect(sessions).toHaveLength(2);
  });

  it('should handle special characters in session name', async () => {
    // Create prerequisite user and location
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const user = userResult[0];

    const locationResult = await db.insert(locationsTable)
      .values(testLocation)
      .returning()
      .execute();
    const location = locationResult[0];

    const input = {
      location_id: location.id,
      user_id: user.id,
      session_name: 'Stock Count - Q1/2024 (Inventory #123)'
    };

    const result = await createStockOpnameSession(input);

    expect(result.session_name).toEqual('Stock Count - Q1/2024 (Inventory #123)');
    expect(result.status).toEqual('active');
  });
});