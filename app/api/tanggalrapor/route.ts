import { NextRequest, NextResponse } from 'next/server';
import { getDbClient, TanggalRapor } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const sql = getDbClient();
    
    const result = await sql`
      SELECT *
      FROM tabel_tanggalrapor
      ORDER BY semester_id DESC, tanggal DESC
    `;

    const tanggalRaporList = result as TanggalRapor[];
    return NextResponse.json({ data: tanggalRaporList }, { status: 200 });
  } catch (error) {
    console.error('Get tanggalrapor error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat mengambil data tanggal rapor' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { semester_id, tanggal, semester, tempat_ttd } = await request.json();

    if (!semester_id || !tanggal || !tempat_ttd) {
      return NextResponse.json(
        { error: 'Semester, tanggal, dan tempat harus diisi' },
        { status: 400 }
      );
    }

    const sql = getDbClient();
    
    const result = await sql`
      INSERT INTO tabel_tanggalrapor (tanggal_id, semester_id, tanggal, semester, tempat_ttd)
      VALUES (gen_random_uuid(), ${semester_id}, ${tanggal}, ${semester || null}, ${tempat_ttd})
      RETURNING *
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Gagal menambahkan data tanggal rapor' },
        { status: 500 }
      );
    }

    const tanggalRapor = result[0] as TanggalRapor;
    return NextResponse.json({ 
      message: 'Data tanggal rapor berhasil ditambahkan',
      data: tanggalRapor 
    }, { status: 201 });
  } catch (error) {
    console.error('Create tanggalrapor error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat menambahkan data tanggal rapor' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { tanggal_id, semester_id, tanggal, semester, tempat_ttd } = await request.json();

    if (!tanggal_id || !semester_id || !tanggal || !tempat_ttd) {
      return NextResponse.json(
        { error: 'ID, semester, tanggal, dan tempat harus diisi' },
        { status: 400 }
      );
    }

    const sql = getDbClient();
    
    const result = await sql`
      UPDATE tabel_tanggalrapor
      SET 
        semester_id = ${semester_id},
        tanggal = ${tanggal},
        semester = ${semester || null},
        tempat_ttd = ${tempat_ttd}
      WHERE tanggal_id = ${tanggal_id}
      RETURNING *
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Data tanggal rapor tidak ditemukan' },
        { status: 404 }
      );
    }

    const tanggalRapor = result[0] as TanggalRapor;
    return NextResponse.json({ 
      message: 'Data tanggal rapor berhasil diupdate',
      data: tanggalRapor 
    }, { status: 200 });
  } catch (error) {
    console.error('Update tanggalrapor error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat mengupdate data tanggal rapor' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tanggal_id = searchParams.get('id');

    if (!tanggal_id) {
      return NextResponse.json(
        { error: 'ID tanggal rapor harus diisi' },
        { status: 400 }
      );
    }

    const sql = getDbClient();
    
    const result = await sql`
      DELETE FROM tabel_tanggalrapor
      WHERE tanggal_id = ${tanggal_id}
      RETURNING *
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Data tanggal rapor tidak ditemukan' },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      message: 'Data tanggal rapor berhasil dihapus'
    }, { status: 200 });
  } catch (error) {
    console.error('Delete tanggalrapor error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat menghapus data tanggal rapor' },
      { status: 500 }
    );
  }
}
