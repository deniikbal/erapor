import { NextRequest, NextResponse } from 'next/server';
import { getDbClient } from '@/lib/db';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

function hashPasswordWithSalt(password: string, salt: string): string {
    const hash = crypto
        .createHash('sha512')
        .update(salt + password)
        .digest('hex');
    return hash;
}

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username') || 'administrator';
    const password = searchParams.get('password') || 'administrator';

    try {
        const sql = getDbClient();

        // Query user
        const result = await sql`
      SELECT * FROM user_login 
      WHERE userid = ${username}
      LIMIT 1
    `;

        if (result.length === 0) {
            // Cari user yang mirip
            const searchResult = await sql`
        SELECT userid, nama, level FROM user_login 
        WHERE userid LIKE ${`%${username}%`}
        LIMIT 10
      `;

            return NextResponse.json({
                found: false,
                message: 'User tidak ditemukan',
                similar: searchResult,
            });
        }

        const user = result[0];

        // Test semua metode verifikasi
        const tests: any = {
            userFound: true,
            userId: user.userid,
            nama: user.nama,
            level: user.level,
            passwordHashType: user.password.substring(0, 4),
            passwordHashLength: user.password.length,
            hasSalt: !!user.salt,
            saltLength: user.salt?.length || 0,
        };

        // Method 1: Bcrypt
        if (user.password.startsWith('$2y$') || user.password.startsWith('$2a$') || user.password.startsWith('$2b$')) {
            tests.method = 'Bcrypt';
            const bcryptHash = user.password.replace('$2y$', '$2a$');
            tests.bcryptValid = await bcrypt.compare(password, bcryptHash);
            tests.passwordMatch = tests.bcryptValid;
        }
        // Method 2: SHA-512 + Salt
        else if (user.salt) {
            tests.method = 'SHA-512 + Salt';
            const hash = hashPasswordWithSalt(password, user.salt);
            tests.sha512Valid = hash === user.password;
            tests.passwordMatch = tests.sha512Valid;
            tests.generatedHash = hash.substring(0, 30) + '...';
            tests.expectedHash = user.password.substring(0, 30) + '...';
        }
        // Method 3: Plain text
        else {
            tests.method = 'Plain Text';
            tests.plainTextValid = password === user.password;
            tests.passwordMatch = tests.plainTextValid;
            tests.dbPassword = user.password;
            tests.inputPassword = password;
        }

        return NextResponse.json({
            found: true,
            tests,
            verdict: tests.passwordMatch
                ? '✅ PASSWORD BENAR - Seharusnya bisa login'
                : '❌ PASSWORD SALAH - Ada masalah dengan password',
        });

    } catch (error: any) {
        return NextResponse.json({
            error: true,
            message: error.message,
            stack: error.stack,
        }, { status: 500 });
    }
}
