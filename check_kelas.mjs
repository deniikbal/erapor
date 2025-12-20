import { config } from 'dotenv';
import { neon } from '@neondatabase/serverless';

config();

const sql = neon(process.env.DATABASE_URL);

async function checkStructure() {
  try {
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

    console.log('\n=== CHECK TABEL_KELAS_EKSKUL EXISTS ===');
    const ekskulCheck = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name LIKE '%kelas%' OR table_name LIKE '%ekskul%'
    `;
    console.log(JSON.stringify(ekskulCheck, null, 2));

    console.log('\n=== SAMPLE DATA TABEL_KELAS (WITH JENIS_ROMBEL) ===');
    const kelasSample = await sql`
      SELECT rombongan_belajar_id, nm_kelas, tingkat_pendidikan_id, jenis_rombel, ptk_id
      FROM tabel_kelas 
      WHERE jenis_rombel IN (1, 9, 16, 51)
      LIMIT 10
    `;
    console.log(JSON.stringify(kelasSample, null, 2));

    console.log('\n=== SAMPLE DATA TABEL_ANGGOTAKELAS ===');
    const anggotaSample = await sql`
      SELECT * FROM tabel_anggotakelas LIMIT 5
    `;
    console.log(JSON.stringify(anggotaSample, null, 2));

    console.log('\n=== COUNT SISWA PER KELAS ===');
    const countSiswa = await sql`
      SELECT k.nm_kelas, k.jenis_rombel, COUNT(ak.peserta_didik_id) as jumlah_siswa
      FROM tabel_kelas k
      LEFT JOIN tabel_anggotakelas ak ON k.rombongan_belajar_id = ak.rombongan_belajar_id
      WHERE k.jenis_rombel IN (1, 9, 16, 51)
      GROUP BY k.rombongan_belajar_id, k.nm_kelas, k.jenis_rombel
      LIMIT 10
    `;
    console.log(JSON.stringify(countSiswa, null, 2));

  } catch (error) {
    console.error('Error:', error);
  }
}

checkStructure();
