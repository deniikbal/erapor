import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';

// Load .env
try {
    const envContent = readFileSync('.env', 'utf-8');
    envContent.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
            const [key, ...valueParts] = trimmed.split('=');
            process.env[key.trim()] = valueParts.join('=').trim();
        }
    });
} catch (err) {
    console.error('Error loading .env');
}

const sql = neon(process.env.DATABASE_URL);

async function checkKokurikulerTable() {
    console.log('====================================================');
    console.log('CHECKING tabel_deskripsikurikuler');
    console.log('====================================================\n');

    try {
        // 1. Check table structure
        console.log('1. TABLE STRUCTURE');
        console.log('----------------------------------------------------');

        const columns = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'tabel_deskripsikurikuler'
      ORDER BY ordinal_position
    `;

        if (columns.length === 0) {
            console.log('Table not found!\n');
            return;
        }

        console.log('Columns:');
        columns.forEach(col => {
            console.log(`  ${col.column_name.padEnd(35)} ${col.data_type.padEnd(25)} ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
        });

        console.log('\n====================================================\n');

        // 2. Count records
        console.log('2. DATA STATISTICS');
        console.log('----------------------------------------------------');

        const count = await sql`SELECT COUNT(*) as total FROM tabel_deskripsikurikuler`;
        console.log(`Total records: ${count[0].total}\n`);

        // 3. Sample data
        console.log('3. SAMPLE DATA (5 records)');
        console.log('----------------------------------------------------');

        const sample = await sql`
      SELECT * FROM tabel_deskripsikurikuler 
      LIMIT 5
    `;

        sample.forEach((row, idx) => {
            console.log(`\n${idx + 1}.`, JSON.stringify(row, null, 2));
        });

        console.log('\n====================================================\n');

        // 4. Check schema 'projec'
        console.log('4. CHECKING FOR "projec" COLUMN/FIELD');
        console.log('----------------------------------------------------');

        const schemaCol = columns.find(c => c.column_name.toLowerCase().includes('projec') || c.column_name.toLowerCase().includes('project'));

        if (schemaCol) {
            console.log(`Found column: ${schemaCol.column_name} (${schemaCol.data_type})`);

            // Get distinct values
            const distinctValues = await sql`
        SELECT DISTINCT ${sql(schemaCol.column_name)} as value, COUNT(*) as count
        FROM tabel_deskripsikurikuler
        GROUP BY ${sql(schemaCol.column_name)}
        LIMIT 10
      `;

            console.log('\nDistinct values:');
            distinctValues.forEach(v => {
                console.log(`  ${v.value}: ${v.count} records`);
            });
        } else {
            console.log('No "projec" or "project" column found');
            console.log('\nAll columns:', columns.map(c => c.column_name).join(', '));
        }

        console.log('\n====================================================\n');

        // 5. Sample with student join
        console.log('5. SAMPLE DATA WITH STUDENT INFO');
        console.log('----------------------------------------------------');

        const sampleWithStudent = await sql`
      SELECT 
        d.*,
        s.nm_siswa,
        k.nm_kelas
      FROM tabel_deskripsikurikuler d
      LEFT JOIN tabel_siswa s ON d.peserta_didik_id = s.peserta_didik_id
      LEFT JOIN tabel_anggotakelas ak ON s.peserta_didik_id = ak.peserta_didik_id
      LEFT JOIN tabel_kelas k ON ak.rombongan_belajar_id = k.rombongan_belajar_id
      WHERE s.nm_siswa IS NOT NULL
      LIMIT 3
    `;

        sampleWithStudent.forEach((row, idx) => {
            console.log(`\n${idx + 1}. ${row.nm_siswa || 'N/A'} (${row.nm_kelas || 'N/A'})`);
            console.log('   Data:', JSON.stringify(row, null, 2).substring(0, 500));
        });

        console.log('\n====================================================\n');

    } catch (error) {
        console.error('Error:', error.message);
        console.error('Stack:', error.stack);
    }
}

checkKokurikulerTable();
