import { NextRequest, NextResponse } from 'next/server';
import { getDbClient, Siswa } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const sql = getDbClient();
    
    // Query dengan DISTINCT ON untuk ambil 1 kelas per siswa
    // Filter hanya kelas dengan jenis_rombel 1 dan 9
    const result = await sql`
      SELECT DISTINCT ON (s.peserta_didik_id)
        s.peserta_didik_id,
        s.nis,
        s.nisn,
        s.nm_siswa,
        s.tempat_lahir,
        s.tanggal_lahir,
        s.jenis_kelamin,
        s.agama,
        s.alamat_siswa,
        s.telepon_siswa,
        s.diterima_tanggal,
        s.nm_ayah,
        s.nm_ibu,
        s.pekerjaan_ayah,
        s.pekerjaan_ibu,
        s.nm_wali,
        s.pekerjaan_wali,
        sp.pelengkap_siswa_id,
        sp.status_dalam_kel,
        sp.anak_ke,
        sp.sekolah_asal,
        sp.diterima_kelas,
        sp.alamat_ortu,
        sp.telepon_ortu,
        k.nm_kelas,
        k.tingkat_pendidikan_id,
        k.jenis_rombel
      FROM tabel_siswa s
      LEFT JOIN tabel_siswa_pelengkap sp ON s.peserta_didik_id = sp.peserta_didik_id
      LEFT JOIN tabel_anggotakelas ak ON s.peserta_didik_id = ak.peserta_didik_id
      LEFT JOIN tabel_kelas k ON ak.rombongan_belajar_id = k.rombongan_belajar_id 
        AND k.jenis_rombel IN (1, 9)
      ORDER BY s.peserta_didik_id, k.nm_kelas ASC, s.nm_siswa ASC
    `;

    // Natural sort function untuk sorting alphanumeric
    const naturalSort = (a: string, b: string): number => {
      return a.localeCompare(b, 'id', { numeric: true, sensitivity: 'base' });
    };

    // Sort hasil query: kelas terlebih dahulu (natural sort), kemudian nama siswa
    const sortedSiswa = (result as Siswa[]).sort((a, b) => {
      // Sort by kelas first (nulls last)
      if (!a.nm_kelas && !b.nm_kelas) return naturalSort(a.nm_siswa, b.nm_siswa);
      if (!a.nm_kelas) return 1;
      if (!b.nm_kelas) return -1;
      
      // Natural sort untuk kelas (X Merdeka 1, 2, 3... 10)
      const kelasCompare = naturalSort(a.nm_kelas, b.nm_kelas);
      if (kelasCompare !== 0) return kelasCompare;
      
      // If same kelas, sort by nama siswa (natural sort)
      return naturalSort(a.nm_siswa, b.nm_siswa);
    });

    return NextResponse.json({ siswa: sortedSiswa }, { status: 200 });
  } catch (error) {
    console.error('Get siswa error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat mengambil data siswa' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { peserta_didik_id, data_siswa, data_pelengkap } = body;

    if (!peserta_didik_id) {
      return NextResponse.json(
        { error: 'Peserta didik ID harus diisi' },
        { status: 400 }
      );
    }

    const sql = getDbClient();

    // Update tabel_siswa
    if (data_siswa) {
      await sql`
        UPDATE tabel_siswa
        SET 
          nm_siswa = ${data_siswa.nm_siswa},
          nis = ${data_siswa.nis},
          nisn = ${data_siswa.nisn || null},
          tempat_lahir = ${data_siswa.tempat_lahir || null},
          tanggal_lahir = ${data_siswa.tanggal_lahir || null},
          jenis_kelamin = ${data_siswa.jenis_kelamin || null},
          agama = ${data_siswa.agama || null},
          alamat_siswa = ${data_siswa.alamat_siswa || null},
          telepon_siswa = ${data_siswa.telepon_siswa || null},
          nm_ayah = ${data_siswa.nm_ayah || null},
          nm_ibu = ${data_siswa.nm_ibu || null},
          pekerjaan_ayah = ${data_siswa.pekerjaan_ayah || null},
          pekerjaan_ibu = ${data_siswa.pekerjaan_ibu || null}
        WHERE peserta_didik_id = ${peserta_didik_id}
      `;
    }

    // Update atau insert tabel_siswa_pelengkap
    if (data_pelengkap) {
      // Check if exists
      const checkExisting = await sql`
        SELECT pelengkap_siswa_id FROM tabel_siswa_pelengkap
        WHERE peserta_didik_id = ${peserta_didik_id}
        LIMIT 1
      `;

      if (checkExisting.length > 0) {
        // Update existing
        await sql`
          UPDATE tabel_siswa_pelengkap
          SET 
            status_dalam_kel = ${data_pelengkap.status_dalam_kel || null},
            anak_ke = ${data_pelengkap.anak_ke || null},
            sekolah_asal = ${data_pelengkap.sekolah_asal || null},
            diterima_kelas = ${data_pelengkap.diterima_kelas || null},
            alamat_ortu = ${data_pelengkap.alamat_ortu || null},
            telepon_ortu = ${data_pelengkap.telepon_ortu || null}
          WHERE peserta_didik_id = ${peserta_didik_id}
        `;
      } else {
        // Insert new
        await sql`
          INSERT INTO tabel_siswa_pelengkap (
            pelengkap_siswa_id, 
            peserta_didik_id, 
            status_dalam_kel, 
            anak_ke, 
            sekolah_asal, 
            diterima_kelas, 
            alamat_ortu, 
            telepon_ortu
          )
          VALUES (
            gen_random_uuid(), 
            ${peserta_didik_id}, 
            ${data_pelengkap.status_dalam_kel || null}, 
            ${data_pelengkap.anak_ke || null}, 
            ${data_pelengkap.sekolah_asal || null}, 
            ${data_pelengkap.diterima_kelas || null}, 
            ${data_pelengkap.alamat_ortu || null}, 
            ${data_pelengkap.telepon_ortu || null}
          )
        `;
      }
    }

    return NextResponse.json({ 
      message: 'Data siswa berhasil diupdate'
    }, { status: 200 });
  } catch (error) {
    console.error('Update siswa error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat mengupdate data siswa' },
      { status: 500 }
    );
  }
}
