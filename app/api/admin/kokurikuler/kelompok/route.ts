import { NextRequest, NextResponse } from 'next/server';
import { getDbClient } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const semester_id = searchParams.get('semester_id');

    if (!semester_id) {
      return NextResponse.json({ error: 'semester_id wajib diisi' }, { status: 400 });
    }

    const sql = getDbClient();

    // Menggunakan nama kolom yang benar sesuai database: kelompok_id dan nm_kelompok
    const result = await sql`
      SELECT 
        k.kelompok_id,
        k.nm_kelompok,
        k.tingkat_pendidikan_id,
        k.fase,
        k.ptk_id,
        k.semester_id,
        p.nama as nama_pembimbing
      FROM tabel_klp_kokurikuler k
      LEFT JOIN tabel_ptk p ON k.ptk_id = p.ptk_id
      WHERE k.semester_id = ${semester_id}
      ORDER BY k.nm_kelompok ASC
    `;

    return NextResponse.json({ kelompok: result }, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching tabel_klp_kokurikuler:', error);
    return NextResponse.json(
      { error: `Gagal mengambil data kelompok: ${error.message}` },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { nm_kelompok, tingkat_pendidikan_id, fase, ptk_id, semester_id } = await request.json();

    if (!nm_kelompok || !tingkat_pendidikan_id || !fase || !ptk_id || !semester_id) {
      return NextResponse.json(
        { error: 'Semua field wajib diisi' },
        { status: 400 }
      );
    }

    const sql = getDbClient();

    // Ambil sekolah_id dari entri yang sudah ada jika tidak dikirim (untuk konsistensi)
    let sekolah_id = null;
    const existingEntry = await sql`SELECT sekolah_id FROM tabel_klp_kokurikuler LIMIT 1`;
    if (existingEntry.length > 0) {
      sekolah_id = existingEntry[0].sekolah_id;
    }

    const result = await sql`
      INSERT INTO tabel_klp_kokurikuler (
        kelompok_id,
        nm_kelompok, 
        tingkat_pendidikan_id, 
        fase, 
        ptk_id, 
        semester_id, 
        sekolah_id,
        status
      )
      VALUES (
        gen_random_uuid(),
        ${nm_kelompok}, 
        ${tingkat_pendidikan_id}, 
        ${fase}, 
        ${ptk_id}, 
        ${semester_id}, 
        ${sekolah_id},
        1
      )
      RETURNING *
    `;

    return NextResponse.json({ kelompok: result[0] }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating tabel_klp_kokurikuler:', error);
    return NextResponse.json(
      { error: `Gagal menambah kelompok: ${error.message}` },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'ID kelompok harus disertakan' },
        { status: 400 }
      );
    }

    const sql = getDbClient();
    const result = await sql`
      DELETE FROM tabel_klp_kokurikuler
      WHERE kelompok_id = ${id}
      RETURNING kelompok_id
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Data tidak ditemukan' },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: 'Kelompok berhasil dihapus' }, { status: 200 });
  } catch (error: any) {
    console.error('Error deleting tabel_klp_kokurikuler:', error);
    return NextResponse.json(
      { error: `Gagal menghapus kelompok: ${error.message}` },
      { status: 500 }
    );
  }
}
