// Script untuk reset password admin
// Jalankan dengan: node reset-admin-password.js

const { neon } = require('@neondatabase/serverless');
const bcrypt = require('bcryptjs');
const readline = require('readline');
const fs = require('fs');
const path = require('path');

// Baca DATABASE_URL dari .env file
const envPath = path.join(__dirname, '.env');
const envContent = fs.readFileSync(envPath, 'utf8');

// Parse .env file dengan benar (handle Windows line endings dan quotes)
let databaseUrl = null;
envContent.split(/\r?\n/).forEach(line => {
    if (line.startsWith('DATABASE_URL=')) {
        // Ambil semua setelah 'DATABASE_URL='
        databaseUrl = line.substring('DATABASE_URL='.length).trim();
        // Hapus quotes jika ada
        if (databaseUrl.startsWith('"') && databaseUrl.endsWith('"')) {
            databaseUrl = databaseUrl.slice(1, -1);
        } else if (databaseUrl.startsWith("'") && databaseUrl.endsWith("'")) {
            databaseUrl = databaseUrl.slice(1, -1);
        }
    }
});

if (!databaseUrl) {
    console.error('❌ DATABASE_URL tidak ditemukan di file .env');
    process.exit(1);
}

console.log('🔌 Connecting to database...\n');
const sql = neon(databaseUrl);

async function resetAdminPassword() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    return new Promise(async (resolve) => {
        // Input username
        rl.question('Masukkan username admin (default: admin): ', async (username) => {
            const adminUsername = username.trim() || 'admin';

            // Input password baru
            rl.question('Masukkan password baru: ', async (newPassword) => {
                if (!newPassword || newPassword.trim().length < 4) {
                    console.log('❌ Password harus minimal 4 karakter!');
                    rl.close();
                    resolve();
                    return;
                }

                try {
                    console.log('\n🔍 Mencari user:', adminUsername);

                    // Cek apakah user ada
                    const users = await sql`
                        SELECT userid, level FROM user_login 
                        WHERE userid = ${adminUsername}
                   `;

                    if (users.length === 0) {
                        console.log('❌ User tidak ditemukan!');
                        console.log('\n📋 Daftar user di database:');
                        const allUsers = await sql`SELECT userid, level FROM user_login`;
                        allUsers.forEach(u => console.log(`   - ${u.userid} (${u.level})`));

                        rl.close();
                        resolve();
                        return;
                    }

                    console.log('✅ User ditemukan:', users[0].userid, `(${users[0].level})`);
                    console.log('🔐 Meng-hash password baru...');

                    // Hash password dengan bcrypt
                    const hashedPassword = await bcrypt.hash(newPassword.trim(), 10);

                    console.log('💾 Mengupdate password di database...');

                    // Update password dan remove salt (karena bcrypt sudah ada salt built-in)
                    await sql`
                        UPDATE user_login 
                        SET password = ${hashedPassword}, salt = NULL
                        WHERE userid = ${adminUsername}
                    `;

                    console.log('\n✅ Password berhasil direset!');
                    console.log('📌 Username:', adminUsername);
                    console.log('📌 Password baru:', newPassword.trim());
                    console.log('\n💡 Silakan login dengan username dan password baru.');

                } catch (error) {
                    console.error('\n❌ Error:', error.message);
                } finally {
                    rl.close();
                    resolve();
                }
            });
        });
    });
}

// Jalankan script
console.log('===========================================');
console.log('🔐 RESET PASSWORD ADMIN');
console.log('===========================================\n');

resetAdminPassword().then(() => {
    console.log('\n===========================================');
    process.exit(0);
});
