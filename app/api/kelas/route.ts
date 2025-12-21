import { NextRequest, NextResponse } from 'next/server';
import { getDbClient } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const sql = getDbClient();


    // First, check all available jenis_rombel
    const allJenisRombel = await sql`
      SELECT DISTINCT jenis_rombel 
      FROM tabel_kelas 
      ORDER BY jenis_rombel
    `;

    // Get all kelas with wali kelas and student count
    const result = await sql`
      SELECT 
        k.rombongan_belajar_id,
        k.nm_kelas,
        k.jenis_rombel,
        k.tingkat_pendidikan_id,
        k.ptk_id,
        k.semester_id,
        p.nama as nama_wali_kelas,
        COUNT(ak.peserta_didik_id) as jumlah_siswa
      FROM tabel_kelas k
      LEFT JOIN tabel_ptk p ON k.ptk_id = p.ptk_id
      LEFT JOIN tabel_anggotakelas ak ON k.rombongan_belajar_id = ak.rombongan_belajar_id
      WHERE k.jenis_rombel IN (1, 9, 16, 51)
      GROUP BY k.rombongan_belajar_id, k.nm_kelas, k.jenis_rombel, k.tingkat_pendidikan_id, k.ptk_id, k.semester_id, p.nama
      ORDER BY k.nm_kelas
    `;

    // If no result with filter, try without filter
    if (result.length === 0) {
      const allKelas = await sql`
        SELECT 
          k.rombongan_belajar_id,
          k.nm_kelas,
          k.jenis_rombel,
          k.tingkat_pendidikan_id,
          k.ptk_id,
          k.semester_id,
          p.nama as nama_wali_kelas,
          COUNT(ak.peserta_didik_id) as jumlah_siswa
        FROM tabel_kelas k
        LEFT JOIN tabel_ptk p ON k.ptk_id = p.ptk_id
        LEFT JOIN tabel_anggotakelas ak ON k.rombongan_belajar_id = ak.rombongan_belajar_id
        GROUP BY k.rombongan_belajar_id, k.nm_kelas, k.jenis_rombel, k.tingkat_pendidikan_id, k.ptk_id, k.semester_id, p.nama
        ORDER BY k.nm_kelas
      `;
    }

    // Natural sort function
    const naturalSort = (a: any, b: any): number => {
      return a.nm_kelas.localeCompare(b.nm_kelas, 'id', { numeric: true, sensitivity: 'base' });
    };

    const sortedKelas = result.sort(naturalSort);

    return NextResponse.json({
      kelas: sortedKelas,
      debug: {
        total: sortedKelas.length,
        availableJenisRombel: allJenisRombel
      }
    }, { status: 200 });
  } catch (error) {
    console.error('Get kelas error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat mengambil data kelas', details: String(error) },
      { status: 500 }
    );
  }
}
