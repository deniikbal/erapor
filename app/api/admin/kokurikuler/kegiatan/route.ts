import { NextRequest, NextResponse } from 'next/server';
import { getDbClient } from '@/lib/db';

// GET all activities with filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id_tema = searchParams.get('id_tema');
    const fase = searchParams.get('fase');

    const sql = getDbClient();

    let activities;
    if (id_tema && fase) {
      activities = await sql`
        SELECT k.*, 
          (SELECT json_agg(json_build_object(
             'id_target', t.id_target, 
             'nama_subdimensi', s.nama_subdimensi,
             'nama_dimensi', d.nama_dimensi
           ))
           FROM targetcapaian_kokurikuler t
           LEFT JOIN dpl_subdimensi s ON t.id_subdimensi = s.id_subdimensi
           LEFT JOIN profil_lulusan d ON s.id_dimensi = d.id_dimensi
           WHERE t.id_kegiatan = k.id_kegiatan) as targets
        FROM kegiatan_kokurikuler k
        WHERE k.id_tema = ${id_tema} AND k.fase = ${fase}
      `;
    } else if (id_tema) {
      activities = await sql`
        SELECT k.*, 
          (SELECT json_agg(json_build_object(
             'id_target', t.id_target, 
             'nama_subdimensi', s.nama_subdimensi,
             'nama_dimensi', d.nama_dimensi
           ))
           FROM targetcapaian_kokurikuler t
           LEFT JOIN dpl_subdimensi s ON t.id_subdimensi = s.id_subdimensi
           LEFT JOIN profil_lulusan d ON s.id_dimensi = d.id_dimensi
           WHERE t.id_kegiatan = k.id_kegiatan) as targets
        FROM kegiatan_kokurikuler k
        WHERE k.id_tema = ${id_tema}
      `;
    } else {
      activities = await sql`
        SELECT k.*, 
          (SELECT json_agg(json_build_object(
             'id_target', t.id_target, 
             'nama_subdimensi', s.nama_subdimensi,
             'nama_dimensi', d.nama_dimensi
           ))
           FROM targetcapaian_kokurikuler t
           LEFT JOIN dpl_subdimensi s ON t.id_subdimensi = s.id_subdimensi
           LEFT JOIN profil_lulusan d ON s.id_dimensi = d.id_dimensi
           WHERE t.id_kegiatan = k.id_kegiatan) as targets
        FROM kegiatan_kokurikuler k
      `;
    }

    return NextResponse.json({ kegiatan: activities }, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching kegiatan_kokurikuler:', error);
    return NextResponse.json(
      { error: `Gagal mengambil data kegiatan: ${error.message}` },
      { status: 500 }
    );
  }
}

// POST new activity
export async function POST(request: NextRequest) {
  try {
    const { id_tema, fase, nama_kegiatan, tujuan_akhir, deskripsi_kegiatan } = await request.json();

    if (!id_tema || !fase || !nama_kegiatan) {
      return NextResponse.json(
        { error: 'Tema, Fase, dan Nama Kegiatan harus diisi' },
        { status: 400 }
      );
    }

    const sql = getDbClient();
    const result = await sql`
      INSERT INTO kegiatan_kokurikuler (id_kegiatan, id_tema, fase, nama_kegiatan, tujuan_akhir, deskripsi_kegiatan)
      VALUES (gen_random_uuid(), ${id_tema}, ${fase}, ${nama_kegiatan}, ${tujuan_akhir}, ${deskripsi_kegiatan})
      RETURNING *
    `;

    return NextResponse.json({ kegiatan: result[0] }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating kegiatan_kokurikuler:', error);
    return NextResponse.json(
      { error: `Gagal menambah kegiatan: ${error.message}` },
      { status: 500 }
    );
  }
}

// PATCH update activity
export async function PATCH(request: NextRequest) {
  try {
    const { id_kegiatan, fase, nama_kegiatan, tujuan_akhir, deskripsi_kegiatan } = await request.json();

    if (!id_kegiatan) {
      return NextResponse.json(
        { error: 'ID kegiatan harus disertakan' },
        { status: 400 }
      );
    }

    const sql = getDbClient();
    const result = await sql`
      UPDATE kegiatan_kokurikuler
      SET 
        fase = COALESCE(${fase}, fase),
        nama_kegiatan = COALESCE(${nama_kegiatan}, nama_kegiatan),
        tujuan_akhir = COALESCE(${tujuan_akhir}, tujuan_akhir),
        deskripsi_kegiatan = COALESCE(${deskripsi_kegiatan}, deskripsi_kegiatan)
      WHERE id_kegiatan = ${id_kegiatan}
      RETURNING *
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Data tidak ditemukan' },
        { status: 404 }
      );
    }

    return NextResponse.json({ kegiatan: result[0] }, { status: 200 });
  } catch (error: any) {
    console.error('Error updating kegiatan_kokurikuler:', error);
    return NextResponse.json(
      { error: `Gagal update kegiatan: ${error.message}` },
      { status: 500 }
    );
  }
}

// DELETE activity
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'ID kegiatan harus disertakan' },
        { status: 400 }
      );
    }

    const sql = getDbClient();
    const result = await sql`
      DELETE FROM kegiatan_kokurikuler
      WHERE id_kegiatan = ${id}
      RETURNING id_kegiatan
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Data tidak ditemukan' },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: 'Kegiatan berhasil dihapus' }, { status: 200 });
  } catch (error: any) {
    console.error('Error deleting kegiatan_kokurikuler:', error);
    return NextResponse.json(
      { error: `Gagal menghapus kegiatan: ${error.message}` },
      { status: 500 }
    );
  }
}
