import { NextRequest, NextResponse } from 'next/server';
import { getDbClient } from '@/lib/db';
import { retryQuery } from '@/lib/dbRetryHelper';

/**
 * Detect peminatan (Logic exactly matching Status Penilaian version)
 */
function detectPeminatan(nm_kelas: string): string | null {
    const upper = nm_kelas.toUpperCase();

    // Check Class XII groupings first (GBIM/SBIM/EBIM)
    if (upper.includes('GBIM')) return 'GBIM';
    if (upper.includes('SBIM')) return 'SBIM';
    if (upper.includes('EBIM')) return 'EBIM';

    // Check Class XI traditional peminatan (kurikulum lama)
    if (upper.includes('IPA') || upper.includes('MIPA')) return 'MIPA';
    if (upper.includes('IPS')) return 'IPS';

    // Check kurikulum merdeka pattern (by mapel name in class)
    const mipaMapels = ['MATEMATIKA', 'BIOLOGI', 'FISIKA', 'KIMIA'];
    const ipsMapels = ['EKONOMI', 'GEOGRAFI', 'SEJARAH', 'SOSIOLOGI'];

    for (const mapel of mipaMapels) if (upper.includes(mapel)) return 'MIPA';
    for (const mapel of ipsMapels) if (upper.includes(mapel)) return 'IPS';

    return null; 
}

/**
 * Filter mapel pilihan based on peminatan
 */
