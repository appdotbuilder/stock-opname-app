import { type CreateLocationInput, type Location } from '../schema';

export const createLocation = async (input: CreateLocationInput): Promise<Location> => {
    // This is a placeholder declaration! Real code should be implemented here.
    // The goal of this handler is creating a new location that can be used for stock opname sessions.
    // Should validate that location code is unique and persist to database.
    return Promise.resolve({
        id: 1,
        name: input.name,
        code: input.code,
        description: input.description || null,
        created_at: new Date(),
        updated_at: new Date()
    } as Location);
};