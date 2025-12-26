import { NextRequest, NextResponse } from 'next/server';
import { getDbClient } from '@/lib/db';
import { retryQuery } from '@/lib/dbRetryHelper';

/**
 * Detect peminatan from class name
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

    for (const mapel of mipaMapels) {
        if (upper.includes(mapel)) return 'MIPA';
    }

    for (const mapel of ipsMapels) {
        if (upper.includes(mapel)) return 'IPS';
    }

    return null; // Kelas X or unknown
}

/**
 * Filter mapel pilihan based on peminatan
 */
function filterMapelPilihan(mapels: any[], peminatan: string | null) {
    if (!peminatan) {
        // Kelas X - return all mapel pilihan
        return mapels;
    }

    // Define mapel groups
    const mipaMapels = ['MATEMATIKA TINGKAT LANJUT', 'BIOLOGI', 'FISIKA', 'KIMIA'];
    const ipsMapels = ['GEOGRAFI', 'SEJARAH TINGKAT LANJUT', 'SOSIOLOGI', 'EKONOMI'];

    // Class XII groupings
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
        const searchParams = request.nextUrl.searchParams;
        const rombongan_belajar_id = searchParams.get('rombongan_belajar_id');
        const semester_id = searchParams.get('semester_id') || '20251'; // Default to current semester

        if (!rombongan_belajar_id) {
            return NextResponse.json(
                { error: 'Parameter rombongan_belajar_id required' },
                { status: 400 }
            );
        }

        const sql = getDbClient();

        // 1. Get Class Info
        const classInfo = await retryQuery(async () => {
            return await sql`
            SELECT nm_kelas, tingkat_pendidikan_id 
            FROM tabel_kelas 
            WHERE rombongan_belajar_id = ${rombongan_belajar_id}
            LIMIT 1
        `;
        });

        if (classInfo.length === 0) {
            return NextResponse.json({ error: 'Kelas not found' }, { status: 404 });
        }

        const tingkat = classInfo[0].tingkat_pendidikan_id;
        const nm_kelas = classInfo[0].nm_kelas;

        // Detect peminatan from class name
        const peminatan = detectPeminatan(nm_kelas);

        // 2. Get All Students in Class
        const students = await retryQuery(async () => {
            return await sql`
            SELECT 
                s.peserta_didik_id, 
                s.nm_siswa, 
                s.nisn, 
                s.nis
            FROM tabel_siswa s
            JOIN tabel_anggotakelas ak ON s.peserta_didik_id = ak.peserta_didik_id
            WHERE ak.rombongan_belajar_id = ${rombongan_belajar_id}
            ORDER BY s.nm_siswa ASC
        `;
        });

        // 3. Get All Subjects (Mapel) that apply to this class level
        // Include ALL subjects for this level, not just those with grades
        const subjects = await retryQuery(async () => {
            return await sql`
            SELECT DISTINCT
                m.mata_pelajaran_id,
                m.nm_lokal as nm_mapel,
                tm.nm_ringkas,
                m.klp_mpl,
                m.urut_rapor,
                COALESCE(k.nama, 'Lainnya') as nama_kelompok
            FROM tabel_map_mapelk2013 m
            LEFT JOIN ref_klp_mapel k ON m.klp_mpl = k.klp_id AND k.jenjang = 'SMA'
            LEFT JOIN tabel_mapel tm ON m.mata_pelajaran_id = tm.mata_pelajaran_id
            WHERE m.tingkat_pendidikan_id = ${tingkat}
            ORDER BY m.klp_mpl, m.urut_rapor
        `;
        });

        // Filter mapel pilihan (klp_mpl === 2) based on peminatan
        const filteredSubjects = subjects.map(subject => {
            // Check if this is mapel pilihan
            if (subject.klp_mpl === 2) {
                // This subject is mapel pilihan, check if it matches peminatan
                const matchesPeminatan = filterMapelPilihan([subject], peminatan).length > 0;
                if (!matchesPeminatan) {
                    return null; // Exclude this subject
                }
            }
            return subject;
        }).filter(s => s !== null); // Remove excluded subjects

        // 4. Get All Grades for the Class
        // For Class XII with multi-enrollment: prioritize nilai from per-subject classes (jenis_rombel=16) over main class (jenis_rombel=1)
        // Use DISTINCT ON to get one grade per student per subject, ordered by jenis_rombel DESC
        const grades = await retryQuery(async () => {
            return await sql`
            SELECT DISTINCT ON (ak.peserta_didik_id, n.mata_pelajaran_id)
                ak.peserta_didik_id,
                n.mata_pelajaran_id,
                n.nilai_peng as nilai
            FROM tabel_nilaiakhir n
            JOIN tabel_anggotakelas ak ON n.anggota_rombel_id = ak.anggota_rombel_id
            LEFT JOIN tabel_kelas k ON ak.rombongan_belajar_id = k.rombongan_belajar_id
            WHERE ak.peserta_didik_id IN (
                SELECT peserta_didik_id 
                FROM tabel_anggotakelas 
                WHERE rombongan_belajar_id = ${rombongan_belajar_id}
            )
            AND n.semester_id = ${semester_id}
            ORDER BY 
                ak.peserta_didik_id,
                n.mata_pelajaran_id,
                k.jenis_rombel DESC NULLS LAST
        `;
        });

        // 5. Get Attendance Data
        const attendance = await retryQuery(async () => {
            return await sql`
                SELECT 
                    ak.peserta_didik_id,
                    h.sakit,
                    h.izin,
                    h.tanpa_keterangan as alpha
                FROM tabel_kehadiran h
                JOIN tabel_anggotakelas ak ON h.anggota_rombel_id = ak.anggota_rombel_id
                WHERE ak.rombongan_belajar_id = ${rombongan_belajar_id}
                AND h.semester_id = ${semester_id}
            `;
        });

        const attendanceMap: Record<string, any> = {};
        attendance.forEach((h: any) => {
            attendanceMap[h.peserta_didik_id] = {
                s: h.sakit || 0,
                i: h.izin || 0,
                a: h.alpha || 0
            };
        });

        // 6. Get Extracurricular Data
        const extracurricular = await retryQuery(async () => {
            return await sql`
                SELECT 
                    ak.peserta_didik_id,
                    re.nm_ekskul as nm_ekstra,
                    ne.nilai_ekstra,
                    re.id_ekskul as ekstra_id
                FROM tabel_nilai_ekstra ne
                JOIN tabel_anggotakelas ak ON ne.anggota_rombel_id = ak.anggota_rombel_id
                LEFT JOIN refekstra_kurikuler re ON ne.id_ekskul_baru = re.id_ekskul
                WHERE ak.rombongan_belajar_id = ${rombongan_belajar_id}
                AND ne.semester_id = ${semester_id}
                AND ne.deskripsi IS NOT NULL
                ORDER BY re.id_ekskul
            `;
        });

        // Get unique ekskul list
        const ekskulList: any[] = [];
        const ekskulSet = new Set<string>();
        extracurricular.forEach((ek: any) => {
            if (!ekskulSet.has(ek.ekstra_id)) {
                ekskulSet.add(ek.ekstra_id);
                ekskulList.push({
                    id: ek.ekstra_id,
                    name: ek.nm_ekstra
                });
            }
        });

        // Map ekskul values: { student_id: { ekskul_id: converted_value } }
        const ekskulMap: Record<string, Record<string, string>> = {};
        const convertEkskulValue = (nilai: any): string => {
            const numNilai = Number(nilai);
            if (numNilai === 4) return 'SB';
            if (numNilai === 3) return 'B';
            if (numNilai === 2) return 'C';
            if (numNilai === 1) return 'K';
            return '';
        };

        extracurricular.forEach((ek: any) => {
            if (!ekskulMap[ek.peserta_didik_id]) {
                ekskulMap[ek.peserta_didik_id] = {};
            }
            if (ek.ekstra_id && ek.nilai_ekstra !== null && ek.nilai_ekstra !== undefined) {
                ekskulMap[ek.peserta_didik_id][ek.ekstra_id] = convertEkskulValue(ek.nilai_ekstra);
            }
        });

        // 7. Structure the grades for easy lookup: { student_id: { mapel_id: nilai } }
        const gradeMap: Record<string, Record<string, number>> = {};

        grades.forEach((g: any) => {
            if (!gradeMap[g.peserta_didik_id]) {
                gradeMap[g.peserta_didik_id] = {};
            }
            // Ensure nilai is a number
            gradeMap[g.peserta_didik_id][g.mata_pelajaran_id] = Number(g.nilai);
        });

        return NextResponse.json({
            students,
            subjects: filteredSubjects,
            grades: gradeMap,
            attendance: attendanceMap,
            ekskul: ekskulList,
            ekskulValues: ekskulMap,
            kelas: classInfo[0]
        });

    } catch (error) {
        console.error('Leger API Error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch leger data', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
