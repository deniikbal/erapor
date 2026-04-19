import { NextRequest, NextResponse } from 'next/server';
import { getDbClient } from '@/lib/db';
import { retryQuery } from '@/lib/dbRetryHelper';

/**
 * Detect peminatan (Logic exactly matching Guru version)
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
 * Filter mapel pilihan (Logic exactly matching Guru version)
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
        const { searchParams } = new URL(request.url);
        const rombongan_belajar_id = searchParams.get('rombongan_belajar_id');

        const sql = getDbClient();

        // 1. Get active semester
        const activeSemester = await sql`
            SELECT semester_id FROM semester WHERE periode_aktif = '1' LIMIT 1
        `;
        const activeSemesterId = activeSemester.length > 0 ? activeSemester[0].semester_id : '20251';

        // 2. FOR ADMIN: Get ALL classes in active semester
        const classes = await retryQuery(async () => {
            const rows = await sql`
                SELECT rombongan_belajar_id, nm_kelas, tingkat_pendidikan_id
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

        if (!rombongan_belajar_id) {
            return NextResponse.json({ success: true, classes });
        }

        // 3. Get specific class info
        const selectedClass = classes.find((c: any) => c.rombongan_belajar_id === rombongan_belajar_id);
        if (!selectedClass) {
            return NextResponse.json({ error: 'Class not found' }, { status: 404 });
        }

        const tingkat = selectedClass.tingkat_pendidikan_id;
        const peminatan = detectPeminatan(selectedClass.nm_kelas);

        // 4. Get student count in class
        const studentCountResult = await sql`
            SELECT COUNT(peserta_didik_id) as total
            FROM tabel_anggotakelas
            WHERE rombongan_belajar_id = ${rombongan_belajar_id}
        `;
        const totalSiswa = parseInt(studentCountResult[0].total) || 0;

        // 5. Get teacher mapping from tabel_pembelajaran (Expanded search)
        let teacherMapping: any[] = [];
        try {
            teacherMapping = await sql`
                SELECT DISTINCT
                    tp.mata_pelajaran_id,
                    p.nama as nama_guru,
                    tp.ptk_terdaftar_id
                FROM tabel_pembelajaran tp
                LEFT JOIN tabel_ptk_terdaftar td ON tp.ptk_terdaftar_id = td.ptk_terdaftar_id
                LEFT JOIN tabel_ptk p ON td.ptk_id = p.ptk_id
                WHERE tp.semester_id = ${activeSemesterId}
                  AND tp.rombongan_belajar_id IN (
                      SELECT DISTINCT ak_other.rombongan_belajar_id
                      FROM tabel_anggotakelas ak_this
                      JOIN tabel_anggotakelas ak_other ON ak_this.peserta_didik_id = ak_other.peserta_didik_id
                      WHERE ak_this.rombongan_belajar_id = ${rombongan_belajar_id}
                  )
            `;
        } catch (e) {
            console.error('Teacher mapping failed:', e);
            // Fallback to simple matching if complex one fails
            try {
                teacherMapping = await sql`
                    SELECT DISTINCT
                        tp.mata_pelajaran_id,
                        p.nama as nama_guru
                    FROM tabel_pembelajaran tp
                    LEFT JOIN tabel_ptk_terdaftar td ON tp.ptk_terdaftar_id = td.ptk_terdaftar_id
                    LEFT JOIN tabel_ptk p ON td.ptk_id = p.ptk_id
                    WHERE tp.semester_id = ${activeSemesterId}
                      AND tp.rombongan_belajar_id = ${rombongan_belajar_id}
                `;
            } catch (e2) {
                console.error('Fallback teacher mapping also failed:', e2);
            }
        }

        const teacherMap: Record<string, string[]> = {};
        teacherMapping.forEach((m: any) => {
            const mapelId = String(m.mata_pelajaran_id);
            if (!teacherMap[mapelId]) {
                teacherMap[mapelId] = [];
            }
            
            const teacherName = m.nama_guru || (m.ptk_terdaftar_id ? "Guru (ID: " + String(m.ptk_terdaftar_id).substring(0,8) + "...)" : '-');
            if (teacherName !== '-' && !teacherMap[mapelId].includes(teacherName)) {
                teacherMap[mapelId].push(teacherName);
            }
        });

        // Convert array to string
        const finalTeacherMap: Record<string, string> = {};
        Object.keys(teacherMap).forEach(key => {
            finalTeacherMap[key] = teacherMap[key].length > 0 ? teacherMap[key].join(', ') : '-';
        });

        // 6. Get all subjects for this level and filter by peminatan
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

        const filteredSubjects = allSubjects.map((subject: any) => {
            if (subject.klp_mpl === 2) {
                const matchesPeminatan = filterMapelPilihan([subject], peminatan).length > 0;
                if (!matchesPeminatan) return null;
            }
            return subject;
        }).filter((s: any) => s !== null);

        // 7. Get grade counts per subject
        const statusPenilaian = await Promise.all(filteredSubjects.map(async (subject: any) => {
            const gradeCountResult = await sql`
                SELECT COUNT(DISTINCT ak_this.peserta_didik_id) as count
                FROM tabel_anggotakelas ak_this
                JOIN tabel_anggotakelas ak_any ON ak_this.peserta_didik_id = ak_any.peserta_didik_id
                JOIN tabel_nilaiakhir n ON ak_any.anggota_rombel_id = n.anggota_rombel_id
                WHERE ak_this.rombongan_belajar_id = ${rombongan_belajar_id}
                  AND n.mata_pelajaran_id = ${subject.mata_pelajaran_id}
                  AND n.semester_id = ${activeSemesterId}
            `;
            
            const descCountResult = await sql`
                SELECT COUNT(DISTINCT ak_this.peserta_didik_id) as count
                FROM tabel_anggotakelas ak_this
                JOIN tabel_deskripsi d ON ak_this.peserta_didik_id = d.peserta_didik_id
                WHERE ak_this.rombongan_belajar_id = ${rombongan_belajar_id}
                  AND d.mata_pelajaran_id = ${subject.mata_pelajaran_id}
                  AND d.semester_id = ${activeSemesterId}
            `;

            return {
                mata_pelajaran_id: subject.mata_pelajaran_id,
                nm_mapel: subject.nm_mapel,
                rombel: selectedClass.nm_kelas,
                nama_guru: finalTeacherMap[String(subject.mata_pelajaran_id)] || '-',
                total_siswa: totalSiswa,
                count_nilai: parseInt(gradeCountResult[0].count) || 0,
                count_deskripsi: parseInt(descCountResult[0].count) || 0
            };
        }));

        return NextResponse.json({
            success: true,
            classes,
            selectedClass: selectedClass.nm_kelas,
            status: statusPenilaian
        });

    } catch (error) {
        console.error('Admin Status Penilaian API error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
