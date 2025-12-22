// Simple API-based database check
// Navigate to: http://localhost:3000/api/debug/check-enrollment?peserta_didik_id=XXX

import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const peserta_didik_id = searchParams.get('peserta_didik_id');

        // If no ID provided, find a GBIM student
        let studentId = peserta_didik_id;

        if (!studentId) {
            const gbimStudent = await sql`
                SELECT DISTINCT s.peserta_didik_id, s.nm_siswa
                FROM tabel_siswa s
                LEFT JOIN tabel_anggotakelas ak ON s.peserta_didik_id = ak.peserta_didik_id
                LEFT JOIN tabel_kelas k ON ak.rombongan_belajar_id = k.rombongan_belajar_id
                WHERE k.nm_kelas LIKE '%GBIM%'
                    AND k.tingkat_pendidikan_id = '12'
                LIMIT 1
            `;

            if (gbimStudent.length === 0) {
                return NextResponse.json({ error: 'No GBIM student found' });
            }

            studentId = gbimStudent[0].peserta_didik_id;
        }

        // Get all class enrollments
        const enrollments = await sql`
            SELECT 
                k.nm_kelas,
                k.jenis_rombel,
                k.tingkat_pendidikan_id,
                ak.rombongan_belajar_id
            FROM tabel_anggotakelas ak
            LEFT JOIN tabel_kelas k ON ak.rombongan_belajar_id = k.rombongan_belajar_id
            WHERE ak.peserta_didik_id = ${studentId}
            ORDER BY k.jenis_rombel, k.nm_kelas
        `;

        // Get nilai distribution
        const nilaiDist = await sql`
            SELECT 
                k.jenis_rombel,
                k.nm_kelas,
                COUNT(*) as jumlah_mapel,
                json_agg(json_build_object(
                    'mapel', m.nm_lokal,
                    'nilai', n.nilai_peng
                )) as mapel_list
            FROM tabel_nilaiakhir n
            LEFT JOIN tabel_anggotakelas ak ON n.anggota_rombel_id = ak.anggota_rombel_id
            LEFT JOIN tabel_kelas k ON ak.rombongan_belajar_id = k.rombongan_belajar_id
            LEFT JOIN tabel_map_mapelk2013 m ON n.mata_pelajaran_id = m.mata_pelajaran_id
            WHERE ak.peserta_didik_id = ${studentId}
                AND n.semester_id = '20251'
            GROUP BY k.jenis_rombel, k.nm_kelas
            ORDER BY k.jenis_rombel
        `;

        return NextResponse.json({
            student_id: studentId,
            enrollments,
            nilai_distribution: nilaiDist
        });

    } catch (error) {
        console.error('Error:', error);
        return NextResponse.json(
            { error: 'Failed to check enrollment', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
