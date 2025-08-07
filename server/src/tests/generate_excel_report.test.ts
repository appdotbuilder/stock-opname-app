import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, locationsTable, stockOpnameSessionsTable, stockOpnameItemsTable } from '../db/schema';
import { type GenerateReportInput } from '../schema';
import { generateExcelReport } from '../handlers/generate_excel_report';

// Test data
const testUser = {
  username: 'testuser',
  email: 'test@example.com',
  full_name: 'Test User',
  password_hash: 'hashedpassword123'
};

const testLocation = {
  name: 'Test Warehouse',
  code: 'TW001',
  description: 'Test warehouse location'
};

const testSession = {
  session_name: 'Daily Stock Check',
  status: 'completed' as const
};

const testItems = [
  {
    sku: 'SKU001',
    lot_number: 'LOT001',
    quantity: 10,
    barcode_data: 'BARCODE001'
  },
  {
    sku: 'SKU002',
    lot_number: 'LOT002',
    quantity: 25,
    barcode_data: 'BARCODE002'
  },
  {
    sku: 'SKU003',
    lot_number: 'LOT003',
    quantity: 5,
    barcode_data: 'BARCODE003'
  }
];

// Helper function to parse CSV content
const parseCsv = (csvContent: string): Array<Record<string, string>> => {
  const lines = csvContent.split('\n').filter(line => line.trim());
  if (lines.length === 0) return [];
  
  // Parse CSV line handling quoted values properly
  const parseCsvLine = (line: string): string[] => {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;
    let i = 0;
    
    while (i < line.length) {
      const char = line[i];
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          // Escaped quote
          current += '"';
          i += 2;
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
          i++;
        }
      } else if (char === ',' && !inQuotes) {
        // End of field
        values.push(current.trim());
        current = '';
        i++;
      } else {
        current += char;
        i++;
      }
    }
    
    // Add the last value
    values.push(current.trim());
    return values;
  };
  
  const headers = parseCsvLine(lines[0]);
  const data = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    data.push(row);
  }
  
  return data;
};

