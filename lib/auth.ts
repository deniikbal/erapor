import { getDbClient, User } from './db';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

/**
 * Hash password dengan SHA-512 dan salt (untuk legacy users)
 */
function hashPasswordWithSalt(password: string, salt: string): string {
  // Implementasi hashing yang sama dengan sistem lama
  const hash = crypto
    .createHash('sha512')
    .update(salt + password)
    .digest('hex');
  return hash;
}

/**
 * Verifikasi password dengan berbagai metode hashing
 */
async function verifyPassword(plainPassword: string, hashedPassword: string, salt?: string): Promise<boolean> {
  try {
    // Method 1: Bcrypt (untuk user baru seperti "silmi")
    if (hashedPassword.startsWith('$2y$') || hashedPassword.startsWith('$2a$') || hashedPassword.startsWith('$2b$')) {
      // Bcrypt PHP menggunakan $2y$, Node.js bcrypt bisa verify dengan $2a$
      const bcryptHash = hashedPassword.replace('$2y$', '$2a$');
      return await bcrypt.compare(plainPassword, bcryptHash);
    }
    
    // Method 2: SHA-512 dengan salt (untuk user lama)
    if (salt) {
      const hash = hashPasswordWithSalt(plainPassword, salt);
      return hash === hashedPassword;
    }
    
    // Method 3: Plain text comparison (fallback, tidak direkomendasikan)
    return plainPassword === hashedPassword;
  } catch (error) {
    console.error('Password verification error:', error);
    return false;
  }
}

export async function loginUser(username: string, password: string): Promise<{ user: User | null; error: string | null }> {
  try {
    const sql = getDbClient();
    
    console.log('Login attempt for username:', username);
    
    // Query: Ambil user berdasarkan username
    const result = await sql`
      SELECT * FROM user_login 
      WHERE userid = ${username}
      LIMIT 1
    `;

    if (result.length === 0) {
      console.log('User not found:', username);
      return { user: null, error: 'Username tidak ditemukan' };
    }

    const user = result[0] as User;
    console.log('User found:', user.userid, 'Level:', user.level);
    
    // Verifikasi password
    const isPasswordValid = await verifyPassword(password, user.password, user.salt);
    
    if (!isPasswordValid) {
      console.log('Password incorrect for user:', username);
      return { user: null, error: 'Password salah' };
    }

    console.log('Login successful for user:', username);
    
    // Hapus password dan salt dari response
    const { password: _, salt: __, ...userWithoutPassword } = user;
    
    return { user: userWithoutPassword as User, error: null };
  } catch (error) {
    console.error('Login error:', error);
    return { user: null, error: 'Terjadi kesalahan saat login: ' + (error as Error).message };
  }
}

// Client-side auth functions are now in lib/auth-client.ts
// This file contains only server-side functions
