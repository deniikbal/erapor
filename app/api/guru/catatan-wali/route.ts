import { NextRequest, NextResponse } from 'next/server';
import { getDbClient } from '@/lib/db';
import { retryQuery } from '@/lib/dbRetryHelper';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const ptk_id = searchParams.get('ptk_id');
        const rombongan_belajar_id = searchParams.get('rombongan_belajar_id');

        const sql = getDbClient();

        // 1. Get active semester
        const activeSemester = await sql`
            SELECT semester_id FROM semester WHERE periode_aktif = '1' LIMIT 1
        `;
        const activeSemesterId = activeSemester.length > 0 ? activeSemester[0].semester_id : '20251';

        // 2. Get classes (filtered if ptk_id provided, all if not)
        const classes = await retryQuery(async () => {
            const query = ptk_id 
                ? sql`
                    SELECT rombongan_belajar_id, nm_kelas, tingkat_pendidikan_id
                    FROM tabel_kelas
                    WHERE ptk_id = ${ptk_id} 
                      AND semester_id = ${activeSemesterId}
                      AND jenis_rombel = 1
                    ORDER BY nm_kelas
                  `
                : sql`
                    SELECT rombongan_belajar_id, nm_kelas, tingkat_pendidikan_id
                    FROM tabel_kelas
                    WHERE semester_id = ${activeSemesterId}
                      AND jenis_rombel = 1
                    ORDER BY nm_kelas
                  `;
            
            const rows = await query;
            return rows.sort((a: any, b: any) => 
                a.nm_kelas.localeCompare(b.nm_kelas, undefined, { numeric: true, sensitivity: 'base' })
            );
        });

        if (classes.length === 0) {
            return NextResponse.json({ success: true, classes: [], message: 'Anda bukan wali kelas di semester ini.' });
        }

        const selectedRombelId = rombongan_belajar_id || classes[0].rombongan_belajar_id;
        const selectedClass = classes.find((c: any) => c.rombongan_belajar_id === selectedRombelId);

        if (!selectedClass) {
            return NextResponse.json({ error: 'Class not found or unauthorized' }, { status: 404 });
        }

        // 3. Get Students and their Notes status
        const studentsWithNotes = await retryQuery(async () => {
            return await sql`
                SELECT 
                    s.peserta_didik_id, 
                    s.nm_siswa, 
                    s.nis,
                    s.nisn,
                    cw.deskripsi as catatan,
                    CASE WHEN cw.deskripsi IS NOT NULL AND cw.deskripsi != '-' AND cw.deskripsi != '' THEN true ELSE false END as has_note
                FROM tabel_siswa s
                JOIN tabel_anggotakelas ak ON s.peserta_didik_id = ak.peserta_didik_id
                LEFT JOIN tabel_cat_wali cw ON s.peserta_didik_id = cw.peserta_didik_id AND cw.semester_id = ${activeSemesterId}
                WHERE ak.rombongan_belajar_id = ${selectedRombelId}
                ORDER BY s.nm_siswa ASC
            `;
        });

        return NextResponse.json({
            success: true,
            classes,
            selectedClass,
            students: studentsWithNotes,
            activeSemesterId
        });

    } catch (error) {
        console.error('Guru Catatan Wali API error:', error);
        return NextResponse.json({ error: 'Internal Server Error', details: String(error) }, { status: 500 });
    }
}
