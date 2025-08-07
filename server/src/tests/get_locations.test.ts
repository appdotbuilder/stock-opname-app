import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { locationsTable } from '../db/schema';
import { type CreateLocationInput } from '../schema';
import { getLocations } from '../handlers/get_locations';

// Test location inputs
const testLocations: CreateLocationInput[] = [
  {
    name: 'Warehouse A',
    code: 'WH-A',
    description: 'Main warehouse facility'
  },
  {
    name: 'Warehouse B',
    code: 'WH-B',
    description: 'Secondary warehouse facility'
  },
  {
    name: 'Warehouse C',
    code: 'WH-C',
    description: null
  }
];

describe('getLocations', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no locations exist', async () => {
    const result = await getLocations();

    expect(result).toEqual([]);
    expect(result).toHaveLength(0);
  });

  it('should return all locations from the database', async () => {
    // Insert test locations
    for (const location of testLocations) {
      await db.insert(locationsTable)
        .values({
          name: location.name,
          code: location.code,
          description: location.description
        })
        .execute();
    }

    const result = await getLocations();

    // Should return all locations
    expect(result).toHaveLength(3);

    // Verify each location has all required fields
    result.forEach(location => {
      expect(location.id).toBeDefined();
      expect(typeof location.id).toBe('number');
      expect(location.name).toBeDefined();
      expect(location.code).toBeDefined();
      expect(location.created_at).toBeInstanceOf(Date);
      expect(location.updated_at).toBeInstanceOf(Date);
    });

    // Verify specific location data
    const warehouseA = result.find(l => l.code === 'WH-A');
    expect(warehouseA).toBeDefined();
    expect(warehouseA!.name).toEqual('Warehouse A');
    expect(warehouseA!.description).toEqual('Main warehouse facility');

    const warehouseC = result.find(l => l.code === 'WH-C');
    expect(warehouseC).toBeDefined();
    expect(warehouseC!.description).toBeNull();
  });

  it('should return locations ordered by name', async () => {
    // Insert locations in different order
    const unorderedLocations = [
      { name: 'Zebra Warehouse', code: 'ZEB', description: 'Last alphabetically' },
      { name: 'Alpha Warehouse', code: 'ALP', description: 'First alphabetically' },
      { name: 'Beta Warehouse', code: 'BET', description: 'Middle alphabetically' }
    ];

    for (const location of unorderedLocations) {
      await db.insert(locationsTable)
        .values(location)
        .execute();
    }

    const result = await getLocations();

    expect(result).toHaveLength(3);

    // Should be ordered by name alphabetically
    expect(result[0].name).toEqual('Alpha Warehouse');
    expect(result[1].name).toEqual('Beta Warehouse');
    expect(result[2].name).toEqual('Zebra Warehouse');

    // Verify ordering is consistent
    for (let i = 1; i < result.length; i++) {
      expect(result[i].name >= result[i - 1].name).toBe(true);
    }
  });

  it('should handle locations with various description values', async () => {
    // Create locations with different description scenarios
    const locationsWithDescriptions = [
      { name: 'Location 1', code: 'LOC1', description: 'Has description' },
      { name: 'Location 2', code: 'LOC2', description: '' },
      { name: 'Location 3', code: 'LOC3', description: null }
    ];

    for (const location of locationsWithDescriptions) {
      await db.insert(locationsTable)
        .values(location)
        .execute();
    }

    const result = await getLocations();

    expect(result).toHaveLength(3);

    const loc1 = result.find(l => l.code === 'LOC1');
    const loc2 = result.find(l => l.code === 'LOC2');
    const loc3 = result.find(l => l.code === 'LOC3');

    expect(loc1!.description).toEqual('Has description');
    expect(loc2!.description).toEqual('');
    expect(loc3!.description).toBeNull();
  });

  it('should verify all location fields are present and correct types', async () => {
    // Insert single test location
    await db.insert(locationsTable)
      .values({
        name: 'Test Location',
        code: 'TEST',
        description: 'Testing field types'
      })
      .execute();

    const result = await getLocations();

    expect(result).toHaveLength(1);
    const location = result[0];

    // Type checks for all fields
    expect(typeof location.id).toBe('number');
    expect(typeof location.name).toBe('string');
    expect(typeof location.code).toBe('string');
    expect(typeof location.description).toBe('string');
    expect(location.created_at).toBeInstanceOf(Date);
    expect(location.updated_at).toBeInstanceOf(Date);

    // Value checks
    expect(location.name).toEqual('Test Location');
    expect(location.code).toEqual('TEST');
    expect(location.description).toEqual('Testing field types');
  });

  it('should handle large number of locations efficiently', async () => {
    // Create many locations
    const manyLocations = [];
    for (let i = 1; i <= 50; i++) {
      manyLocations.push({
        name: `Location ${i.toString().padStart(2, '0')}`,
        code: `LOC${i.toString().padStart(2, '0')}`,
        description: `Description for location ${i}`
      });
    }

    // Bulk insert
    await db.insert(locationsTable)
      .values(manyLocations)
      .execute();

    const result = await getLocations();

    expect(result).toHaveLength(50);
    
    // Verify ordering is maintained for large dataset
    for (let i = 1; i < result.length; i++) {
      expect(result[i].name >= result[i - 1].name).toBe(true);
    }

    // Check first and last items
    expect(result[0].name).toEqual('Location 01');
    expect(result[49].name).toEqual('Location 50');
  });
});