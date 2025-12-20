import { NextRequest, NextResponse } from 'next/server';
import { getDbClient, Siswa } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    // Get ptk_id from query params
    const { searchParams } = new URL(request.url);
    const ptk_id = searchParams.get('ptk_id');

    if (!ptk_id) {
      return NextResponse.json(
        { error: 'PTK ID harus diisi' },
        { status: 400 }
      );
    }

    const sql = getDbClient();
    
    // Get siswa dari kelas yang diwali kelasi oleh guru ini
    const result = await sql`
      SELECT DISTINCT ON (s.peserta_didik_id)
        s.peserta_didik_id,
        s.nis,
        s.nisn,
        s.nm_siswa,
        s.tempat_lahir,
        s.tanggal_lahir,
        s.jenis_kelamin,
        s.agama,
        s.alamat_siswa,
        s.telepon_siswa,
        s.diterima_tanggal,
        s.nm_ayah,
        s.nm_ibu,
        s.pekerjaan_ayah,
        s.pekerjaan_ibu,
        s.nm_wali,
        s.pekerjaan_wali,
        sp.pelengkap_siswa_id,
        sp.status_dalam_kel,
        sp.anak_ke,
        sp.sekolah_asal,
        sp.diterima_kelas,
        sp.alamat_ortu,
        sp.telepon_ortu,
        k.nm_kelas,
        k.tingkat_pendidikan_id,
        k.jenis_rombel
      FROM tabel_siswa s
      LEFT JOIN tabel_siswa_pelengkap sp ON s.peserta_didik_id = sp.peserta_didik_id
      INNER JOIN tabel_anggotakelas ak ON s.peserta_didik_id = ak.peserta_didik_id
      INNER JOIN tabel_kelas k ON ak.rombongan_belajar_id = k.rombongan_belajar_id 
        AND k.jenis_rombel IN (1, 9)
        AND k.ptk_id = ${ptk_id}
      ORDER BY s.peserta_didik_id, k.nm_kelas ASC, s.nm_siswa ASC
    `;

    // Natural sort function
    const naturalSort = (a: string, b: string): number => {
      return a.localeCompare(b, 'id', { numeric: true, sensitivity: 'base' });
    };

    // Sort hasil query
    const sortedSiswa = (result as Siswa[]).sort((a, b) => {
      if (!a.nm_kelas && !b.nm_kelas) return naturalSort(a.nm_siswa, b.nm_siswa);
      if (!a.nm_kelas) return 1;
      if (!b.nm_kelas) return -1;
      
      const kelasCompare = naturalSort(a.nm_kelas, b.nm_kelas);
      if (kelasCompare !== 0) return kelasCompare;
      
      return naturalSort(a.nm_siswa, b.nm_siswa);
    });

    return NextResponse.json({ siswa: sortedSiswa }, { status: 200 });
  } catch (error) {
    console.error('Get siswa by wali kelas error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat mengambil data siswa' },
      { status: 500 }
    );
  }
}
