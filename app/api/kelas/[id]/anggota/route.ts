import { NextRequest, NextResponse } from 'next/server';
import { getDbClient } from '@/lib/db';

export async function GET(
  request: NextRequest,
  context: any
) {
  try {
    const sql = getDbClient();
    
    // Support both sync and async params
    const params = context.params instanceof Promise ? await context.params : context.params;
    const rombongan_belajar_id = params?.id;

    console.log('API anggota called!');
    console.log('Context:', context);
    console.log('Params:', params);
    console.log('Fetching anggota for rombongan_belajar_id:', rombongan_belajar_id);
    
    if (!rombongan_belajar_id) {
      return NextResponse.json(
        { error: 'rombongan_belajar_id is required' },
        { status: 400 }
      );
    }

    // Get students in this class
    const result = await sql`
      SELECT 
        s.peserta_didik_id,
        s.nisn,
        s.nm_siswa,
        k.nm_kelas,
        ak.anggota_rombel_id
      FROM tabel_siswa s
      JOIN tabel_anggotakelas ak ON s.peserta_didik_id = ak.peserta_didik_id
      JOIN tabel_kelas k ON ak.rombongan_belajar_id = k.rombongan_belajar_id
      WHERE ak.rombongan_belajar_id = ${rombongan_belajar_id}
      ORDER BY s.nm_siswa ASC
    `;

    console.log(`Found ${result.length} siswa in this class`);
    console.log('Sample siswa:', result.slice(0, 2));

    return NextResponse.json({ 
      siswa: result,
      debug: {
        rombongan_belajar_id,
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
