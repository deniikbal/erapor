import { NextRequest, NextResponse } from 'next/server';
import { getDbClient } from '@/lib/db';

// GET all themes
export async function GET() {
  try {
    const sql = getDbClient();
    // Only use columns visible in the user's screenshot to avoid "column does not exist" errors
    const result = await sql`
      SELECT id_tema, nama_tema, urut, status 
      FROM tema_kokurikuler 
      ORDER BY urut ASC
    `;
    return NextResponse.json({ tema: result }, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching tema_kokurikuler:', error);
    return NextResponse.json(
      { error: `Gagal mengambil data: ${error.message || 'Unknown error'}` },
      { status: 500 }
    );
  }
}

// POST new theme
export async function POST(request: NextRequest) {
  try {
    const { nama_tema, status, urut } = await request.json();

    if (!nama_tema) {
      return NextResponse.json(
        { error: 'Nama tema harus diisi' },
        { status: 400 }
      );
    }

    const sql = getDbClient();
    
    const result = await sql`
      INSERT INTO tema_kokurikuler (id_tema, nama_tema, status, urut)
      VALUES (gen_random_uuid(), ${nama_tema}, ${status || '1'}, ${urut || 1})
      RETURNING *
    `;

    return NextResponse.json({ tema: result[0] }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating tema_kokurikuler:', error);
    return NextResponse.json(
      { error: `Gagal menambah data: ${error.message}` },
      { status: 500 }
    );
  }
}

// PATCH update theme
export async function PATCH(request: NextRequest) {
  try {
    const { id_tema, nama_tema, status, urut } = await request.json();

    if (!id_tema) {
      return NextResponse.json(
        { error: 'ID tema harus disertakan' },
        { status: 400 }
      );
    }

    const sql = getDbClient();
    
    const result = await sql`
      UPDATE tema_kokurikuler
      SET 
        nama_tema = COALESCE(${nama_tema}, nama_tema),
        status = COALESCE(${status}, status),
        urut = COALESCE(${urut}, urut)
      WHERE id_tema = ${id_tema}
      RETURNING *
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Data tidak ditemukan' },
        { status: 404 }
      );
    }

    return NextResponse.json({ tema: result[0] }, { status: 200 });
  } catch (error: any) {
    console.error('Error updating tema_kokurikuler:', error);
    return NextResponse.json(
      { error: `Gagal update data: ${error.message}` },
      { status: 500 }
    );
  }
}

// DELETE theme
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'ID tema harus disertakan' },
        { status: 400 }
      );
    }

    const sql = getDbClient();
    const result = await sql`
      DELETE FROM tema_kokurikuler
      WHERE id_tema = ${id}
      RETURNING id_tema
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Data tidak ditemukan' },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: 'Data berhasil dihapus', id: result[0].id_tema }, { status: 200 });
  } catch (error: any) {
    console.error('Error deleting tema_kokurikuler:', error);
    return NextResponse.json(
      { error: `Gagal menghapus data: ${error.message}` },
      { status: 500 }
    );
  }
}
