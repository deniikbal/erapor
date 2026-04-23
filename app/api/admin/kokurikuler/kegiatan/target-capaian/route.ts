import { NextRequest, NextResponse } from 'next/server';
import { getDbClient } from '@/lib/db';

// GET target capaian per kegiatan
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id_kegiatan = searchParams.get('id_kegiatan');

    if (!id_kegiatan) {
      return NextResponse.json({ error: 'ID kegiatan diperlukan' }, { status: 400 });
    }

    const sql = getDbClient();
    const result = await sql`
      SELECT 
        target.*,
        sub.nama_subdimensi,
        dim.nama_dimensi
      FROM targetcapaian_kokurikuler target
      LEFT JOIN dpl_subdimensi sub ON target.id_subdimensi = sub.id_subdimensi
      LEFT JOIN profil_lulusan dim ON sub.id_dimensi = dim.id_dimensi
      WHERE target.id_kegiatan = ${id_kegiatan}
      ORDER BY dim.urut ASC NULLS LAST, sub.urut ASC NULLS LAST
    `;
    
    return NextResponse.json({ targets: result }, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching target capaian:', error);
    return NextResponse.json(
      { error: `Gagal mengambil data: ${error.message}` },
      { status: 500 }
    );
  }
}

// POST add target capaian
export async function POST(request: NextRequest) {
  try {
    const { id_kegiatan, id_subdimensi, fase, jenjang } = await request.json();

    if (!id_kegiatan || !id_subdimensi) {
      return NextResponse.json({ error: 'ID kegiatan dan subdimensi diperlukan' }, { status: 400 });
    }

    const sql = getDbClient();
    
    // Cek apakah sudah ada
    const existing = await sql`
      SELECT id_target FROM targetcapaian_kokurikuler 
      WHERE id_kegiatan = ${id_kegiatan} AND id_subdimensi = ${id_subdimensi}
    `;

    if (existing.length > 0) {
      return NextResponse.json({ error: 'Target capaian sudah ada' }, { status: 409 });
    }

    const result = await sql`
      INSERT INTO targetcapaian_kokurikuler (
        id_target, id_kegiatan, id_subdimensi, fase, jenjang, status
      )
      VALUES (
        gen_random_uuid(), ${id_kegiatan}, ${id_subdimensi}, ${fase || 'E'}, ${jenjang || 'SMA'}, 1
      )
      RETURNING *
    `;
    
    return NextResponse.json({ target: result[0] }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating target capaian:', error);
    return NextResponse.json(
      { error: `Gagal menambah target: ${error.message}` },
      { status: 500 }
    );
  }
}

// DELETE target capaian
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id_target = searchParams.get('id_target');

    if (!id_target) {
      return NextResponse.json({ error: 'ID target diperlukan' }, { status: 400 });
    }

    const sql = getDbClient();
    await sql`
      DELETE FROM targetcapaian_kokurikuler 
      WHERE id_target = ${id_target}
    `;
    
    return NextResponse.json({ message: 'Target berhasil dihapus' }, { status: 200 });
  } catch (error: any) {
    console.error('Error deleting target capaian:', error);
    return NextResponse.json(
      { error: `Gagal menghapus target: ${error.message}` },
      { status: 500 }
    );
  }
}
