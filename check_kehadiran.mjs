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

async function checkKehadiranTable() {
    console.log('====================================================');
    console.log('CHECKING tabel_kehadiran');
    console.log('====================================================\n');

    try {
        // 1. Check table structure
        console.log('1. TABLE STRUCTURE');
        console.log('----------------------------------------------------');

        const columns = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'tabel_kehadiran'
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

        const count = await sql`SELECT COUNT(*) as total FROM tabel_kehadiran`;
        console.log(`Total records: ${count[0].total}\n`);

        // 3. Sample data
        console.log('3. SAMPLE DATA (10 records)');
        console.log('----------------------------------------------------');

        const sample = await sql`
      SELECT * FROM tabel_kehadiran 
      LIMIT 10
    `;

        sample.forEach((row, idx) => {
            console.log(`\n${idx + 1}.`, JSON.stringify(row, null, 2));
        });

        console.log('\n====================================================\n');

        // 4. Sample with JOIN to student table
        console.log('4. SAMPLE DATA WITH JOINS');
        console.log('----------------------------------------------------');

        const sampleWithJoin = await sql`
      SELECT 
        k.*,
        s.nm_siswa,
        kls.nm_kelas
      FROM tabel_kehadiran k
      LEFT JOIN tabel_siswa s ON k.peserta_didik_id = s.peserta_didik_id
      LEFT JOIN tabel_anggotakelas ak ON s.peserta_didik_id = ak.peserta_didik_id
      LEFT JOIN tabel_kelas kls ON ak.rombongan_belajar_id = kls.rombongan_belajar_id
      WHERE s.nm_siswa IS NOT NULL
      LIMIT 5
    `;

        sampleWithJoin.forEach((row, idx) => {
            console.log(`\n${idx + 1}. ${row.nm_siswa || 'N/A'} (${row.nm_kelas || 'N/A'})`);
            console.log('   Full data:', JSON.stringify(row, null, 2));
        });

        console.log('\n====================================================\n');

        // 5. Check for aggregated data per student
        console.log('5. AGGREGATED ATTENDANCE PER STUDENT');
        console.log('----------------------------------------------------');

        const aggregated = await sql`
      SELECT 
        s.nm_siswa,
        kls.nm_kelas,
        SUM(CASE WHEN k.sakit IS NOT NULL THEN k.sakit ELSE 0 END) as total_sakit,
        SUM(CASE WHEN k.izin IS NOT NULL THEN k.izin ELSE 0 END) as total_izin,
        SUM(CASE WHEN k.alpha IS NOT NULL THEN k.alpha ELSE 0 END) as total_alpha
      FROM tabel_kehadiran k
      LEFT JOIN tabel_siswa s ON k.peserta_didik_id = s.peserta_didik_id
      LEFT JOIN tabel_anggotakelas ak ON s.peserta_didik_id = ak.peserta_didik_id
      LEFT JOIN tabel_kelas kls ON ak.rombongan_belajar_id = kls.rombongan_belajar_id
      WHERE s.nm_siswa IS NOT NULL
      GROUP BY s.nm_siswa, kls.nm_kelas
      LIMIT 5
    `;

        aggregated.forEach((row, idx) => {
            console.log(`\n${idx + 1}. ${row.nm_siswa || 'N/A'} (${row.nm_kelas || 'N/A'})`);
            console.log(`   Sakit: ${row.total_sakit || 0} hari`);
            console.log(`   Izin: ${row.total_izin || 0} hari`);
            console.log(`   Alpha/Tanpa Keterangan: ${row.total_alpha || 0} hari`);
        });

        console.log('\n====================================================\n');

    } catch (error) {
        console.error('Error:', error.message);
        console.error('Stack:', error.stack);
    }
}

checkKehadiranTable();
