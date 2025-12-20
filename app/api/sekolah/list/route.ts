import { NextResponse } from 'next/server';
import { getDbClient } from '@/lib/db';

export async function GET() {
  try {
    const sql = getDbClient();

    const sekolah = await sql`
      SELECT sekolah_id, nama, npsn 
      FROM public.tabel_sekolah
      ORDER BY nama
    `;

    return NextResponse.json({ sekolah }, { status: 200 });
  } catch (error) {
    console.error('Get sekolah list error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat mengambil data sekolah' },
      { status: 500 }
    );
  }
}
