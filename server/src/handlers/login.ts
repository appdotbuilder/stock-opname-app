import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginInput, type User } from '../schema';
import { eq } from 'drizzle-orm';
import { createHash, timingSafeEqual } from 'crypto';

export const login = async (input: LoginInput): Promise<Omit<User, 'password_hash'>> => {
  try {
    // Find user by username
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.username, input.username))
      .execute();

    if (users.length === 0) {
      throw new Error('Invalid username or password');
    }

    const user = users[0];

    // Verify password using timing-safe comparison
    const inputPasswordHash = createHash('sha256').update(input.password).digest('hex');
    const storedPasswordHash = user.password_hash;
    
    // Use timing-safe comparison to prevent timing attacks
    const isValidPassword = inputPasswordHash.length === storedPasswordHash.length && 
      timingSafeEqual(Buffer.from(inputPasswordHash), Buffer.from(storedPasswordHash));
    
    if (!isValidPassword) {
      throw new Error('Invalid username or password');
    }

    // Return user data without password hash
    const { password_hash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  } catch (error) {
    console.error('Login failed:', error);
    throw error;
  }
};