describe('generateExcelReport', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should generate CSV report for valid session', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create test location
    const locationResult = await db.insert(locationsTable)
      .values(testLocation)
      .returning()
      .execute();
    const locationId = locationResult[0].id;

    // Create test session
    const sessionResult = await db.insert(stockOpnameSessionsTable)
      .values({
        ...testSession,
        location_id: locationId,
        user_id: userId
      })
      .returning()
      .execute();
    const sessionId = sessionResult[0].id;

    // Create test items
    await db.insert(stockOpnameItemsTable)
      .values(testItems.map(item => ({
        ...item,
        session_id: sessionId
      })))
      .execute();

    const input: GenerateReportInput = {
      session_id: sessionId,
      format: 'excel'
    };

    const result = await generateExcelReport(input);

    // Verify result is a Buffer
    expect(result).toBeInstanceOf(Buffer);
    expect(result.length).toBeGreaterThan(0);

    // Parse CSV content (remove BOM if present)
    const csvContent = result.toString('utf8').replace(/^\uFEFF/, '');
    const data = parseCsv(csvContent);
    
    // Verify we have the correct number of rows
    expect(data).toHaveLength(3);
    
    // Verify data structure and content
    const firstRow = data[0];
    expect(firstRow['SKU']).toBe('SKU001');
    expect(firstRow['Lot Number']).toBe('LOT001');
    expect(firstRow['Quantity']).toBe('10');
    expect(firstRow['Location']).toBe('Test Warehouse');
    expect(firstRow['Location Code']).toBe('TW001');
    expect(firstRow['Session Name']).toBe('Daily Stock Check');
    expect(firstRow['User Name']).toBe('Test User');
    expect(firstRow['Session Status']).toBe('completed');
    expect(firstRow['Scanned At']).toBeDefined();
  });

  it('should include all required columns in CSV report', async () => {
    // Create minimal test data
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

    const sessionResult = await db.insert(stockOpnameSessionsTable)
      .values({
        ...testSession,
        location_id: locationId,
        user_id: userId
      })
      .returning()
      .execute();
    const sessionId = sessionResult[0].id;

    await db.insert(stockOpnameItemsTable)
      .values([{
        ...testItems[0],
        session_id: sessionId
      }])
      .execute();

    const input: GenerateReportInput = {
      session_id: sessionId,
      format: 'excel'
    };

    const result = await generateExcelReport(input);
    const csvContent = result.toString('utf8').replace(/^\uFEFF/, '');
    const data = parseCsv(csvContent);

    const expectedColumns = [
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

    const firstRow = data[0];
    expectedColumns.forEach(column => {
      expect(firstRow).toHaveProperty(column);
    });
  });

  it('should handle active session with null completed_at', async () => {
    // Create test data with active session
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

    const sessionResult = await db.insert(stockOpnameSessionsTable)
      .values({
        session_name: 'Active Session',
        status: 'active',
        location_id: locationId,
        user_id: userId
      })
      .returning()
      .execute();
    const sessionId = sessionResult[0].id;

    await db.insert(stockOpnameItemsTable)
      .values([{
        ...testItems[0],
        session_id: sessionId
      }])
      .execute();

    const input: GenerateReportInput = {
      session_id: sessionId,
      format: 'excel'
    };

    const result = await generateExcelReport(input);
    const csvContent = result.toString('utf8').replace(/^\uFEFF/, '');
    const data = parseCsv(csvContent);

    const firstRow = data[0];
    expect(firstRow['Session Status']).toBe('active');
    expect(firstRow['Completed At']).toBe('Not completed');
  });

  it('should generate empty report for session with no items', async () => {
    // Create session with no items
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

    const sessionResult = await db.insert(stockOpnameSessionsTable)
      .values({
        ...testSession,
        location_id: locationId,
        user_id: userId
      })
      .returning()
      .execute();
    const sessionId = sessionResult[0].id;

    const input: GenerateReportInput = {
      session_id: sessionId,
      format: 'excel'
    };

    const result = await generateExcelReport(input);

    // Verify result is still a valid CSV buffer
    expect(result).toBeInstanceOf(Buffer);
    expect(result.length).toBeGreaterThan(0);

    const csvContent = result.toString('utf8').replace(/^\uFEFF/, '');
    const data = parseCsv(csvContent);
    
    // Should have no data rows (only headers)
    expect(data).toHaveLength(0);
    
    // But should still have headers
    const lines = csvContent.split('\n').filter(line => line.trim());
    expect(lines).toHaveLength(1); // Just header line
    expect(lines[0]).toContain('SKU,Lot Number,Quantity');
  });

  it('should throw error for non-existent session', async () => {
    const input: GenerateReportInput = {
      session_id: 99999,
      format: 'excel'
    };

    await expect(generateExcelReport(input)).rejects.toThrow(/Session with ID 99999 not found/);
  });

  it('should format dates correctly in CSV', async () => {
    // Create test data
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

    const sessionResult = await db.insert(stockOpnameSessionsTable)
      .values({
        ...testSession,
        location_id: locationId,
        user_id: userId
      })
      .returning()
      .execute();
    const sessionId = sessionResult[0].id;

    await db.insert(stockOpnameItemsTable)
      .values([{
        ...testItems[0],
        session_id: sessionId
      }])
      .execute();

    const input: GenerateReportInput = {
      session_id: sessionId,
      format: 'excel'
    };

    const result = await generateExcelReport(input);
    const csvContent = result.toString('utf8').replace(/^\uFEFF/, '');
    const data = parseCsv(csvContent);

    const firstRow = data[0];
    
    // Check date format (should be YYYY-MM-DD HH:MM:SS)
    const scannedAtFormat = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;
    expect(firstRow['Scanned At']).toMatch(scannedAtFormat);
    expect(firstRow['Started At']).toMatch(scannedAtFormat);
  });

  it('should handle CSV special characters properly', async () => {
    // Create test data with special characters
    const userResult = await db.insert(usersTable)
      .values({
        ...testUser,
        full_name: 'User, with "quotes" and \n newline'
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    const locationResult = await db.insert(locationsTable)
      .values({
        ...testLocation,
        name: 'Location, with commas'
      })
      .returning()
      .execute();
    const locationId = locationResult[0].id;

    const sessionResult = await db.insert(stockOpnameSessionsTable)
      .values({
        session_name: 'Session with "quotes"',
        status: 'completed',
        location_id: locationId,
        user_id: userId
      })
      .returning()
      .execute();
    const sessionId = sessionResult[0].id;

    await db.insert(stockOpnameItemsTable)
      .values([{
        sku: 'SKU,001',
        lot_number: 'LOT"001',
        quantity: 10,
        barcode_data: 'BARCODE001',
        session_id: sessionId
      }])
      .execute();

    const input: GenerateReportInput = {
      session_id: sessionId,
      format: 'excel'
    };

    const result = await generateExcelReport(input);
    const csvContent = result.toString('utf8').replace(/^\uFEFF/, '');
    
    // Should contain properly escaped values
    expect(csvContent).toContain('"SKU,001"'); // Comma escaped
    expect(csvContent).toContain('"LOT""001"'); // Quote escaped
    expect(csvContent).toContain('"Session with ""quotes"""'); // Quotes escaped
    
    const data = parseCsv(csvContent);
    const firstRow = data[0];
    
    // Values should be properly unescaped when parsed
    expect(firstRow['SKU']).toBe('SKU,001');
    expect(firstRow['Lot Number']).toBe('LOT"001');
    expect(firstRow['Session Name']).toBe('Session with "quotes"');
  });
});