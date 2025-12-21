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

async function debugEkstra() {
    console.log('====================================================');
    console.log('DEBUG EKSTRAKURIKULER JOIN');
    console.log('====================================================\n');

    try {
        // 1. Check raw nilai_ekstra data
        console.log('1. RAW DATA: tabel_nilai_ekstra');
        console.log('----------------------------------------------------');
        const rawNilai = await sql`
      SELECT 
        peserta_didik_id,
        id_ekstra,
        nilai_ekstra,
        deskripsi
      FROM tabel_nilai_ekstra
      WHERE deskripsi IS NOT NULL
      LIMIT 3
    `;

        console.log('Sample nilai_ekstra records:');
        rawNilai.forEach((row, idx) => {
            console.log(`\n${idx + 1}.`);
            console.log(`  id_ekstra: ${row.id_ekstra}`);
            console.log(`  nilai: ${row.nilai_ekstra}`);
            console.log(`  deskripsi: ${row.deskripsi?.substring(0, 80)}...`);
        });

        console.log('\n====================================================\n');

        // 2. Check tabel_ekstra
        console.log('2. DATA: tabel_ekstra');
        console.log('----------------------------------------------------');
        const ekstraData = await sql`
      SELECT *
      FROM tabel_ekstra
      LIMIT 5
    `;

        console.log('Sample ekstra records:');
        ekstraData.forEach((row, idx) => {
            console.log(`\n${idx + 1}.`, row);
        });

        console.log('\n====================================================\n');

        // 3. Test JOIN
        console.log('3. TEST JOIN');
        console.log('----------------------------------------------------');
        const joined = await sql`
      SELECT 
        ne.id_ekstra as nilai_id_ekstra,
        e.id_ekstra as ekstra_id_ekstra,
        e.nama_ekstra,
        ne.nilai_ekstra,
        ne.deskripsi
      FROM tabel_nilai_ekstra ne
      LEFT JOIN tabel_ekstra e ON ne.id_ekstra = e.id_ekstra
      WHERE ne.deskripsi IS NOT NULL
      LIMIT 5
    `;

        console.log('JOIN results:');
        joined.forEach((row, idx) => {
            console.log(`\n${idx + 1}.`);
            console.log(`  nilai.id_ekstra: ${row.nilai_id_ekstra}`);
            console.log(`  ekstra.id_ekstra: ${row.ekstra_id_ekstra || 'NULL (no match!)'}`);
            console.log(`  nama_ekstra: ${row.nama_ekstra || 'NULL'}`);
            console.log(`  deskripsi: ${row.deskripsi?.substring(0, 60)}...`);
        });

        console.log('\n====================================================\n');

        // 4. Check if there's alternative table
        console.log('4. ALTERNATIVE: Check refekstra_kurikuler');
        console.log('----------------------------------------------------');

        try {
            const refEkstra = await sql`SELECT * FROM refekstra_kurikuler LIMIT 3`;
            console.log('refekstra_kurikuler data:');
            refEkstra.forEach((row, idx) => {
                console.log(`${idx + 1}.`, row);
            });
        } catch (err) {
            console.log('Table refekstra_kurikuler:', err.message);
        }

        console.log('\n====================================================\n');

    } catch (error) {
        console.error('Error:', error.message);
        console.error('Stack:', error.stack);
    }
}

debugEkstra();
