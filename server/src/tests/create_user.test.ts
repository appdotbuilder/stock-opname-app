import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput } from '../schema';
import { createUser } from '../handlers/create_user';
import { eq } from 'drizzle-orm';

// Test input with all required fields
const testInput: CreateUserInput = {
  username: 'testuser',
  email: 'test@example.com',
  full_name: 'Test User',
  password: 'password123'
};

describe('createUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a user successfully', async () => {
    const result = await createUser(testInput);

    // Basic field validation
    expect(result.username).toEqual('testuser');
    expect(result.email).toEqual('test@example.com');
    expect(result.full_name).toEqual('Test User');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);

    // Should not include password_hash in return
    expect((result as any).password_hash).toBeUndefined();
  });

  it('should save user to database with hashed password', async () => {
    const result = await createUser(testInput);

    // Query database to verify user was saved
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users).toHaveLength(1);
    const savedUser = users[0];

    expect(savedUser.username).toEqual('testuser');
    expect(savedUser.email).toEqual('test@example.com');
    expect(savedUser.full_name).toEqual('Test User');
    expect(savedUser.password_hash).toBeDefined();
    expect(savedUser.password_hash).not.toEqual('password123'); // Password should be hashed
    expect(savedUser.password_hash.length).toBeGreaterThan(0);
    expect(savedUser.created_at).toBeInstanceOf(Date);
    expect(savedUser.updated_at).toBeInstanceOf(Date);
  });

  it('should hash password correctly', async () => {
    const result = await createUser(testInput);

    // Get the hashed password from database
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    const savedUser = users[0];

    // Verify password can be verified with Bun's password verification
    const isValid = await Bun.password.verify('password123', savedUser.password_hash);
    expect(isValid).toBe(true);

    // Verify wrong password fails
    const isInvalid = await Bun.password.verify('wrongpassword', savedUser.password_hash);
    expect(isInvalid).toBe(false);
  });

  it('should handle unique constraint violation for username', async () => {
    // Create first user
    await createUser(testInput);

    // Try to create another user with same username
    const duplicateInput: CreateUserInput = {
      ...testInput,
      email: 'different@example.com' // Different email but same username
    };

    await expect(createUser(duplicateInput)).rejects.toThrow(/duplicate key value violates unique constraint/i);
  });

  it('should handle unique constraint violation for email', async () => {
    // Create first user
    await createUser(testInput);

    // Try to create another user with same email
    const duplicateInput: CreateUserInput = {
      ...testInput,
      username: 'differentuser', // Different username but same email
      email: 'test@example.com'
    };

    await expect(createUser(duplicateInput)).rejects.toThrow(/duplicate key value violates unique constraint/i);
  });

  it('should create multiple users with different credentials', async () => {
    const user1Input: CreateUserInput = {
      username: 'user1',
      email: 'user1@example.com',
      full_name: 'User One',
      password: 'password123'
    };

    const user2Input: CreateUserInput = {
      username: 'user2',
      email: 'user2@example.com',
      full_name: 'User Two',
      password: 'differentpass'
    };

    const result1 = await createUser(user1Input);
    const result2 = await createUser(user2Input);

    // Verify both users were created with different IDs
    expect(result1.id).not.toEqual(result2.id);
    expect(result1.username).toEqual('user1');
    expect(result2.username).toEqual('user2');

    // Verify both exist in database
    const allUsers = await db.select().from(usersTable).execute();
    expect(allUsers).toHaveLength(2);
  });

  it('should handle long passwords correctly', async () => {
    const longPasswordInput: CreateUserInput = {
      ...testInput,
      password: 'a'.repeat(100) // 100 character password
    };

    const result = await createUser(longPasswordInput);

    // Get the hashed password from database
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    const savedUser = users[0];

    // Verify long password can be verified
    const isValid = await Bun.password.verify('a'.repeat(100), savedUser.password_hash);
    expect(isValid).toBe(true);
  });
});