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
        const rombongan_belajar_id = searchParams.get('rombongan_belajar_id');
        const tingkat_pendidikan_id = searchParams.get('tingkat_pendidikan_id');
        let semester_id_param = searchParams.get('semester_id');

        const sql = getDbClient();

        // 1. Get active semester
        let activeSemesterId = semester_id_param;
        if (!activeSemesterId) {
            const activeSemester = await sql`
                SELECT semester_id FROM semester WHERE periode_aktif = '1' LIMIT 1
            `;
            activeSemesterId = activeSemester.length > 0 ? activeSemester[0].semester_id : '20251';
        }

        // 2. FOR ADMIN: Get ALL regular classes for active semester (always return for class list)
        const classes = await retryQuery(async () => {
            const rows = await sql`
                SELECT rombongan_belajar_id, nm_kelas, tingkat_pendidikan_id
                FROM tabel_kelas
                WHERE semester_id = ${activeSemesterId}
                  AND jenis_rombel = 1
                ORDER BY nm_kelas
            `;
            return rows.sort((a: any, b: any) => 
                a.nm_kelas.localeCompare(b.nm_kelas, undefined, { numeric: true, sensitivity: 'base' })
            );
        });

        // If no class or grade level selected, return classes list
        if (!rombongan_belajar_id && !tingkat_pendidikan_id) {
            return NextResponse.json({ success: true, classes });
        }

        // Mode: Per Angkatan (by tingkat_pendidikan_id) or Per Kelas (by rombongan_belajar_id)
        let students: any[] = [];
        let tingkat = '';
        let classInfo = null;

        if (tingkat_pendidikan_id && !rombongan_belajar_id) {
            tingkat = tingkat_pendidikan_id;
            // 4. Get All Students in this grade level across all regular classes
            students = await retryQuery(async () => {
                return await sql`
                    SELECT 
                        s.peserta_didik_id, 
                        s.nm_siswa, 
                        s.nisn,
                        k.nm_kelas
                    FROM tabel_siswa s
                    JOIN tabel_anggotakelas ak ON s.peserta_didik_id = ak.peserta_didik_id
                    JOIN tabel_kelas k ON ak.rombongan_belajar_id = k.rombongan_belajar_id
                    WHERE k.tingkat_pendidikan_id = ${tingkat}
                      AND k.semester_id = ${activeSemesterId}
                      AND k.jenis_rombel = 1
                    ORDER BY s.nm_siswa ASC
                `;
            });
            classInfo = { nm_kelas: `Seluruh Tingkat ${tingkat}` };
        } else if (rombongan_belajar_id) {
            // Per Kelas Mode
            const selectedClass = classes.find((c: any) => c.rombongan_belajar_id === rombongan_belajar_id);
            if (!selectedClass) {
                return NextResponse.json({ error: 'Class not found' }, { status: 404 });
            }
            tingkat = selectedClass.tingkat_pendidikan_id;
            classInfo = selectedClass;

            students = await retryQuery(async () => {
                return await sql`
                    SELECT 
                        s.peserta_didik_id, 
                        s.nm_siswa, 
                        s.nisn,
                        ${selectedClass.nm_kelas} as nm_kelas
                    FROM tabel_siswa s
                    JOIN tabel_anggotakelas ak ON s.peserta_didik_id = ak.peserta_didik_id
                    WHERE ak.rombongan_belajar_id = ${rombongan_belajar_id}
                    ORDER BY s.nm_siswa ASC
                `;
            });
        }

        const nm_kelas_peminatan = classInfo?.nm_kelas || '';
        const peminatan = !tingkat_pendidikan_id ? detectPeminatan(nm_kelas_peminatan) : null;

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
            if (peminatan && subject.klp_mpl === 2) {
                const matchesPeminatan = filterMapelPilihan([subject], peminatan).length > 0;
                if (!matchesPeminatan) return null;
            }
            return subject;
        }).filter((s: any) => s !== null);

        // 6. Get All Grades for the Students (Cross-rombel support)
        const gradesResult = await retryQuery(async () => {
            const studentIds = students.map(s => s.peserta_didik_id);
            if (studentIds.length === 0) return [];

            return await sql`
                SELECT DISTINCT ON (ak.peserta_didik_id, n.mata_pelajaran_id)
                    ak.peserta_didik_id,
                    n.mata_pelajaran_id,
                    n.nilai_peng as nilai
                FROM tabel_nilaiakhir n
                JOIN tabel_anggotakelas ak ON n.anggota_rombel_id = ak.anggota_rombel_id
                LEFT JOIN tabel_kelas k ON ak.rombongan_belajar_id = k.rombongan_belajar_id
                WHERE ak.peserta_didik_id = ANY(${studentIds})
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

        const rankingData = students.map((s: any) => {
            const studentGrades = gradeMap[s.peserta_didik_id] || {};
            let total = 0;
            let count = 0;

            // Use ALL subjects if per angkatan, or filtered subjects if per class (peminatan)
            const targetSubjects = tingkat_pendidikan_id ? subjects : filteredSubjects;

            targetSubjects.forEach((sub: any) => {
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
                nm_kelas: s.nm_kelas,
                grades: studentGrades,
                total,
                average,
                subjectCount: count
            };
        });

        rankingData.sort((a, b) => {
            if (b.average !== a.average) return b.average - a.average;
            return b.total - a.total;
        });

        // Dense ranking: nilai sama = rank sama, rank berikutnya tetap berurutan (1,2,3,3,4)
        let currentRank = 1;
        for (let i = 0; i < rankingData.length; i++) {
            if (i > 0 && !(rankingData[i].average === rankingData[i - 1].average && rankingData[i].total === rankingData[i - 1].total)) {
                currentRank++;
            }
            (rankingData[i] as any).rank = currentRank;
        }

        return NextResponse.json({
            success: true,
            classInfo,
            subjects: tingkat_pendidikan_id ? subjects : filteredSubjects,
            ranking: rankingData,
            activeSemesterId
        });

    } catch (error) {
        console.error('Admin Peringkat API error:', error);
        return NextResponse.json({ error: 'Internal Server Error', details: String(error) }, { status: 500 });
    }
}
