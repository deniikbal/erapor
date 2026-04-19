import { NextRequest, NextResponse } from 'next/server';
import { getDbClient } from '@/lib/db';
import { retryQuery } from '@/lib/dbRetryHelper';

function getPreviousSemesterId(currentId: string): string {
    const yearStr = currentId.substring(0, 4);
    const term = currentId.substring(4, 5);
    const year = parseInt(yearStr);
    
    if (term === '2') {
        return year + '1';
    } else {
        return (year - 1) + '2';
    }
}

function detectPeminatan(nm_kelas: string): string | null {
    const upper = nm_kelas.toUpperCase();

    if (upper.includes('GBIM')) return 'GBIM';
    if (upper.includes('SBIM')) return 'SBIM';
    if (upper.includes('EBIM')) return 'EBIM';

    if (upper.includes('IPA') || upper.includes('MIPA')) return 'MIPA';
    if (upper.includes('IPS')) return 'IPS';

    const mipaMapels = ['MATEMATIKA', 'BIOLOGI', 'FISIKA', 'KIMIA'];
    const ipsMapels = ['EKONOMI', 'GEOGRAFI', 'SEJARAH', 'SOSIOLOGI'];

    for (const mapel of mipaMapels) {
        if (upper.includes(mapel)) return 'MIPA';
    }

    for (const mapel of ipsMapels) {
        if (upper.includes(mapel)) return 'IPS';
    }

    return null;
}

