import { NextResponse } from 'next/server';
import { getDbClient } from '@/lib/db';

export async function GET() {
  try {
    const sql = getDbClient();

    // Check tabel_kelas structure
    const kelasStructure = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'tabel_kelas'
      ORDER BY ordinal_position
    `;

    // Check tabel_anggotakelas structure
    const anggotaStructure = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'tabel_anggotakelas'
      ORDER BY ordinal_position
    `;

    // Check if tabel_kelas_ekskul exists
    const ekskulCheck = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND (table_name LIKE '%kelas%' OR table_name LIKE '%ekskul%')
    `;

    // Sample data from tabel_kelas
    const kelasSample = await sql`
      SELECT rombongan_belajar_id, nm_kelas, tingkat_pendidikan_id, jenis_rombel, ptk_id, semester_id
      FROM tabel_kelas 
      WHERE jenis_rombel IN (1, 9, 16, 51)
      LIMIT 10
    `;

    // Sample data from tabel_anggotakelas
    const anggotaSample = await sql`
      SELECT * FROM tabel_anggotakelas LIMIT 5
    `;

    // Count siswa per kelas with PTK info
    const countSiswa = await sql`
      SELECT 
        k.rombongan_belajar_id,
        k.nm_kelas, 
        k.jenis_rombel,
        k.tingkat_pendidikan_id,
        k.ptk_id,
        p.nama as nama_wali_kelas,
        COUNT(ak.peserta_didik_id) as jumlah_siswa
      FROM tabel_kelas k
      LEFT JOIN tabel_anggotakelas ak ON k.rombongan_belajar_id = ak.rombongan_belajar_id
      LEFT JOIN tabel_ptk p ON k.ptk_id = p.ptk_id
      WHERE k.jenis_rombel IN (1, 9, 16, 51)
      GROUP BY k.rombongan_belajar_id, k.nm_kelas, k.jenis_rombel, k.tingkat_pendidikan_id, k.ptk_id, p.nama
      LIMIT 10
    `;

    return NextResponse.json({
      kelasStructure,
      anggotaStructure,
      ekskulCheck,
      kelasSample,
      anggotaSample,
      countSiswa,
    });
  } catch (error) {
    console.error('Check kelas error:', error);
    return NextResponse.json(
      { error: 'Error checking database structure', details: String(error) },
      { status: 500 }
    );
  }
}
