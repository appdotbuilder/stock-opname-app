import { db } from '../db';
import { stockOpnameSessionsTable, locationsTable, usersTable, stockOpnameItemsTable } from '../db/schema';
import { type SessionWithRelations } from '../schema';
import { eq, inArray } from 'drizzle-orm';

export const getUserSessions = async (userId: number): Promise<SessionWithRelations[]> => {
  try {
    // First, get all sessions for the user with location and user data
    const sessionsWithRelations = await db.select()
      .from(stockOpnameSessionsTable)
      .innerJoin(locationsTable, eq(stockOpnameSessionsTable.location_id, locationsTable.id))
      .innerJoin(usersTable, eq(stockOpnameSessionsTable.user_id, usersTable.id))
      .where(eq(stockOpnameSessionsTable.user_id, userId))
      .execute();

    // If no sessions found, return empty array
    if (sessionsWithRelations.length === 0) {
      return [];
    }

    // Get all session IDs to fetch items in batch
    const sessionIds = sessionsWithRelations.map(result => result.stock_opname_sessions.id);

    // Get all items for these sessions using inArray for efficiency
    const allItems = await db.select()
      .from(stockOpnameItemsTable)
      .where(inArray(stockOpnameItemsTable.session_id, sessionIds))
      .execute();

    // Group items by session ID
    const itemsBySessionId = allItems.reduce((acc, item) => {
      if (!acc[item.session_id]) {
        acc[item.session_id] = [];
      }
      acc[item.session_id].push(item);
      return acc;
    }, {} as Record<number, typeof allItems>);

    // Build the final result with proper structure
    return sessionsWithRelations.map(result => {
      const session = result.stock_opname_sessions;
      const location = result.locations;
      const user = result.users;
      const items = itemsBySessionId[session.id] || [];

      return {
        id: session.id,
        location_id: session.location_id,
        user_id: session.user_id,
        session_name: session.session_name,
        status: session.status,
        started_at: session.started_at,
        completed_at: session.completed_at,
        signature_data: session.signature_data,
        created_at: session.created_at,
        updated_at: session.updated_at,
        location: {
          id: location.id,
          name: location.name,
          code: location.code,
          description: location.description,
          created_at: location.created_at,
          updated_at: location.updated_at
        },
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          full_name: user.full_name,
          created_at: user.created_at,
          updated_at: user.updated_at
        },
        items: items.map(item => ({
          id: item.id,
          session_id: item.session_id,
          sku: item.sku,
          lot_number: item.lot_number,
          quantity: item.quantity,
          barcode_data: item.barcode_data,
          scanned_at: item.scanned_at,
          created_at: item.created_at
        }))
      } as SessionWithRelations;
    });
  } catch (error) {
    console.error('Failed to fetch user sessions:', error);
    throw error;
  }
};