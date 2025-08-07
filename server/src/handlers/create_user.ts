import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput, type User } from '../schema';

export const createUser = async (input: CreateUserInput): Promise<Omit<User, 'password_hash'>> => {
  try {
    // Hash the password using Bun's built-in password hashing
    const passwordHash = await Bun.password.hash(input.password);

    // Insert user record
    const result = await db.insert(usersTable)
      .values({
        username: input.username,
        email: input.email,
        full_name: input.full_name,
        password_hash: passwordHash
      })
      .returning()
      .execute();

    // Return user data without password hash
    const user = result[0];
    const { password_hash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  } catch (error) {
    console.error('User creation failed:', error);
    throw error;
  }
};