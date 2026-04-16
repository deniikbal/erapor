const { neon } = require('@neondatabase/serverless');

async function checkSemester() {
  const databaseUrl = 'postgresql://neondb_owner:npg_4WoESZaLMBR0@ep-nameless-bonus-ahsgahhb-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
  const sql = neon(databaseUrl);

  try {
    console.log('--- Memeriksa struktur tabel_kelas ---');
    const columns = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'tabel_kelas'
    `;
    
    const hasSemesterId = columns.some(c => c.column_name === 'semester_id');
    console.log(`Apakah ada kolom semester_id? ${hasSemesterId ? 'YA' : 'TIDAK'}`);

    if (hasSemesterId) {
      console.log('\n--- Memeriksa data semester_id di tabel_kelas ---');
      const distinctSemesters = await sql`
        SELECT DISTINCT semester_id 
        FROM tabel_kelas 
        ORDER BY semester_id DESC
      `;
      
      console.log('Data semester_id yang ditemukan:');
      console.table(distinctSemesters);

      const has20251 = distinctSemesters.some(s => s.semester_id === '20251');
      const has20252 = distinctSemesters.some(s => s.semester_id === '20252');

      console.log(`\nApakah ada data semester_id 20251? ${has20251 ? 'YA' : 'TIDAK'}`);
      console.log(`Apakah ada data semester_id 20252? ${has20252 ? 'YA' : 'TIDAK'}`);
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

checkSemester();
