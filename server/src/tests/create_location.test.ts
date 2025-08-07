import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { locationsTable } from '../db/schema';
import { type CreateLocationInput } from '../schema';
import { createLocation } from '../handlers/create_location';
import { eq } from 'drizzle-orm';

// Simple test input
const testInput: CreateLocationInput = {
  name: 'Test Warehouse',
  code: 'TWH001',
  description: 'A warehouse for testing'
};

const testInputWithoutDescription: CreateLocationInput = {
  name: 'Test Warehouse 2',
  code: 'TWH002'
};

describe('createLocation', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a location with description', async () => {
    const result = await createLocation(testInput);

    // Basic field validation
    expect(result.name).toEqual('Test Warehouse');
    expect(result.code).toEqual('TWH001');
    expect(result.description).toEqual('A warehouse for testing');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a location without description', async () => {
    const result = await createLocation(testInputWithoutDescription);

    // Basic field validation
    expect(result.name).toEqual('Test Warehouse 2');
    expect(result.code).toEqual('TWH002');
    expect(result.description).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save location to database', async () => {
    const result = await createLocation(testInput);

    // Query using proper drizzle syntax
    const locations = await db.select()
      .from(locationsTable)
      .where(eq(locationsTable.id, result.id))
      .execute();

    expect(locations).toHaveLength(1);
    expect(locations[0].name).toEqual('Test Warehouse');
    expect(locations[0].code).toEqual('TWH001');
    expect(locations[0].description).toEqual('A warehouse for testing');
    expect(locations[0].created_at).toBeInstanceOf(Date);
    expect(locations[0].updated_at).toBeInstanceOf(Date);
  });

  it('should enforce unique location codes', async () => {
    // Create first location
    await createLocation(testInput);

    // Try to create another location with same code
    const duplicateCodeInput: CreateLocationInput = {
      name: 'Another Warehouse',
      code: 'TWH001', // Same code as first location
      description: 'Different description'
    };

    await expect(createLocation(duplicateCodeInput))
      .rejects.toThrow(/unique/i);
  });

  it('should handle null description correctly', async () => {
    const result = await createLocation(testInputWithoutDescription);

    // Query database to verify null handling
    const locations = await db.select()
      .from(locationsTable)
      .where(eq(locationsTable.id, result.id))
      .execute();

    expect(locations[0].description).toBeNull();
  });

  it('should create multiple locations with different codes', async () => {
    const location1 = await createLocation({
      name: 'Warehouse A',
      code: 'WHA001',
      description: 'First warehouse'
    });

    const location2 = await createLocation({
      name: 'Warehouse B',
      code: 'WHB001',
      description: 'Second warehouse'
    });

    expect(location1.id).not.toEqual(location2.id);
    expect(location1.code).toEqual('WHA001');
    expect(location2.code).toEqual('WHB001');

    // Verify both locations exist in database
    const allLocations = await db.select()
      .from(locationsTable)
      .execute();

    expect(allLocations).toHaveLength(2);
    expect(allLocations.map(l => l.code)).toContain('WHA001');
    expect(allLocations.map(l => l.code)).toContain('WHB001');
  });
});