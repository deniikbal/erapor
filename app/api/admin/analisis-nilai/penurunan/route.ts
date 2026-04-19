import { NextRequest, NextResponse } from 'next/server';
import { getDbClient } from '@/lib/db';
import { retryQuery } from '@/lib/dbRetryHelper';

/**
 * Get previous semester ID based on current ID
 * Format: YYYY1 (Odd) or YYYY2 (Even)
 */
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

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const rombongan_belajar_id = searchParams.get('rombongan_belajar_id');

        const sql = getDbClient();

        // 1. Get active semester
        const activeSemester = await sql`
            SELECT semester_id, nama_semester FROM semester WHERE periode_aktif = '1' LIMIT 1
        `;
        const activeSemesterId = activeSemester.length > 0 ? activeSemester[0].semester_id : '20251';
        const activeSemesterName = activeSemester.length > 0 ? activeSemester[0].nama_semester : 'Semester Ganjil 2025/2026';
        
        const prevSemesterId = getPreviousSemesterId(activeSemesterId);
        
        // Get previous semester name
        const prevSemesterInfo = await sql`
            SELECT nama_semester FROM semester WHERE semester_id = ${prevSemesterId} LIMIT 1
        `;
        const prevSemesterName = prevSemesterInfo.length > 0 ? prevSemesterInfo[0].nama_semester : `Semester Sebelumnya (${prevSemesterId})`;

        // 2. Get classes for selection
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

        if (!rombongan_belajar_id) {
            return NextResponse.json({ success: true, classes, semesters: { current: activeSemesterName, previous: prevSemesterName } });
        }

        // 3. Get students in this class
        const students = await sql`
            SELECT s.peserta_didik_id, s.nm_siswa
            FROM tabel_siswa s
            JOIN tabel_anggotakelas ak ON s.peserta_didik_id = ak.peserta_didik_id
            WHERE ak.rombongan_belajar_id = ${rombongan_belajar_id}
        `;
        
        const studentIds = students.map(s => s.peserta_didik_id);
        if (studentIds.length === 0) {
            return NextResponse.json({ success: true, analysis: [], classes });
        }

        // 4. Get subject averages for Current Semester
        const currentGrades = await sql`
            SELECT 
                n.mata_pelajaran_id,
                m.nm_lokal as nm_mapel,
                AVG(n.nilai_peng) as avg_nilai
            FROM tabel_nilaiakhir n
            JOIN tabel_anggotakelas ak ON n.anggota_rombel_id = ak.anggota_rombel_id
            JOIN tabel_map_mapelk2013 m ON n.mata_pelajaran_id = m.mata_pelajaran_id
            WHERE ak.peserta_didik_id = ANY(${studentIds})
              AND n.semester_id = ${activeSemesterId}
            GROUP BY n.mata_pelajaran_id, m.nm_lokal
        `;

        // 5. Get subject averages for Previous Semester for the SAME STUDENTS
        const prevGrades = await sql`
            SELECT 
                n.mata_pelajaran_id,
                AVG(n.nilai_peng) as avg_nilai
            FROM tabel_nilaiakhir n
            JOIN tabel_anggotakelas ak ON n.anggota_rombel_id = ak.anggota_rombel_id
            WHERE ak.peserta_didik_id = ANY(${studentIds})
              AND n.semester_id = ${prevSemesterId}
            GROUP BY n.mata_pelajaran_id
        `;

        const prevGradesMap: Record<string, number> = {};
        prevGrades.forEach((g: any) => {
            prevGradesMap[String(g.mata_pelajaran_id)] = Number(g.avg_nilai);
        });

        // 6. Calculate Delta and Combine
        const analysis = currentGrades.map((cur: any) => {
            const mapelId = String(cur.mata_pelajaran_id);
            const avgPrev = prevGradesMap[mapelId];
            const avgCur = Number(cur.avg_nilai);
            
            return {
                mata_pelajaran_id: mapelId,
                nm_mapel: cur.nm_mapel,
                avg_prev: avgPrev !== undefined ? Number(avgPrev.toFixed(2)) : null,
                avg_cur: Number(avgCur.toFixed(2)),
                delta: avgPrev !== undefined ? Number((avgCur - avgPrev).toFixed(2)) : null
            };
        });

        // Sort by delta (worst first)
        analysis.sort((a, b) => {
            if (a.delta === null) return 1;
            if (b.delta === null) return -1;
            return a.delta - b.delta;
        });

        return NextResponse.json({
            success: true,
            classes,
            analysis,
            semesters: {
                current: activeSemesterName,
                previous: prevSemesterName
            }
        });

    } catch (error) {
        console.error('Analisis Penurunan API error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
