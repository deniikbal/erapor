import { NextRequest, NextResponse } from 'next/server';
import { getDbClient, Sekolah } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const sql = getDbClient();
    
    const result = await sql`
      SELECT * FROM tabel_sekolah
      LIMIT 1
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Data sekolah tidak ditemukan' },
        { status: 404 }
      );
    }

    const sekolah = result[0] as Sekolah;
    return NextResponse.json({ sekolah }, { status: 200 });
  } catch (error) {
    console.error('Get sekolah error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat mengambil data sekolah' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { sekolah_id, nm_kepsek, nip_kepsek } = await request.json();

    if (!sekolah_id || !nm_kepsek || !nip_kepsek) {
      return NextResponse.json(
        { error: 'Data tidak lengkap. Nama dan NIP kepala sekolah harus diisi' },
        { status: 400 }
      );
    }

    const sql = getDbClient();
    
    const result = await sql`
      UPDATE tabel_sekolah
      SET nm_kepsek = ${nm_kepsek}, nip_kepsek = ${nip_kepsek}
      WHERE sekolah_id = ${sekolah_id}
      RETURNING *
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Data sekolah tidak ditemukan' },
        { status: 404 }
      );
    }

    const sekolah = result[0] as Sekolah;
    return NextResponse.json({ 
      message: 'Data kepala sekolah berhasil diupdate',
      sekolah 
    }, { status: 200 });
  } catch (error) {
    console.error('Update kepala sekolah error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat mengupdate data kepala sekolah' },
      { status: 500 }
    );
  }
}
