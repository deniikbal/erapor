import { NextRequest, NextResponse } from 'next/server';
import { getDbClient, PTK } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const sql = getDbClient();
    
    const result = await sql`
      SELECT 
        p.ptk_id,
        p.nama,
        p.nip,
        p.nuptk,
        p.jenis_kelamin,
        p.jenis_ptk_id,
        pp.gelar_depan,
        pp.gelar_belakang,
        pp.ptk_pelengkap_id
      FROM tabel_ptk p
      LEFT JOIN tabel_ptk_pelengkap pp ON p.ptk_id = pp.ptk_id
      WHERE p.soft_delete = 0
      ORDER BY p.nama ASC
    `;

    const guru = result as PTK[];
    return NextResponse.json({ guru }, { status: 200 });
  } catch (error) {
    console.error('Get guru error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat mengambil data guru' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { ptk_id, gelar_depan, gelar_belakang } = await request.json();

    if (!ptk_id) {
      return NextResponse.json(
        { error: 'PTK ID harus diisi' },
        { status: 400 }
      );
    }

    const sql = getDbClient();
    
    // Check if ptk_pelengkap exists
    const checkExisting = await sql`
      SELECT ptk_pelengkap_id FROM tabel_ptk_pelengkap
      WHERE ptk_id = ${ptk_id}
      LIMIT 1
    `;

    let result;
    
    if (checkExisting.length > 0) {
      // Update existing record
      result = await sql`
        UPDATE tabel_ptk_pelengkap
        SET 
          gelar_depan = ${gelar_depan || ''},
          gelar_belakang = ${gelar_belakang || ''}
        WHERE ptk_id = ${ptk_id}
        RETURNING *
      `;
    } else {
      // Insert new record
      result = await sql`
        INSERT INTO tabel_ptk_pelengkap (ptk_pelengkap_id, ptk_id, gelar_depan, gelar_belakang)
        VALUES (gen_random_uuid(), ${ptk_id}, ${gelar_depan || ''}, ${gelar_belakang || ''})
        RETURNING *
      `;
    }

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Gagal mengupdate data gelar' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      message: 'Data gelar berhasil diupdate',
      data: result[0]
    }, { status: 200 });
  } catch (error) {
    console.error('Update gelar error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat mengupdate data gelar' },
      { status: 500 }
    );
  }
}
