import { db } from '../db';
import { stockOpnameSessionsTable, stockOpnameItemsTable, locationsTable, usersTable } from '../db/schema';
import { type GenerateReportInput } from '../schema';
import { eq } from 'drizzle-orm';

export const generatePdfReport = async (input: GenerateReportInput): Promise<Buffer> => {
  try {
    // Fetch session data with all related information
    const sessionResults = await db.select({
      session: stockOpnameSessionsTable,
      location: locationsTable,
      user: usersTable
    })
      .from(stockOpnameSessionsTable)
      .innerJoin(locationsTable, eq(stockOpnameSessionsTable.location_id, locationsTable.id))
      .innerJoin(usersTable, eq(stockOpnameSessionsTable.user_id, usersTable.id))
      .where(eq(stockOpnameSessionsTable.id, input.session_id))
      .execute();

    if (sessionResults.length === 0) {
      throw new Error(`Session with ID ${input.session_id} not found`);
    }

    const { session, location, user } = sessionResults[0];

    // Fetch all items for this session
    const items = await db.select()
      .from(stockOpnameItemsTable)
      .where(eq(stockOpnameItemsTable.session_id, input.session_id))
      .execute();

    // Generate PDF content as a structured text report
    // In a real implementation, this would use a PDF library like jsPDF or pdfkit
    const reportContent = generatePdfContent({
      session,
      location,
      user: {
        ...user,
        password_hash: undefined // Exclude password hash from report
      },
      items
    });

    // Convert the report content to a buffer
    // In production, this would be actual PDF binary data
    return Buffer.from(reportContent, 'utf-8');

  } catch (error) {
    console.error('PDF report generation failed:', error);
    throw error;
  }
};

function generatePdfContent(data: {
  session: any;
  location: any;
  user: any;
  items: any[];
}): string {
  const { session, location, user, items } = data;

  // Format dates for display
  const startedAt = session.started_at ? new Date(session.started_at).toLocaleString() : 'N/A';
  const completedAt = session.completed_at ? new Date(session.completed_at).toLocaleString() : 'Not completed';

  // Calculate totals
  const totalItems = items.length;
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);

  // Generate itemized list
  const itemsList = items.map((item, index) => {
    const scannedAt = new Date(item.scanned_at).toLocaleString();
    return `${index + 1}. SKU: ${item.sku} | Lot: ${item.lot_number} | Qty: ${item.quantity} | Scanned: ${scannedAt}`;
  }).join('\n');

  // Create the PDF content as formatted text
  return `
STOCK OPNAME REPORT
==================

Session Information:
- Session Name: ${session.session_name}
- Session ID: ${session.id}
- Status: ${session.status.toUpperCase()}
- Started: ${startedAt}
- Completed: ${completedAt}

Location Information:
- Location Name: ${location.name}
- Location Code: ${location.code}
- Description: ${location.description || 'N/A'}

User Information:
- Full Name: ${user.full_name}
- Username: ${user.username}
- Email: ${user.email}

Summary:
- Total Items Scanned: ${totalItems}
- Total Quantity: ${totalQuantity}

Electronic Signature:
${session.signature_data ? '[SIGNATURE DATA PRESENT]' : '[NO SIGNATURE]'}

Itemized List:
${itemsList || 'No items found'}

Report Generated: ${new Date().toLocaleString()}
---
This is a digitally generated report for stock opname session ${session.id}.
`.trim();
}