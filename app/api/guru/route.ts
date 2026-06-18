import { NextRequest, NextResponse } from 'next/server';
import { getDbClient, PTK } from '@/lib/db';
import { retryQuery } from '@/lib/dbRetryHelper';

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
    const { ptk_id, nama, gelar_depan, gelar_belakang } = await request.json();

    if (!ptk_id) {
      return NextResponse.json(
        { error: 'PTK ID harus diisi' },
        { status: 400 }
      );
    }

    const trimmedNama = typeof nama === 'string' ? nama.trim() : undefined;
    if (trimmedNama !== undefined && trimmedNama.length === 0) {
      return NextResponse.json(
        { error: 'Nama guru tidak boleh kosong' },
        { status: 400 }
      );
    }

    const sql = getDbClient();

    // 1. Update nama di tabel_ptk (jika dikirim)
    if (trimmedNama !== undefined) {
      const updatedPtk = await retryQuery(() => sql`
        UPDATE tabel_ptk
        SET nama = ${trimmedNama}
        WHERE ptk_id = ${ptk_id} AND soft_delete = 0
        RETURNING ptk_id, nama
      `);

      if (updatedPtk.length === 0) {
        return NextResponse.json(
          { error: 'Data guru tidak ditemukan' },
          { status: 404 }
        );
      }
    }

    // 2. Update/insert gelar di tabel_ptk_pelengkap (jika ada yang dikirim)
    let pelengkapResult: any[] = [];
    if (
      typeof gelar_depan === 'string' ||
      typeof gelar_belakang === 'string'
    ) {
      const checkExisting = await retryQuery(() => sql`
        SELECT ptk_pelengkap_id FROM tabel_ptk_pelengkap
        WHERE ptk_id = ${ptk_id}
        LIMIT 1
      `);

      if (checkExisting.length > 0) {
        pelengkapResult = await retryQuery(() => sql`
          UPDATE tabel_ptk_pelengkap
          SET
            gelar_depan = ${gelar_depan ?? ''},
            gelar_belakang = ${gelar_belakang ?? ''}
          WHERE ptk_id = ${ptk_id}
          RETURNING *
        `);
      } else {
        pelengkapResult = await retryQuery(() => sql`
          INSERT INTO tabel_ptk_pelengkap (ptk_pelengkap_id, ptk_id, gelar_depan, gelar_belakang)
          VALUES (gen_random_uuid(), ${ptk_id}, ${gelar_depan ?? ''}, ${gelar_belakang ?? ''})
          RETURNING *
        `);
      }
    }

    return NextResponse.json({
      message: 'Data guru berhasil diupdate',
      data: {
        ptk_id,
        nama: trimmedNama,
        pelengkap: pelengkapResult[0] ?? null,
      },
    }, { status: 200 });
  } catch (error) {
    console.error('Update guru error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat mengupdate data guru' },
      { status: 500 }
    );
  }
}