function filterMapelPilihan(mapels: any[], peminatan: string | null) {
    if (!peminatan) return mapels;

    const mipaMapels = ['MATEMATIKA TINGKAT LANJUT', 'BIOLOGI', 'FISIKA', 'KIMIA'];
    const ipsMapels = ['GEOGRAFI', 'SEJARAH TINGKAT LANJUT', 'SOSIOLOGI', 'EKONOMI'];

    const gbimMapels = ['GEOGRAFI', 'BIOLOGI', 'BAHASA INGGRIS', 'MATEMATIKA'];
    const sbimMapels = ['SEJARAH', 'BIOLOGI', 'BAHASA INGGRIS', 'MATEMATIKA'];
    const ebimMapels = ['EKONOMI', 'BIOLOGI', 'BAHASA INGGRIS', 'MATEMATIKA'];

    return mapels.filter(mapel => {
        const nmUpper = (mapel.nm_mapel || mapel.nm_lokal || '').toUpperCase();

        if (peminatan === 'MIPA') {
            return mipaMapels.some(m => nmUpper.includes(m));
        } else if (peminatan === 'IPS') {
            return ipsMapels.some(m => nmUpper.includes(m));
        } else if (peminatan === 'GBIM') {
            return gbimMapels.some(m => nmUpper.includes(m));
        } else if (peminatan === 'SBIM') {
            return sbimMapels.some(m => nmUpper.includes(m));
        } else if (peminatan === 'EBIM') {
            return ebimMapels.some(m => nmUpper.includes(m));
        }

        return false;
    });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ptk_id = searchParams.get('ptk_id');
    const rombongan_belajar_id = searchParams.get('rombongan_belajar_id');
    const peserta_didik_id = searchParams.get('peserta_didik_id');
    const mata_pelajaran_id = searchParams.get('mata_pelajaran_id');

    const sql = getDbClient();

    // 1. Get active semester
    const activeSemester = await sql`
        SELECT semester_id, nama_semester FROM semester WHERE periode_aktif = '1' LIMIT 1
    `;
    const activeSemesterId = activeSemester.length > 0 ? activeSemester[0].semester_id : '20251';
    const activeSemesterName = activeSemester.length > 0 ? activeSemester[0].nama_semester : 'Semester Aktif';

    // 2. If only ptk_id provided, get classes for this teacher
    if (ptk_id && !rombongan_belajar_id && !peserta_didik_id && !mata_pelajaran_id) {
      const classes = await retryQuery(async () => {
        const rows = await sql`
          SELECT rombongan_belajar_id, nm_kelas 
          FROM tabel_kelas 
          WHERE ptk_id = ${ptk_id} 
            AND semester_id = ${activeSemesterId}
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

    // 3. If rombongan_belajar_id provided, get students AND subjects in that class
    if (rombongan_belajar_id && !peserta_didik_id && !mata_pelajaran_id) {
      const classInfo = await sql`
        SELECT nm_kelas, tingkat_pendidikan_id FROM tabel_kelas WHERE rombongan_belajar_id = ${rombongan_belajar_id} LIMIT 1
      `;
      const tingkat = classInfo.length > 0 ? classInfo[0].tingkat_pendidikan_id : 10;
      const nm_kelas = classInfo.length > 0 ? classInfo[0].nm_kelas : '';
      const peminatan = detectPeminatan(nm_kelas);

      const students = await retryQuery(async () => {
        return await sql`
          SELECT s.peserta_didik_id, s.nm_siswa, s.nisn
          FROM tabel_siswa s
          JOIN tabel_anggotakelas ak ON s.peserta_didik_id = ak.peserta_didik_id
          WHERE ak.rombongan_belajar_id = ${rombongan_belajar_id}
          ORDER BY s.nm_siswa
        `;
      });

      const allSubjects = await retryQuery(async () => {
        return await sql`
            SELECT 
                m.mata_pelajaran_id,
                m.nm_lokal as nm_mapel,
                m.klp_mpl
            FROM tabel_map_mapelk2013 m
            WHERE m.tingkat_pendidikan_id = ${tingkat}
            ORDER BY m.urut_rapor
        `;
      });

      const subjects = allSubjects.map((subject: any) => {
        if (subject.klp_mpl === 2) {
            const matchesPeminatan = filterMapelPilihan([subject], peminatan).length > 0;
            if (!matchesPeminatan) return null;
        }
        return subject;
      }).filter((s: any) => s !== null);

      const semesters = await sql`
        SELECT semester_id, nama_semester FROM semester WHERE semester_id IN (${activeSemesterId}, ${getPreviousSemesterId(activeSemesterId)})
      `;

      return NextResponse.json({ students, subjects, semesters });
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

    // 5. If mata_pelajaran_id provided, fetch comparison for ALL students in class
    if (rombongan_belajar_id && mata_pelajaran_id) {
        const prevSemesterId = getPreviousSemesterId(activeSemesterId);
        
        // Fetch prev semester name
        const prevSemester = await sql`
            SELECT nama_semester FROM semester WHERE semester_id = ${prevSemesterId} LIMIT 1
        `;
        const prevSemesterName = prevSemester.length > 0 ? prevSemester[0].nama_semester : 'Semester Sebelumnya';

        // Fetch Teacher Info
        const teacherInfo = await sql`
            SELECT DISTINCT p.nama
            FROM tabel_pembelajaran tp
            LEFT JOIN tabel_ptk_terdaftar td ON tp.ptk_terdaftar_id = td.ptk_terdaftar_id
            LEFT JOIN tabel_ptk p ON td.ptk_id = p.ptk_id
            WHERE tp.rombongan_belajar_id = ${rombongan_belajar_id}
              AND tp.mata_pelajaran_id = ${mata_pelajaran_id}
              AND tp.semester_id = ${activeSemesterId}
            LIMIT 1
        `;
        const teacherName = teacherInfo.length > 0 ? teacherInfo[0].nama : '-';

        const studentsInClass = await sql`
            SELECT s.peserta_didik_id, s.nm_siswa, s.nisn, ak.anggota_rombel_id
            FROM tabel_siswa s
            JOIN tabel_anggotakelas ak ON s.peserta_didik_id = ak.peserta_didik_id
            WHERE ak.rombongan_belajar_id = ${rombongan_belajar_id}
            ORDER BY s.nm_siswa
        `;
        
        const studentIds = studentsInClass.map((s: any) => s.peserta_didik_id);

        // Current grades - Search broad by studentId (to catch electives in other rombels)
        const currentGrades = await sql`
            SELECT ak.peserta_didik_id, n.nilai_peng as nilai
            FROM tabel_nilaiakhir n
            JOIN tabel_anggotakelas ak ON n.anggota_rombel_id = ak.anggota_rombel_id
            WHERE ak.peserta_didik_id = ANY(${studentIds})
              AND n.mata_pelajaran_id = ${mata_pelajaran_id}
              AND n.semester_id = ${activeSemesterId}
        `;

        // Previous grades
        const prevGrades = await sql`
            SELECT ak.peserta_didik_id, n.nilai_peng as nilai
            FROM tabel_nilaiakhir n
            JOIN tabel_anggotakelas ak ON n.anggota_rombel_id = ak.anggota_rombel_id
            WHERE ak.peserta_didik_id = ANY(${studentIds})
              AND n.mata_pelajaran_id = ${mata_pelajaran_id}
              AND n.semester_id = ${prevSemesterId}
        `;

        const curMap: Record<string, number> = {};
        currentGrades.forEach((g: any) => { curMap[g.peserta_didik_id] = Number(g.nilai); });
        
        const prevMap: Record<string, number> = {};
        prevGrades.forEach((g: any) => { prevMap[g.peserta_didik_id] = Number(g.nilai); });

        const analysisMapel = studentsInClass.map((s: any) => {
            const cid = s.peserta_didik_id;
            const valCur = curMap[cid] ?? null;
            const valPrev = prevMap[cid] ?? null;
            const delta = (valCur !== null && valPrev !== null) ? Number((valCur - valPrev).toFixed(2)) : null;
            
            return {
                peserta_didik_id: cid,
                nm_siswa: s.nm_siswa,
                nisn: s.nisn,
                nilai_cur: valCur,
                nilai_prev: valPrev,
                delta: delta
            };
        });

        return NextResponse.json({ 
            success: true, 
            analysisMapel,
            teacherName,
            semesters: {
                current: { id: activeSemesterId, name: activeSemesterName },
                previous: { id: prevSemesterId, name: prevSemesterName }
            }
        });
    }

    return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });

  } catch (error) {
    console.error('Perkembangan Nilai API error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
