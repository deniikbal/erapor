import { NextRequest, NextResponse } from 'next/server';
import { getDbClient } from '@/lib/db';
import { retryQuery } from '@/lib/dbRetryHelper';

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
        // We join with nilai_akhir to only show subjects that actually have grades in this class
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
            AND EXISTS (
                SELECT 1 FROM tabel_nilaiakhir n
                JOIN tabel_anggotakelas ak ON n.anggota_rombel_id = ak.anggota_rombel_id
                WHERE ak.rombongan_belajar_id = ${rombongan_belajar_id}
                AND n.mata_pelajaran_id = m.mata_pelajaran_id
                AND n.semester_id = ${semester_id}
            )
            ORDER BY m.klp_mpl, m.urut_rapor
        `;
        });

        // 4. Get All Grades for the Class
        // Optimization: Fetch all grades for this rombel in one query
        const grades = await retryQuery(async () => {
            return await sql`
            SELECT 
                ak.peserta_didik_id,
                n.mata_pelajaran_id,
                n.nilai_peng as nilai
            FROM tabel_nilaiakhir n
            JOIN tabel_anggotakelas ak ON n.anggota_rombel_id = ak.anggota_rombel_id
            WHERE ak.rombongan_belajar_id = ${rombongan_belajar_id}
            AND n.semester_id = ${semester_id}
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
            subjects,
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
