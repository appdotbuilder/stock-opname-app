import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { stockOpnameSessionsTable, usersTable, locationsTable } from '../db/schema';
import { type UpdateStockOpnameSessionInput } from '../schema';
import { updateStockOpnameSession } from '../handlers/update_stock_opname_session';
import { eq } from 'drizzle-orm';

describe('updateStockOpnameSession', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper to create prerequisite data
  async function createTestData() {
    // Create user
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        full_name: 'Test User',
        password_hash: 'hashedpassword'
      })
      .returning()
      .execute();

    // Create location
    const locationResult = await db.insert(locationsTable)
      .values({
        name: 'Test Location',
        code: 'TEST001',
        description: 'Test location for opname'
      })
      .returning()
      .execute();

    // Create stock opname session
    const sessionResult = await db.insert(stockOpnameSessionsTable)
      .values({
        location_id: locationResult[0].id,
        user_id: userResult[0].id,
        session_name: 'Test Session',
        status: 'active'
      })
      .returning()
      .execute();

    return {
      user: userResult[0],
      location: locationResult[0],
      session: sessionResult[0]
    };
  }

  it('should update session status', async () => {
    const { session } = await createTestData();

    const input: UpdateStockOpnameSessionInput = {
      id: session.id,
      status: 'completed'
    };

    const result = await updateStockOpnameSession(input);

    expect(result.id).toEqual(session.id);
    expect(result.status).toEqual('completed');
    expect(result.session_name).toEqual('Test Session');
    expect(result.completed_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update signature data', async () => {
    const { session } = await createTestData();

    const signatureData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

    const input: UpdateStockOpnameSessionInput = {
      id: session.id,
      signature_data: signatureData
    };

    const result = await updateStockOpnameSession(input);

    expect(result.signature_data).toEqual(signatureData);
    expect(result.status).toEqual('active'); // Should remain unchanged
  });

  it('should update multiple fields at once', async () => {
    const { session } = await createTestData();

    const completedAt = new Date('2024-01-15T10:30:00Z');
    const signatureData = 'signature-data-base64';

    const input: UpdateStockOpnameSessionInput = {
      id: session.id,
      status: 'completed',
      signature_data: signatureData,
      completed_at: completedAt
    };

    const result = await updateStockOpnameSession(input);

    expect(result.status).toEqual('completed');
    expect(result.signature_data).toEqual(signatureData);
    expect(result.completed_at).toEqual(completedAt);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should automatically set completed_at when status changes to completed', async () => {
    const { session } = await createTestData();

    const beforeUpdate = new Date();

    const input: UpdateStockOpnameSessionInput = {
      id: session.id,
      status: 'completed'
    };

    const result = await updateStockOpnameSession(input);

    expect(result.status).toEqual('completed');
    expect(result.completed_at).toBeInstanceOf(Date);
    expect(result.completed_at!.getTime()).toBeGreaterThanOrEqual(beforeUpdate.getTime());
  });

  it('should update session to cancelled status', async () => {
    const { session } = await createTestData();

    const input: UpdateStockOpnameSessionInput = {
      id: session.id,
      status: 'cancelled'
    };

    const result = await updateStockOpnameSession(input);

    expect(result.status).toEqual('cancelled');
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save updates to database', async () => {
    const { session } = await createTestData();

    const input: UpdateStockOpnameSessionInput = {
      id: session.id,
      status: 'completed',
      signature_data: 'test-signature'
    };

    await updateStockOpnameSession(input);

    // Verify changes were persisted to database
    const updatedSessions = await db.select()
      .from(stockOpnameSessionsTable)
      .where(eq(stockOpnameSessionsTable.id, session.id))
      .execute();

    expect(updatedSessions).toHaveLength(1);
    expect(updatedSessions[0].status).toEqual('completed');
    expect(updatedSessions[0].signature_data).toEqual('test-signature');
    expect(updatedSessions[0].completed_at).toBeInstanceOf(Date);
  });

  it('should update only updated_at when no other fields provided', async () => {
    const { session } = await createTestData();

    const originalUpdatedAt = session.updated_at;
    
    // Wait a small moment to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    const input: UpdateStockOpnameSessionInput = {
      id: session.id
    };

    const result = await updateStockOpnameSession(input);

    expect(result.status).toEqual('active'); // Should remain unchanged
    expect(result.session_name).toEqual('Test Session'); // Should remain unchanged
    expect(result.updated_at.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
  });

  it('should handle null values correctly', async () => {
    const { session } = await createTestData();

    // First set signature data
    await updateStockOpnameSession({
      id: session.id,
      signature_data: 'initial-signature'
    });

    // Then clear it by setting to null
    const input: UpdateStockOpnameSessionInput = {
      id: session.id,
      signature_data: null
    };

    const result = await updateStockOpnameSession(input);

    expect(result.signature_data).toBeNull();
  });

  it('should throw error for non-existent session', async () => {
    const input: UpdateStockOpnameSessionInput = {
      id: 99999,
      status: 'completed'
    };

    await expect(updateStockOpnameSession(input)).rejects.toThrow(/not found/i);
  });

  it('should preserve existing completed_at when updating other fields', async () => {
    const { session } = await createTestData();

    const specificDate = new Date('2024-01-10T15:30:00Z');

    // First mark as completed with specific date
    await updateStockOpnameSession({
      id: session.id,
      status: 'completed',
      completed_at: specificDate
    });

    // Then update signature without changing completed_at
    const result = await updateStockOpnameSession({
      id: session.id,
      signature_data: 'new-signature'
    });

    expect(result.status).toEqual('completed');
    expect(result.completed_at).toEqual(specificDate);
    expect(result.signature_data).toEqual('new-signature');
  });
});