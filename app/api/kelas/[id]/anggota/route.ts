import { NextRequest, NextResponse } from 'next/server';
import { getDbClient } from '@/lib/db';

export async function GET(
  request: NextRequest,
  context: any
) {
  try {
    const sql = getDbClient();
    
    // Process params accurately for Next.js 15+
    const routeParams = context.params instanceof Promise ? await context.params : context.params;
    const rombel_id = routeParams?.id;
    
    if (!rombel_id) {
      return NextResponse.json(
        { error: 'rombongan_belajar_id is required' },
        { status: 400 }
      );
    }

    // Get students in this class
    const result = await sql`
      SELECT 
        s.peserta_didik_id,
        s.nis,
        s.nisn,
        s.nm_siswa,
        k.nm_kelas,
        k.tingkat_pendidikan_id,
        ak.anggota_rombel_id
      FROM tabel_siswa s
      JOIN tabel_anggotakelas ak ON s.peserta_didik_id = ak.peserta_didik_id
      JOIN tabel_kelas k ON ak.rombongan_belajar_id = k.rombongan_belajar_id
      WHERE ak.rombongan_belajar_id = ${rombel_id}
      ORDER BY s.nm_siswa ASC
    `;

    return NextResponse.json({ 
      siswa: result,
      debug: {
        rombongan_belajar_id: rombel_id,
        total: result.length
      }
    }, { status: 200 });
  } catch (error) {
    console.error('Get anggota kelas error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat mengambil data anggota kelas', details: String(error) },
      { status: 500 }
    );
  }
}
