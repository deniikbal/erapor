import { NextRequest, NextResponse } from 'next/server';
import { getDbClient } from '@/lib/db';
import { retryQuery } from '@/lib/dbRetryHelper';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rombongan_belajar_id = searchParams.get('rombongan_belajar_id');
    const peserta_didik_id = searchParams.get('peserta_didik_id');

    const sql = getDbClient();

    // 1. Get active semester
    const activeSemester = await sql`
        SELECT semester_id FROM semester WHERE periode_aktif = '1' LIMIT 1
    `;
    const activeSemesterId = activeSemester.length > 0 ? activeSemester[0].semester_id : '20251';

    // 2. FOR ADMIN: If no ID provided, get ALL classes
    if (!rombongan_belajar_id && !peserta_didik_id) {
      const classes = await retryQuery(async () => {
        const rows = await sql`
          SELECT rombongan_belajar_id, nm_kelas 
          FROM tabel_kelas 
          WHERE semester_id = ${activeSemesterId}
            AND jenis_rombel = 1
          ORDER BY nm_kelas
        `;
        // Natural sort in JS
        return rows.sort((a: any, b: any) => 
          a.nm_kelas.localeCompare(b.nm_kelas, undefined, { numeric: true, sensitivity: 'base' })
        );
      });
      return NextResponse.json({ classes });
    }

    // 3. If rombongan_belajar_id provided, get students in that class
    if (rombongan_belajar_id && !peserta_didik_id) {
      const students = await retryQuery(async () => {
        return await sql`
          SELECT s.peserta_didik_id, s.nm_siswa, s.nisn
          FROM tabel_siswa s
          JOIN tabel_anggotakelas ak ON s.peserta_didik_id = ak.peserta_didik_id
          WHERE ak.rombongan_belajar_id = ${rombongan_belajar_id}
          ORDER BY s.nm_siswa
        `;
      });
      return NextResponse.json({ students });
    }

    // 4. If peserta_didik_id provided, fetch historical grades
    if (peserta_didik_id) {
      const history = await retryQuery(async () => {
        return await sql`
          SELECT 
            n.mata_pelajaran_id,
            m.nm_lokal as nm_mapel,
            tm.nm_ringkas as nm_mapel_pendek,
            n.semester_id,
            s.nama_semester,
            n.nilai_peng as nilai
          FROM tabel_nilaiakhir n
          JOIN tabel_anggotakelas ak ON n.anggota_rombel_id = ak.anggota_rombel_id
          JOIN semester s ON n.semester_id = s.semester_id
          JOIN tabel_map_mapelk2013 m ON n.mata_pelajaran_id = m.mata_pelajaran_id
          LEFT JOIN tabel_mapel tm ON m.mata_pelajaran_id = tm.mata_pelajaran_id
          WHERE ak.peserta_didik_id = ${peserta_didik_id}
          ORDER BY s.semester_id ASC, m.urut_rapor
        `;
      });

      const subjectsMap: Record<string, any> = {};
      const semestersSet = new Set<string>();

      history.forEach((row: any) => {
        const subjectCode = row.nm_mapel_pendek || row.nm_mapel;
        if (!subjectsMap[subjectCode]) {
          subjectsMap[subjectCode] = {
            subject: subjectCode,
            fullName: row.nm_mapel
          };
        }
        subjectsMap[subjectCode][row.semester_id] = Number(row.nilai);
        semestersSet.add(row.semester_id);
      });

      const semesterAverages: Record<string, number> = {};
      const semestersArr = Array.from(semestersSet).sort();
      
      semestersArr.forEach(semId => {
        let total = 0;
        let count = 0;
        Object.values(subjectsMap).forEach(sub => {
          if (sub[semId]) {
            total += sub[semId];
            count++;
          }
        });
        semesterAverages[semId] = count > 0 ? Number((total / count).toFixed(2)) : 0;
      });

      const chartData = Object.values(subjectsMap);
      const semesters = semestersArr.map(id => ({
        id,
        name: history.find((h: any) => h.semester_id === id)?.nama_semester || id
      }));

      return NextResponse.json({ 
        chartData, 
        semesters,
        semesterAverages
      });
    }

    return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });

  } catch (error) {
    console.error('Admin Perkembangan Nilai API error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
