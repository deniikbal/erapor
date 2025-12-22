import { NextRequest, NextResponse } from 'next/server';
import { getDbClient } from '@/lib/db';
import crypto from 'crypto';

// Test berbagai metode hashing yang umum digunakan aplikasi PHP
function testVariousHashMethods(password: string, salt: string, dbHash: string) {
    const results: any = {
        password,
        saltPreview: salt ? salt.substring(0, 20) + '...' : 'No salt',
        saltLength: salt ? salt.length : 0,
        dbHashFull: dbHash,
        dbHashLength: dbHash.length,
        methods: {}
    };

    if (!salt) {
        // Jika tidak ada salt, test metode tanpa salt
        results.methods['Plain(password)'] = password;
        results.methods['MD5(password)'] = crypto.createHash('md5').update(password).digest('hex');
        results.methods['SHA1(password)'] = crypto.createHash('sha1').update(password).digest('hex');
        results.methods['SHA256(password)'] = crypto.createHash('sha256').update(password).digest('hex');
        results.methods['SHA512(password)'] = crypto.createHash('sha512').update(password).digest('hex');
        return results;
    }

    // Method 1-2: SHA512
    results.methods['SHA512(salt+password)'] = crypto.createHash('sha512').update(salt + password).digest('hex');
    results.methods['SHA512(password+salt)'] = crypto.createHash('sha512').update(password + salt).digest('hex');

    // Method 3-4: MD5
    results.methods['MD5(salt+password)'] = crypto.createHash('md5').update(salt + password).digest('hex');
    results.methods['MD5(password+salt)'] = crypto.createHash('md5').update(password + salt).digest('hex');

    // Method 5-6: SHA256
    results.methods['SHA256(salt+password)'] = crypto.createHash('sha256').update(salt + password).digest('hex');
    results.methods['SHA256(password+salt)'] = crypto.createHash('sha256').update(password + salt).digest('hex');

    // Method 7-8: SHA1
    results.methods['SHA1(salt+password)'] = crypto.createHash('sha1').update(salt + password).digest('hex');
    results.methods['SHA1(password+salt)'] = crypto.createHash('sha1').update(password + salt).digest('hex');

    // Method 9-10: Double hashing
    results.methods['MD5(MD5(password)+salt)'] = crypto.createHash('md5').update(crypto.createHash('md5').update(password).digest('hex') + salt).digest('hex');
    results.methods['SHA1(SHA1(password)+salt)'] = crypto.createHash('sha1').update(crypto.createHash('sha1').update(password).digest('hex') + salt).digest('hex');

    // Method 11-12: Nested hash
    const saltPlusPass = salt + password;
    results.methods['SHA512(SHA512(salt+password))'] = crypto.createHash('sha512').update(crypto.createHash('sha512').update(saltPlusPass).digest('hex')).digest('hex');
    results.methods['MD5(SHA512(salt+password))'] = crypto.createHash('md5').update(crypto.createHash('sha512').update(saltPlusPass).digest('hex')).digest('hex');

    // Method 13-15: Tanpa salt
    results.methods['Plain(password)'] = password;
    results.methods['MD5(password)'] = crypto.createHash('md5').update(password).digest('hex');
    results.methods['SHA1(password)'] = crypto.createHash('sha1').update(password).digest('hex');

    return results;
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
            return NextResponse.json({
                found: false,
                message: 'User tidak ditemukan',
            });
        }

        const user = result[0];

        // Test semua metode hashing
        const testResults = testVariousHashMethods(password, user.salt || '', user.password);

        // Cek match dengan database
        const dbPasswordHash = user.password;
        const matches: string[] = [];

        Object.entries(testResults.methods).forEach(([method, hash]) => {
            if (hash === dbPasswordHash) {
                matches.push(method);
            }
        });

        return NextResponse.json({
            found: true,
            user: {
                userid: user.userid,
                nama: user.nama,
                level: user.level,
            },
            databaseHashPreview: dbPasswordHash.substring(0, 30) + '...',
            databaseHashFull: dbPasswordHash,
            testPassword: password,
            matches: matches.length > 0 ? matches : ['❌ Tidak ada metode yang cocok'],
            recommendation: matches.length > 0
                ? `✅ Gunakan metode: ${matches[0]}`
                : '❌ Password salah ATAU metode hashing belum dicoba. Pastikan password yang Anda input adalah password ASLI dari aplikasi pemerintah.',
            ...testResults,
        });

    } catch (error: any) {
        return NextResponse.json({
            error: true,
            message: error.message,
        }, { status: 500 });
    }
}
