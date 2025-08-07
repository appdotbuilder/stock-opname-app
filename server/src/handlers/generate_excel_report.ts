import { db } from '../db';
import { stockOpnameSessionsTable, stockOpnameItemsTable, locationsTable, usersTable } from '../db/schema';
import { type GenerateReportInput } from '../schema';
import { eq } from 'drizzle-orm';

export const generateExcelReport = async (input: GenerateReportInput): Promise<Buffer> => {
  try {
    // Fetch session data with related information
    const sessionResults = await db.select({
      session_id: stockOpnameSessionsTable.id,
      session_name: stockOpnameSessionsTable.session_name,
      status: stockOpnameSessionsTable.status,
      started_at: stockOpnameSessionsTable.started_at,
      completed_at: stockOpnameSessionsTable.completed_at,
      location_name: locationsTable.name,
      location_code: locationsTable.code,
      user_name: usersTable.full_name,
      user_username: usersTable.username
    })
    .from(stockOpnameSessionsTable)
    .innerJoin(locationsTable, eq(stockOpnameSessionsTable.location_id, locationsTable.id))
    .innerJoin(usersTable, eq(stockOpnameSessionsTable.user_id, usersTable.id))
    .where(eq(stockOpnameSessionsTable.id, input.session_id))
    .execute();

    if (sessionResults.length === 0) {
      throw new Error(`Session with ID ${input.session_id} not found`);
    }

    const sessionData = sessionResults[0];

    // Fetch all items for this session
    const items = await db.select()
      .from(stockOpnameItemsTable)
      .where(eq(stockOpnameItemsTable.session_id, input.session_id))
      .execute();

    // Generate CSV content (which can be opened in Excel)
    const headers = [
      'SKU',
      'Lot Number',
      'Quantity',
      'Scanned At',
      'Location',
      'Location Code',
      'Session Name',
      'User Name',
      'Session Status',
      'Started At',
      'Completed At'
    ];

    // Helper function to escape CSV values
    const escapeCsvValue = (value: string | number | null): string => {
      if (value === null || value === undefined) {
        return '';
      }
      const stringValue = String(value);
      // If value contains comma, quote, or newline, wrap in quotes and escape quotes
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    };

    // Create CSV rows
    const csvRows = [
      headers.join(',') // Header row
    ];

    // Add data rows
    items.forEach(item => {
      const row = [
        escapeCsvValue(item.sku),
        escapeCsvValue(item.lot_number),
        escapeCsvValue(item.quantity),
        escapeCsvValue(item.scanned_at.toISOString().replace('T', ' ').substring(0, 19)),
        escapeCsvValue(sessionData.location_name),
        escapeCsvValue(sessionData.location_code),
        escapeCsvValue(sessionData.session_name),
        escapeCsvValue(sessionData.user_name),
        escapeCsvValue(sessionData.status),
        escapeCsvValue(sessionData.started_at.toISOString().replace('T', ' ').substring(0, 19)),
        escapeCsvValue(sessionData.completed_at 
          ? sessionData.completed_at.toISOString().replace('T', ' ').substring(0, 19)
          : 'Not completed')
      ];
      csvRows.push(row.join(','));
    });

    // Join all rows with newlines
    const csvContent = csvRows.join('\n');

    // Add BOM for proper Excel UTF-8 handling
    const bom = '\uFEFF';
    const finalContent = bom + csvContent;

    // Return as Buffer
    return Buffer.from(finalContent, 'utf8');
  } catch (error) {
    console.error('Excel report generation failed:', error);
    throw error;
  }
};