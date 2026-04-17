import { getDbClient } from './lib/db';

async function checkTables() {
    const sql = getDbClient();
    try {
        const tables = await sql`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
              AND table_name LIKE '%nilai%'
        `;
        console.log('Tables containing "nilai":', tables.map(t => t.table_name));
        
        // Check columns for tabel_nilaiakhir
        const cols = await sql`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'tabel_nilaiakhir'
        `;
        console.log('Columns in tabel_nilaiakhir:', cols.map(c => `${c.column_name} (${c.data_type})`));

        // Check columns for tabel_nilai_rapor if it exists
        const hasRapor = tables.some(t => t.table_name === 'tabel_nilai_rapor');
        if (hasRapor) {
            const colsRapor = await sql`
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = 'tabel_nilai_rapor'
            `;
            console.log('Columns in tabel_nilai_rapor:', colsRapor.map(c => `${c.column_name} (${c.data_type})`));
        }

    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

checkTables();
