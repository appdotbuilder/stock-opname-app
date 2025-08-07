import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, locationsTable, stockOpnameSessionsTable, stockOpnameItemsTable } from '../db/schema';
import { type GenerateReportInput } from '../schema';
import { generatePdfReport } from '../handlers/generate_pdf_report';

// Test data
const testUser = {
  username: 'testuser',
  email: 'test@example.com',
  full_name: 'Test User',
  password_hash: 'hashed_password'
};

const testLocation = {
  name: 'Warehouse A',
  code: 'WH-A',
  description: 'Main warehouse location'
};

describe('generatePdfReport', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should generate PDF report for completed session with items', async () => {
    // Create prerequisite data
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    const locationResult = await db.insert(locationsTable)
      .values(testLocation)
      .returning()
      .execute();
    const locationId = locationResult[0].id;

    // Create test session
    const sessionResult = await db.insert(stockOpnameSessionsTable)
      .values({
        location_id: locationId,
        user_id: userId,
        session_name: 'Test Session Report',
        status: 'completed',
        signature_data: 'base64signaturedata',
        completed_at: new Date()
      })
      .returning()
      .execute();
    const sessionId = sessionResult[0].id;

    // Create test items
    await db.insert(stockOpnameItemsTable)
      .values([
        {
          session_id: sessionId,
          sku: 'TEST-001',
          lot_number: 'LOT001',
          quantity: 10,
          barcode_data: 'barcode001'
        },
        {
          session_id: sessionId,
          sku: 'TEST-002',
          lot_number: 'LOT002',
          quantity: 25,
          barcode_data: 'barcode002'
        }
      ])
      .execute();

    // Test the handler
    const input: GenerateReportInput = {
      session_id: sessionId,
      format: 'pdf'
    };

    const result = await generatePdfReport(input);

    // Verify result is a Buffer
    expect(result).toBeInstanceOf(Buffer);
    expect(result.length).toBeGreaterThan(0);

    // Convert buffer to string to check content
    const content = result.toString('utf-8');

    // Verify essential report elements
    expect(content).toMatch(/STOCK OPNAME REPORT/i);
    expect(content).toMatch(/Test Session Report/);
    expect(content).toMatch(/Warehouse A/);
    expect(content).toMatch(/WH-A/);
    expect(content).toMatch(/Test User/);
    expect(content).toMatch(/testuser/);
    expect(content).toMatch(/test@example.com/);
    expect(content).toMatch(/COMPLETED/);
    expect(content).toMatch(/Total Items Scanned: 2/);
    expect(content).toMatch(/Total Quantity: 35/);
    expect(content).toMatch(/TEST-001/);
    expect(content).toMatch(/TEST-002/);
    expect(content).toMatch(/LOT001/);
    expect(content).toMatch(/LOT002/);
    expect(content).toMatch(/\[SIGNATURE DATA PRESENT\]/);
  });

  it('should generate PDF report for session without signature', async () => {
    // Create prerequisite data
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    const locationResult = await db.insert(locationsTable)
      .values(testLocation)
      .returning()
      .execute();
    const locationId = locationResult[0].id;

    // Create session without signature
    const sessionResult = await db.insert(stockOpnameSessionsTable)
      .values({
        location_id: locationId,
        user_id: userId,
        session_name: 'No Signature Session',
        status: 'active',
        signature_data: null
      })
      .returning()
      .execute();
    const sessionId = sessionResult[0].id;

    const input: GenerateReportInput = {
      session_id: sessionId,
      format: 'pdf'
    };

    const result = await generatePdfReport(input);
    const content = result.toString('utf-8');

    expect(content).toMatch(/\[NO SIGNATURE\]/);
    expect(content).toMatch(/ACTIVE/);
    expect(content).toMatch(/Not completed/);
  });

  it('should generate PDF report for session with no items', async () => {
    // Create prerequisite data
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    const locationResult = await db.insert(locationsTable)
      .values(testLocation)
      .returning()
      .execute();
    const locationId = locationResult[0].id;

    // Create session with no items
    const sessionResult = await db.insert(stockOpnameSessionsTable)
      .values({
        location_id: locationId,
        user_id: userId,
        session_name: 'Empty Session',
        status: 'cancelled'
      })
      .returning()
      .execute();
    const sessionId = sessionResult[0].id;

    const input: GenerateReportInput = {
      session_id: sessionId,
      format: 'pdf'
    };

    const result = await generatePdfReport(input);
    const content = result.toString('utf-8');

    expect(content).toMatch(/Total Items Scanned: 0/);
    expect(content).toMatch(/Total Quantity: 0/);
    expect(content).toMatch(/No items found/);
    expect(content).toMatch(/CANCELLED/);
  });

  it('should generate PDF report with location without description', async () => {
    // Create prerequisite data
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    const locationResult = await db.insert(locationsTable)
      .values({
        name: 'Simple Location',
        code: 'SL-1',
        description: null
      })
      .returning()
      .execute();
    const locationId = locationResult[0].id;

    const sessionResult = await db.insert(stockOpnameSessionsTable)
      .values({
        location_id: locationId,
        user_id: userId,
        session_name: 'Simple Session',
        status: 'active'
      })
      .returning()
      .execute();
    const sessionId = sessionResult[0].id;

    const input: GenerateReportInput = {
      session_id: sessionId,
      format: 'pdf'
    };

    const result = await generatePdfReport(input);
    const content = result.toString('utf-8');

    expect(content).toMatch(/Simple Location/);
    expect(content).toMatch(/SL-1/);
    expect(content).toMatch(/Description: N\/A/);
  });

  it('should throw error for non-existent session', async () => {
    const input: GenerateReportInput = {
      session_id: 99999,
      format: 'pdf'
    };

    await expect(generatePdfReport(input)).rejects.toThrow(/Session with ID 99999 not found/);
  });

  it('should include timestamp information in report', async () => {
    // Create prerequisite data
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    const locationResult = await db.insert(locationsTable)
      .values(testLocation)
      .returning()
      .execute();
    const locationId = locationResult[0].id;

    const completedDate = new Date('2024-01-15T10:30:00Z');
    
    const sessionResult = await db.insert(stockOpnameSessionsTable)
      .values({
        location_id: locationId,
        user_id: userId,
        session_name: 'Timestamp Test',
        status: 'completed',
        completed_at: completedDate
      })
      .returning()
      .execute();
    const sessionId = sessionResult[0].id;

    // Add an item with specific timestamp
    await db.insert(stockOpnameItemsTable)
      .values({
        session_id: sessionId,
        sku: 'TIME-001',
        lot_number: 'TIME001',
        quantity: 5,
        barcode_data: 'timebarcode',
        scanned_at: new Date('2024-01-15T10:25:00Z')
      })
      .execute();

    const input: GenerateReportInput = {
      session_id: sessionId,
      format: 'pdf'
    };

    const result = await generatePdfReport(input);
    const content = result.toString('utf-8');

    // Check for timestamp information
    expect(content).toMatch(/Started:/);
    expect(content).toMatch(/Completed:/);
    expect(content).toMatch(/Scanned:/);
    expect(content).toMatch(/Report Generated:/);
  });
});