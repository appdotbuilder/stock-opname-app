import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginInput } from '../schema';
import { login } from '../handlers/login';
import { createHash } from 'crypto';

// Test user data
const testUserData = {
  username: 'testuser',
  email: 'test@example.com',
  full_name: 'Test User',
  password: 'securepassword123'
};

const testLoginInput: LoginInput = {
  username: 'testuser',
  password: 'securepassword123'
};

describe('login', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should authenticate user with valid credentials', async () => {
    // Create test user with hashed password
    const password_hash = createHash('sha256').update(testUserData.password).digest('hex');
    
    const users = await db.insert(usersTable)
      .values({
        username: testUserData.username,
        email: testUserData.email,
        full_name: testUserData.full_name,
        password_hash
      })
      .returning()
      .execute();

    const createdUser = users[0];

    // Attempt login
    const result = await login(testLoginInput);

    // Verify returned user data
    expect(result.id).toEqual(createdUser.id);
    expect(result.username).toEqual(testUserData.username);
    expect(result.email).toEqual(testUserData.email);
    expect(result.full_name).toEqual(testUserData.full_name);
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);

    // Verify password hash is not included in response
    expect('password_hash' in result).toBe(false);
  });

  it('should throw error for non-existent username', async () => {
    const invalidLoginInput: LoginInput = {
      username: 'nonexistent',
      password: 'somepassword'
    };

    await expect(login(invalidLoginInput)).rejects.toThrow(/invalid username or password/i);
  });

  it('should throw error for incorrect password', async () => {
    // Create test user with hashed password
    const password_hash = createHash('sha256').update(testUserData.password).digest('hex');
    
    await db.insert(usersTable)
      .values({
        username: testUserData.username,
        email: testUserData.email,
        full_name: testUserData.full_name,
        password_hash
      })
      .execute();

    const invalidLoginInput: LoginInput = {
      username: testUserData.username,
      password: 'wrongpassword'
    };

    await expect(login(invalidLoginInput)).rejects.toThrow(/invalid username or password/i);
  });

  it('should handle case-sensitive username correctly', async () => {
    // Create test user with hashed password
    const password_hash = createHash('sha256').update(testUserData.password).digest('hex');
    
    await db.insert(usersTable)
      .values({
        username: testUserData.username.toLowerCase(),
        email: testUserData.email,
        full_name: testUserData.full_name,
        password_hash
      })
      .execute();

    // Try login with different case
    const caseVariantInput: LoginInput = {
      username: testUserData.username.toUpperCase(),
      password: testUserData.password
    };

    await expect(login(caseVariantInput)).rejects.toThrow(/invalid username or password/i);
  });

  it('should authenticate user with special characters in password', async () => {
    const specialPassword = 'p@$$w0rd!#123';
    const password_hash = createHash('sha256').update(specialPassword).digest('hex');
    
    const users = await db.insert(usersTable)
      .values({
        username: testUserData.username,
        email: testUserData.email,
        full_name: testUserData.full_name,
        password_hash
      })
      .returning()
      .execute();

    const createdUser = users[0];

    const specialLoginInput: LoginInput = {
      username: testUserData.username,
      password: specialPassword
    };

    const result = await login(specialLoginInput);

    expect(result.id).toEqual(createdUser.id);
    expect(result.username).toEqual(testUserData.username);
    expect('password_hash' in result).toBe(false);
  });

  it('should verify user data integrity after login', async () => {
    // Create test user with hashed password
    const password_hash = createHash('sha256').update(testUserData.password).digest('hex');
    
    await db.insert(usersTable)
      .values({
        username: testUserData.username,
        email: testUserData.email,
        full_name: testUserData.full_name,
        password_hash
      })
      .execute();

    const result = await login(testLoginInput);

    // Verify all expected fields are present
    expect(typeof result.id).toBe('number');
    expect(typeof result.username).toBe('string');
    expect(typeof result.email).toBe('string');
    expect(typeof result.full_name).toBe('string');
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);

    // Verify no extra fields are included
    const expectedKeys = ['id', 'username', 'email', 'full_name', 'created_at', 'updated_at'];
    const actualKeys = Object.keys(result);
    expect(actualKeys.sort()).toEqual(expectedKeys.sort());
  });
});