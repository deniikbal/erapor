import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

async function checkStructure() {
  console.log('=== TABEL_KELAS STRUCTURE ===');
  const kelasStructure = await sql`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'tabel_kelas'
    ORDER BY ordinal_position
  `;
  console.log(JSON.stringify(kelasStructure, null, 2));

  console.log('\n=== TABEL_ANGGOTAKELAS STRUCTURE ===');
  const anggotaStructure = await sql`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'tabel_anggotakelas'
    ORDER BY ordinal_position
  `;
  console.log(JSON.stringify(anggotaStructure, null, 2));

  console.log('\n=== TABEL_KELAS_EKSKUL STRUCTURE ===');
  const ekskulStructure = await sql`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'tabel_kelas_ekskul'
    ORDER BY ordinal_position
  `;
  console.log(JSON.stringify(ekskulStructure, null, 2));

  console.log('\n=== SAMPLE DATA TABEL_KELAS ===');
  const kelasSample = await sql`
    SELECT * FROM tabel_kelas LIMIT 5
  `;
  console.log(JSON.stringify(kelasSample, null, 2));

  console.log('\n=== SAMPLE DATA TABEL_ANGGOTAKELAS ===');
  const anggotaSample = await sql`
    SELECT * FROM tabel_anggotakelas LIMIT 5
  `;
  console.log(JSON.stringify(anggotaSample, null, 2));

  console.log('\n=== CHECK TABEL_KELAS_EKSKUL EXISTS ===');
  const ekskulExists = await sql`
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_name = 'tabel_kelas_ekskul'
    )
  `;
  console.log(JSON.stringify(ekskulExists, null, 2));
}

checkStructure().catch(console.error);
