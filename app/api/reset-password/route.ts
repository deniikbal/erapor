import { NextRequest, NextResponse } from 'next/server';
import { getDbClient } from '@/lib/db';
import crypto from 'crypto';

function hashPasswordWithSalt(password: string, salt: string): string {
    const hash = crypto
        .createHash('sha512')
        .update(salt + password)
        .digest('hex');
    return hash;
}

export async function POST(request: NextRequest) {
    try {
        const { username, newPassword } = await request.json();

        if (!username || !newPassword) {
            return NextResponse.json(
                { error: 'Username dan password baru harus diisi' },
                { status: 400 }
            );
        }

        const sql = getDbClient();

        // Cek apakah user ada
        const userCheck = await sql`
      SELECT * FROM user_login 
      WHERE userid = ${username}
      LIMIT 1
    `;

        if (userCheck.length === 0) {
            return NextResponse.json(
                { error: 'User tidak ditemukan' },
                { status: 404 }
            );
        }

        const user = userCheck[0];

        // Generate salt baru
        const newSalt = crypto.randomBytes(64).toString('hex');

        // Hash password dengan salt baru
        const newHash = hashPasswordWithSalt(newPassword, newSalt);

        // Update password di database
        await sql`
      UPDATE user_login 
      SET password = ${newHash}, 
          salt = ${newSalt}
      WHERE userid = ${username}
    `;

        return NextResponse.json({
            success: true,
            message: `Password untuk user "${username}" berhasil direset`,
            detail: {
                username: user.userid,
                nama: user.nama,
                level: user.level,
                newPasswordLength: newPassword.length,
                method: 'SHA-512 + Salt',
            },
        });

    } catch (error: any) {
        console.error('Reset password error:', error);
        return NextResponse.json(
            { error: 'Terjadi kesalahan: ' + error.message },
            { status: 500 }
        );
    }
}
