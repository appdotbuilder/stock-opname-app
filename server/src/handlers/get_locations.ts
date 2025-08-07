import { type Location } from '../schema';

export const getLocations = async (): Promise<Location[]> => {
    // This is a placeholder declaration! Real code should be implemented here.
    // The goal of this handler is fetching all available locations from the database.
    // Users will select from these predefined locations when creating stock opname sessions.
    return Promise.resolve([
        {
            id: 1,
            name: 'Warehouse A',
            code: 'WH-A',
            description: 'Main warehouse facility',
            created_at: new Date(),
            updated_at: new Date()
        },
        {
            id: 2,
            name: 'Warehouse B',
            code: 'WH-B',
            description: 'Secondary warehouse facility',
            created_at: new Date(),
            updated_at: new Date()
        }
    ] as Location[]);
};