import { NextRequest, NextResponse } from 'next/server';
import { getDbClient } from '@/lib/db';

export async function DELETE(
  request: NextRequest,
  context: any
) {
  try {
    const sql = getDbClient();
    
    // Support both sync and async params
    const params = context.params instanceof Promise ? await context.params : context.params;
    const anggota_rombel_id = params?.anggotaId;

    console.log('DELETE anggota called!');
    console.log('anggota_rombel_id:', anggota_rombel_id);
    
    if (!anggota_rombel_id) {
      return NextResponse.json(
        { error: 'anggota_rombel_id is required' },
        { status: 400 }
      );
    }

    // Delete from tabel_anggotakelas
    const result = await sql`
      DELETE FROM tabel_anggotakelas
      WHERE anggota_rombel_id = ${anggota_rombel_id}
    `;

    console.log('Delete result:', result);

    return NextResponse.json({ 
      message: 'Siswa berhasil dihapus dari anggota kelas'
    }, { status: 200 });
  } catch (error) {
    console.error('Delete anggota kelas error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat menghapus anggota kelas', details: String(error) },
      { status: 500 }
    );
  }
}
