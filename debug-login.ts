/**
 * Script untuk debugging masalah login
 * Jalankan dengan: npx tsx debug-login.ts <username> <password>
 */

import { getDbClient } from './lib/db';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

function hashPasswordWithSalt(password: string, salt: string): string {
    const hash = crypto
        .createHash('sha512')
        .update(salt + password)
        .digest('hex');
    return hash;
}

async function debugLogin(username: string, password: string) {
    console.log('='.repeat(60));
    console.log('DEBUG LOGIN SYSTEM');
    console.log('='.repeat(60));
    console.log(`Username: ${username}`);
    console.log(`Password: ${password}`);
    console.log('');

    try {
        const sql = getDbClient();

        // Query user
        const result = await sql`
      SELECT * FROM user_login 
      WHERE userid = ${username}
      LIMIT 1
    `;

        if (result.length === 0) {
            console.log('❌ USER TIDAK DITEMUKAN');
            console.log('');

            // Coba cari di database dengan LIKE
            const searchResult = await sql`
        SELECT userid, nama, level FROM user_login 
        WHERE userid LIKE ${`%${username}%`}
        LIMIT 5
      `;

            if (searchResult.length > 0) {
                console.log('🔍 Kemungkinan username yang mirip:');
                searchResult.forEach((u: any) => {
                    console.log(`  - ${u.userid} (${u.nama}, Level: ${u.level})`);
                });
            }

            return;
        }

        const user = result[0];
        console.log('✅ USER DITEMUKAN');
        console.log(`   ID: ${user.id}`);
        console.log(`   UserID: ${user.userid}`);
        console.log(`   Nama: ${user.nama}`);
        console.log(`   Level: ${user.level}`);
        console.log('');

        // Debug password
        console.log('🔐 INFORMASI PASSWORD:');
        console.log(`   Hash Type: ${user.password.substring(0, 4)}`);
        console.log(`   Hash Length: ${user.password.length} karakter`);
        console.log(`   Salt: ${user.salt ? 'Ada (' + user.salt.length + ' karakter)' : 'Tidak Ada'}`);
        console.log('');

        // Test password dengan berbagai metode
        console.log('🧪 UJI VERIFIKASI PASSWORD:');

        // Method 1: Bcrypt
        if (user.password.startsWith('$2y$') || user.password.startsWith('$2a$') || user.password.startsWith('$2b$')) {
            console.log('   Method: Bcrypt');
            const bcryptHash = user.password.replace('$2y$', '$2a$');
            const isValid = await bcrypt.compare(password, bcryptHash);
            console.log(`   Result: ${isValid ? '✅ VALID' : '❌ INVALID'}`);

            if (!isValid) {
                // Test dengan password asli dari database (jika ada di plain text)
                console.log('\n   🔍 Debugging lebih lanjut:');
                console.log(`   Hash dari database: ${user.password.substring(0, 20)}...`);
            }
        }
        // Method 2: SHA-512 dengan salt
        else if (user.salt) {
            console.log('   Method: SHA-512 + Salt');
            const hash = hashPasswordWithSalt(password, user.salt);
            const isValid = hash === user.password;
            console.log(`   Result: ${isValid ? '✅ VALID' : '❌ INVALID'}`);

            if (!isValid) {
                console.log('\n   🔍 Hash comparison:');
                console.log(`   Generated: ${hash.substring(0, 30)}...`);
                console.log(`   Expected:  ${user.password.substring(0, 30)}...`);
            }
        }
        // Method 3: Plain text
        else {
            console.log('   Method: Plain Text');
            const isValid = password === user.password;
            console.log(`   Result: ${isValid ? '✅ VALID' : '❌ INVALID'}`);

            if (!isValid) {
                console.log(`\n   Expected password: ${user.password}`);
                console.log(`   Your password:     ${password}`);
                console.log(`   Match exactly:     ${password === user.password}`);
            }
        }

    } catch (error) {
        console.error('❌ ERROR:', error);
    }
}

// Jalankan script
const args = process.argv.slice(2);
if (args.length < 2) {
    console.log('Usage: npx tsx debug-login.ts <username> <password>');
    process.exit(1);
}

debugLogin(args[0], args[1]).then(() => process.exit(0));
