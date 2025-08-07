import { type CreateUserInput, type User } from '../schema';

export const createUser = async (input: CreateUserInput): Promise<Omit<User, 'password_hash'>> => {
    // This is a placeholder declaration! Real code should be implemented here.
    // The goal of this handler is creating a new user account with hashed password.
    // Should hash the password before storing in database and return user data without password hash.
    return Promise.resolve({
        id: 1,
        username: input.username,
        email: input.email,
        full_name: input.full_name,
        created_at: new Date(),
        updated_at: new Date()
    } as Omit<User, 'password_hash'>);
};