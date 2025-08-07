import { db } from '../db';
import { locationsTable } from '../db/schema';
import { type Location } from '../schema';

export const getLocations = async (): Promise<Location[]> => {
  try {
    const locations = await db.select()
      .from(locationsTable)
      .orderBy(locationsTable.name)
      .execute();

    return locations;
  } catch (error) {
    console.error('Failed to fetch locations:', error);
    throw error;
  }
};