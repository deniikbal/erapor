import { NextRequest, NextResponse } from 'next/server';
import { getDbClient } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const kelompok_id = searchParams.get('kelompok_id');
    const rombel_id = searchParams.get('rombel_id'); // Untuk fetch siswa dari kelas reguler
    const semester_id = searchParams.get('semester_id');

    const sql = getDbClient();

    if (kelompok_id) {
       // Mengambil daftar anggota kelompok kokurikuler saat ini
       const result = await sql`
         SELECT 
           ak.anggota_kelompok_id,
           ak.peserta_didik_id,
           s.nm_siswa,
           s.nisn,
           reg.nm_kelas as nama_kelas_reguler
         FROM tabel_anggotaklp_kokurikuler ak
         JOIN tabel_siswa s ON ak.peserta_didik_id = s.peserta_didik_id
         LEFT JOIN (
           SELECT ak_reg.peserta_didik_id, k_reg.nm_kelas, ak_reg.semester_id
           FROM tabel_anggotakelas ak_reg
           JOIN tabel_kelas k_reg ON ak_reg.rombongan_belajar_id = k_reg.rombongan_belajar_id
           WHERE k_reg.jenis_rombel = 1
         ) reg ON ak.peserta_didik_id = reg.peserta_didik_id AND ak.semester_id = reg.semester_id
         WHERE ak.kelompok_id = ${kelompok_id}
         ORDER BY s.nm_siswa ASC
       `;
       return NextResponse.json({ anggota: result }, { status: 200 });
    }

    if (rombel_id && semester_id) {
       // Mengambil daftar siswa dari kelas reguler
       const result = await sql`
         SELECT 
           s.peserta_didik_id,
           s.nm_siswa,
           s.nisn,
           k.nm_kelas
         FROM tabel_siswa s
         JOIN tabel_anggotakelas ak ON s.peserta_didik_id = ak.peserta_didik_id
         JOIN tabel_kelas k ON ak.rombongan_belajar_id = k.rombongan_belajar_id
         WHERE ak.rombongan_belajar_id = ${rombel_id}
           AND ak.semester_id = ${semester_id}
         ORDER BY s.nm_siswa ASC
       `;
       return NextResponse.json({ siswa: result }, { status: 200 });
    }

    return NextResponse.json({ error: 'Parameter tidak lengkap' }, { status: 400 });
  } catch (error: any) {
    console.error('Error fetching anggota kokurikuler:', error);
    return NextResponse.json(
      { error: `Gagal mengambil data: ${error.message}` },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { kelompok_id, peserta_didik_ids, semester_id, fase } = await request.json();

    if (!kelompok_id || !peserta_didik_ids || !semester_id || !fase) {
      return NextResponse.json(
        { error: 'Field kelompok_id, peserta_didik_ids, semester_id, dan fase wajib diisi' },
        { status: 400 }
      );
    }

    const sql = getDbClient();
    const ids = Array.isArray(peserta_didik_ids) ? peserta_didik_ids : [peserta_didik_ids];

    const results = [];
    for (const pd_id of ids) {
       // Cek apakah sudah ada
       const existing = await sql`
         SELECT anggota_kelompok_id 
         FROM tabel_anggotaklp_kokurikuler 
         WHERE kelompok_id = ${kelompok_id} AND peserta_didik_id = ${pd_id}
       `;

       if (existing.length === 0) {
          const res = await sql`
            INSERT INTO tabel_anggotaklp_kokurikuler (
              anggota_kelompok_id,
              peserta_didik_id,
              kelompok_id,
              semester_id,
              fase
            )
            VALUES (
              gen_random_uuid(),
              ${pd_id},
              ${kelompok_id},
              ${semester_id},
              ${fase}
            )
            RETURNING *
          `;
          results.push(res[0]);
       }
    }

    return NextResponse.json({ message: `${results.length} anggota berhasil ditambahkan`, data: results }, { status: 201 });
  } catch (error: any) {
    console.error('Error adding anggota kokurikuler:', error);
    return NextResponse.json(
      { error: `Gagal menambah anggota: ${error.message}` },
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
       await sql`
         DELETE FROM tabel_anggotaklp_kokurikuler
         WHERE kelompok_id = ${kelompok_id}
       `;
       return NextResponse.json({ message: 'Semua anggota berhasil dihapus' }, { status: 200 });
    }

    if (!id) {
      return NextResponse.json(
        { error: 'ID anggota harus disertakan' },
        { status: 400 }
      );
    }

    await sql`
      DELETE FROM tabel_anggotaklp_kokurikuler
      WHERE anggota_kelompok_id = ${id}
    `;

    return NextResponse.json({ message: 'Anggota berhasil dihapus' }, { status: 200 });
  } catch (error: any) {
    console.error('Error deleting anggota kokurikuler:', error);
    return NextResponse.json(
      { error: `Gagal menghapus anggota: ${error.message}` },
      { status: 500 }
    );
  }
}