function filterMapelPilihan(mapels: any[], peminatan: string | null) {
    if (!peminatan) return mapels;

    const mipaMapels = ['MATEMATIKA TINGKAT LANJUT', 'BIOLOGI', 'FISIKA', 'KIMIA'];
    const ipsMapels = ['GEOGRAFI', 'SEJARAH TINGKAT LANJUT', 'SOSIOLOGI', 'EKONOMI'];
    const gbimMapels = ['GEOGRAFI', 'BIOLOGI', 'BAHASA INGGRIS', 'MATEMATIKA'];
    const sbimMapels = ['SEJARAH', 'BIOLOGI', 'BAHASA INGGRIS', 'MATEMATIKA'];
    const ebimMapels = ['EKONOMI', 'BIOLOGI', 'BAHASA INGGRIS', 'MATEMATIKA'];

    return mapels.filter(mapel => {
        const nmUpper = (mapel.nm_mapel || mapel.nm_lokal || '').toUpperCase();
        if (peminatan === 'MIPA') return mipaMapels.some(m => nmUpper.includes(m));
        if (peminatan === 'IPS') return ipsMapels.some(m => nmUpper.includes(m));
        if (peminatan === 'GBIM') return gbimMapels.some(m => nmUpper.includes(m));
        if (peminatan === 'SBIM') return sbimMapels.some(m => nmUpper.includes(m));
        if (peminatan === 'EBIM') return ebimMapels.some(m => nmUpper.includes(m));
        return false;
    });
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const ptk_id = searchParams.get('ptk_id');
        const rombongan_belajar_id = searchParams.get('rombongan_belajar_id');

        if (!ptk_id) {
            return NextResponse.json({ error: 'PTK ID required' }, { status: 400 });
        }

        const sql = getDbClient();

        // 1. Get active semester
        const activeSemester = await sql`
            SELECT semester_id FROM semester WHERE periode_aktif = '1' LIMIT 1
        `;
        const activeSemesterId = activeSemester.length > 0 ? activeSemester[0].semester_id : '20251';

        // 2. Get classes where teacher is Wali Kelas
        const classes = await retryQuery(async () => {
            const rows = await sql`
                SELECT rombongan_belajar_id, nm_kelas, tingkat_pendidikan_id
                FROM tabel_kelas
                WHERE ptk_id = ${ptk_id} 
                  AND semester_id = ${activeSemesterId}
                  AND jenis_rombel = 1
                ORDER BY nm_kelas
            `;
            return rows.sort((a: any, b: any) => 
                a.nm_kelas.localeCompare(b.nm_kelas, undefined, { numeric: true, sensitivity: 'base' })
            );
        });

        if (!rombongan_belajar_id) {
            return NextResponse.json({ success: true, classes });
        }

        // 3. Get specific class info
        const selectedClass = classes.find((c: any) => c.rombongan_belajar_id === rombongan_belajar_id);
        if (!selectedClass) {
            return NextResponse.json({ error: 'Class not found or unauthorized' }, { status: 404 });
        }

        const tingkat = selectedClass.tingkat_pendidikan_id;
        const nm_kelas = selectedClass.nm_kelas;
        const peminatan = detectPeminatan(nm_kelas);

        // 4. Get All Students in Class
        const students = await retryQuery(async () => {
            return await sql`
                SELECT 
                    s.peserta_didik_id, 
                    s.nm_siswa, 
                    s.nisn,
                    ak.anggota_rombel_id
                FROM tabel_siswa s
                JOIN tabel_anggotakelas ak ON s.peserta_didik_id = ak.peserta_didik_id
                WHERE ak.rombongan_belajar_id = ${rombongan_belajar_id}
                ORDER BY s.nm_siswa ASC
            `;
        });

        // 5. Get Subjects for this class level
        const subjects = await retryQuery(async () => {
            return await sql`
                SELECT 
                    m.mata_pelajaran_id,
                    m.nm_lokal as nm_mapel,
                    tm.nm_ringkas,
                    m.klp_mpl,
                    m.urut_rapor
                FROM tabel_map_mapelk2013 m
                LEFT JOIN tabel_mapel tm ON m.mata_pelajaran_id = tm.mata_pelajaran_id
                WHERE m.tingkat_pendidikan_id = ${tingkat}
                ORDER BY m.urut_rapor
            `;
        });

        const filteredSubjects = subjects.map((subject: any) => {
            if (subject.klp_mpl === 2) {
                const matchesPeminatan = filterMapelPilihan([subject], peminatan).length > 0;
                if (!matchesPeminatan) return null;
            }
            return subject;
        }).filter((s: any) => s !== null);

        // 6. Get All Grades for the Class (Cross-rombel for multi-enrollment students)
        const gradesResult = await retryQuery(async () => {
            return await sql`
                SELECT DISTINCT ON (ak.peserta_didik_id, n.mata_pelajaran_id)
                    ak.peserta_didik_id,
                    n.mata_pelajaran_id,
                    n.nilai_peng as nilai
                FROM tabel_nilaiakhir n
                JOIN tabel_anggotakelas ak ON n.anggota_rombel_id = ak.anggota_rombel_id
                LEFT JOIN tabel_kelas k ON ak.rombongan_belajar_id = k.rombongan_belajar_id
                WHERE ak.peserta_didik_id IN (
                    SELECT peserta_didik_id FROM tabel_anggotakelas WHERE rombongan_belajar_id = ${rombongan_belajar_id}
                )
                AND n.semester_id = ${activeSemesterId}
                ORDER BY 
                    ak.peserta_didik_id, 
                    n.mata_pelajaran_id, 
                    k.jenis_rombel DESC NULLS LAST
            `;
        });

        // 7. Process data for ranking
        const gradeMap: Record<string, Record<string, number>> = {};
        gradesResult.forEach((g: any) => {
            if (!gradeMap[g.peserta_didik_id]) gradeMap[g.peserta_didik_id] = {};
            gradeMap[g.peserta_didik_id][g.mata_pelajaran_id] = Number(g.nilai);
        });

        // Calculate totals and averages
        const rankingData = students.map((s: any) => {
            const studentGrades = gradeMap[s.peserta_didik_id] || {};
            let total = 0;
            let count = 0;

            filteredSubjects.forEach((sub: any) => {
                const nilai = studentGrades[sub.mata_pelajaran_id];
                if (nilai !== undefined && nilai !== null) {
                    total += nilai;
                    count++;
                }
            });

            const average = count > 0 ? Number((total / count).toFixed(2)) : 0;

            return {
                peserta_didik_id: s.peserta_didik_id,
                nm_siswa: s.nm_siswa,
                nisn: s.nisn,
                grades: studentGrades,
                total,
                average,
                subjectCount: count
            };
        });

        // Sort by average DESC, then total DESC
        rankingData.sort((a, b) => {
            if (b.average !== a.average) return b.average - a.average;
            return b.total - a.total;
        });

        // Assign ranks (Competition ranking: 1, 2, 2, 4...)
        let currentRank = 1;
        for (let i = 0; i < rankingData.length; i++) {
            if (i > 0 && rankingData[i].average === rankingData[i - 1].average && rankingData[i].total === rankingData[i - 1].total) {
                // Same rank as previous
                (rankingData[i] as any).rank = (rankingData[i - 1] as any).rank;
            } else {
                (rankingData[i] as any).rank = i + 1;
            }
        }

        return NextResponse.json({
            success: true,
            classInfo: selectedClass,
            subjects: filteredSubjects,
            ranking: rankingData,
            activeSemesterId
        });

    } catch (error) {
        console.error('Peringkat API error:', error);
        return NextResponse.json({ error: 'Internal Server Error', details: String(error) }, { status: 500 });
    }
}
