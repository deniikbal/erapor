import { NextRequest, NextResponse } from 'next/server';
import { getDbClient } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const kelompok_id = searchParams.get('kelompok_id');

    if (!kelompok_id) {
      return NextResponse.json({ error: 'kelompok_id wajib diisi' }, { status: 400 });
    }

    const sql = getDbClient();

    // Mengambil kegiatan yang sudah ditugaskan ke kelompok beserta target capaiannya
    const result = await sql`
      SELECT 
        pk.idklp_kokurikuler,
        pk.kelompok_id,
        pk.id_kegiatan,
        pk.fase,
        k.nama_kegiatan,
        k.tujuan_akhir,
        t.nama_tema as tema,
        (SELECT json_agg(json_build_object(
           'id_target', tc.id_target, 
           'nama_subdimensi', s.nama_subdimensi,
           'nama_dimensi', d.nama_dimensi
         ))
         FROM targetcapaian_kokurikuler tc
         JOIN dpl_subdimensi s ON tc.id_subdimensi = s.id_subdimensi
         JOIN profil_dimensi d ON s.id_dimensi = d.id_dimensi
         WHERE tc.id_kegiatan = k.id_kegiatan) as targets
      FROM tabel_kokurikuler_perklp pk
      JOIN kegiatan_kokurikuler k ON pk.id_kegiatan = k.id_kegiatan
      LEFT JOIN tema_kokurikuler t ON k.id_tema = t.id_tema
      WHERE pk.kelompok_id = ${kelompok_id}
      ORDER BY k.nama_kegiatan ASC
    `;

    return NextResponse.json({ kegiatan: result }, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching tabel_kokurikuler_perklp:', error);
    return NextResponse.json(
      { error: `Gagal mengambil data kegiatan kelompok: ${error.message}` },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { kelompok_id, id_kegiatan, semester_id, fase } = await request.json();

    if (!kelompok_id || !id_kegiatan || !semester_id || !fase) {
      return NextResponse.json(
        { error: 'Field kelompok_id, id_kegiatan, semester_id, dan fase wajib diisi' },
        { status: 400 }
      );
    }

    const sql = getDbClient();

    // Cek apakah sudah ada pemetaan yang sama
    const existing = await sql`
      SELECT idklp_kokurikuler 
      FROM tabel_kokurikuler_perklp 
      WHERE kelompok_id = ${kelompok_id} AND id_kegiatan = ${id_kegiatan}
    `;

    if (existing.length > 0) {
      return NextResponse.json({ error: 'Kegiatan ini sudah ditambahkan ke kelompok' }, { status: 400 });
    }

    const result = await sql`
      INSERT INTO tabel_kokurikuler_perklp (
        idklp_kokurikuler,
        kelompok_id, 
        id_kegiatan, 
        semester_id, 
        fase, 
        status
      )
      VALUES (
        gen_random_uuid(),
        ${kelompok_id}, 
        ${id_kegiatan}, 
        ${semester_id}, 
        ${fase}, 
        1
      )
      RETURNING *
    `;

    return NextResponse.json({ data: result[0] }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating tabel_kokurikuler_perklp:', error);
    return NextResponse.json(
      { error: `Gagal menambah kegiatan ke kelompok: ${error.message}` },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const kelompok_id = searchParams.get('kelompok_id');

    const sql = getDbClient();

    if (kelompok_id) {
       // Hapus SEMUA kegiatan untuk kelompok tersebut
       await sql`
         DELETE FROM tabel_kokurikuler_perklp
         WHERE kelompok_id = ${kelompok_id}
       `;
       return NextResponse.json({ message: 'Semua kegiatan berhasil dihapus dari kelompok' }, { status: 200 });
    }

    if (!id) {
      return NextResponse.json(
        { error: 'ID pemetaan harus disertakan' },
        { status: 400 }
      );
    }

    const result = await sql`
      DELETE FROM tabel_kokurikuler_perklp
      WHERE idklp_kokurikuler = ${id}
      RETURNING idklp_kokurikuler
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Data tidak ditemukan' },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: 'Kegiatan berhasil dihapus dari kelompok' }, { status: 200 });
  } catch (error: any) {
    console.error('Error deleting tabel_kokurikuler_perklp:', error);
    return NextResponse.json(
      { error: `Gagal menghapus kegiatan dari kelompok: ${error.message}` },
      { status: 500 }
    );
  }
}
