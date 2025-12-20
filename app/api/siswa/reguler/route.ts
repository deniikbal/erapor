import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export async function GET(request: NextRequest) {
  try {
    // Query to get all students from regular classes (jenis_rombel 1 and 9)
    // Include data pelengkap (supplementary data) from tabel_siswa_pelengkap
    // Use ROW_NUMBER to get only one class per student (the first one ordered by class name)
    const siswa = await sql`
      WITH ranked_students AS (
        SELECT 
          s.*,
          sp.status_dalam_kel,
          sp.anak_ke,
          sp.sekolah_asal,
          sp.diterima_kelas,
          sp.alamat_ortu,
          sp.telepon_ortu,
          k.nm_kelas,
          k.tingkat_pendidikan_id,
          k.jenis_rombel,
          ROW_NUMBER() OVER (PARTITION BY s.peserta_didik_id ORDER BY k.nm_kelas) as rn
        FROM tabel_siswa s
        LEFT JOIN tabel_siswa_pelengkap sp ON s.peserta_didik_id = sp.peserta_didik_id
        INNER JOIN tabel_anggotakelas ak ON s.peserta_didik_id = ak.peserta_didik_id
        INNER JOIN tabel_kelas k ON ak.rombongan_belajar_id = k.rombongan_belajar_id
        WHERE k.jenis_rombel IN ('1', '9')
      )
      SELECT *
      FROM ranked_students
      WHERE rn = 1
      ORDER BY tingkat_pendidikan_id, nm_kelas, nm_siswa
    `;

    return NextResponse.json({
      success: true,
      siswa: siswa,
      count: siswa.length
    });
  } catch (error: any) {
    console.error('Error fetching regular class students:', error);
    return NextResponse.json(
      { error: 'Gagal mengambil data siswa kelas reguler', details: error.message },
      { status: 500 }
    );
  }
}
