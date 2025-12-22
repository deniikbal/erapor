import { getDbClient } from '@/lib/db';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export default async function DebugLogin() {
    const username = 'administrator';
    const password = 'administrator';

    const sql = getDbClient();

    try {
        const result = await sql`
      SELECT * FROM user_login 
      WHERE userid = ${username}
      LIMIT 1
    `;

        if (result.length === 0) {
            return (
                <div className="p-8">
                    <h1 className="text-2xl font-bold mb-4">❌ User Tidak Ditemukan</h1>
                    <p>Username &quot;{username}&quot; tidak ada di database</p>
                </div>
            );
        }

        const user = result[0];

        // Test password verification
        let testResult = '';

        if (user.password.startsWith('$2y$') || user.password.startsWith('$2a$') || user.password.startsWith('$2b$')) {
            const bcryptHash = user.password.replace('$2y$', '$2a$');
            const isValid = await bcrypt.compare(password, bcryptHash);
            testResult = `Bcrypt: ${isValid ? '✅ VALID' : '❌ INVALID'}`;
        } else if (user.salt) {
            const hash = crypto.createHash('sha512').update(user.salt + password).digest('hex');
            const isValid = hash === user.password;
            testResult = `SHA-512+Salt: ${isValid ? '✅ VALID' : '❌ INVALID'}`;
        } else {
            const isValid = password === user.password;
            testResult = `Plain: ${isValid ? '✅ VALID' : '❌ INVALID'}`;
        }

        return (
            <div className="p-8 space-y-4">
                <h1 className="text-2xl font-bold">🔍 Debug Login</h1>

                <div className="bg-gray-100 p-4 rounded space-y-2">
                    <p><strong>Username:</strong> {user.userid}</p>
                    <p><strong>Nama:</strong> {user.nama}</p>
                    <p><strong>Level:</strong> {user.level}</p>
                    <p><strong>Hash Type:</strong> {user.password.substring(0, 4)}...</p>
                    <p><strong>Hash Length:</strong> {user.password.length} chars</p>
                    <p><strong>Has Salt:</strong> {user.salt ? 'Yes' : 'No'}</p>
                    <p className="text-lg mt-4"><strong>Test Result:</strong> {testResult}</p>
                </div>

                <div className="bg-blue-50 border border-blue-200 p-4 rounded">
                    <p className="font-mono text-sm">Password Hash: {user.password.substring(0, 50)}...</p>
                    {user.salt && <p className="font-mono text-sm">Salt: {user.salt.substring(0, 20)}...</p>}
                </div>
            </div>
        );
    } catch (error) {
        return (
            <div className="p-8">
                <h1 className="text-2xl font-bold mb-4">❌ Error</h1>
                <pre className="bg-red-50 p-4 rounded">{JSON.stringify(error, null, 2)}</pre>
            </div>
        );
    }
}
