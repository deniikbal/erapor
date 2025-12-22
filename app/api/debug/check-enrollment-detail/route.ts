import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const peserta_didik_id = searchParams.get('peserta_didik_id');

        if (!peserta_didik_id) {
            return NextResponse.json({ error: 'peserta_didik_id required' }, { status: 400 });
        }

        // 1. Check all class enrollments
        const enrollments = await sql`
            SELECT 
                k.rombongan_belajar_id,
                k.nm_kelas,
                k.jenis_rombel,
                k.tingkat_pendidikan_id,
                ak.anggota_rombel_id
            FROM tabel_anggotakelas ak
            LEFT JOIN tabel_kelas k ON ak.rombongan_belajar_id = k.rombongan_belajar_id
            WHERE ak.peserta_didik_id = ${peserta_didik_id}
            ORDER BY k.jenis_rombel, k.nm_kelas
        `;

        // 2. Check if "EKONOMI" class exists for tingkat 12
        const ekonomiClass = await sql`
            SELECT 
                rombongan_belajar_id,
                nm_kelas,
                jenis_rombel
            FROM tabel_kelas
            WHERE tingkat_pendidikan_id = '12'
                AND (
                    nm_kelas ILIKE '%EKONOMI%'
                    OR nm_kelas ILIKE '%EBIM%'
                )
            ORDER BY nm_kelas
        `;

        // 3. Check all mapel with "EKONOMI" in name
        const ekonomiMapel = await sql`
            SELECT 
                mata_pelajaran_id,
                nm_lokal,
                klp_mpl
            FROM tabel_map_mapelk2013
            WHERE nm_lokal ILIKE '%EKONOMI%'
                AND tingkat_pendidikan_id = '12'
        `;

        // 4. Check if there's ANY nilai with Ekonomi mapel_id for this student
        const ekonomiNilai = await sql`
            SELECT 
                n.mata_pelajaran_id,
                n.nilai_peng,
                m.nm_lokal,
                k.nm_kelas,
                k.jenis_rombel
            FROM tabel_nilaiakhir n
            LEFT JOIN tabel_anggotakelas ak ON n.anggota_rombel_id = ak.anggota_rombel_id
            LEFT JOIN tabel_kelas k ON ak.rombongan_belajar_id = k.rombongan_belajar_id
            LEFT JOIN tabel_map_mapelk2013 m ON n.mata_pelajaran_id = m.mata_pelajaran_id
            WHERE ak.peserta_didik_id = ${peserta_didik_id}
                AND m.nm_lokal ILIKE '%EKONOMI%'
                AND n.semester_id = '20251'
        `;

        return NextResponse.json({
            student_id: peserta_didik_id,
            enrollments: {
                count: enrollments.length,
                data: enrollments
            },
            ekonomi_classes: {
                count: ekonomiClass.length,
                data: ekonomiClass
            },
            ekonomi_mapel_available: {
                count: ekonomiMapel.length,
                data: ekonomiMapel
            },
            ekonomi_nilai: {
                count: ekonomiNilai.length,
                data: ekonomiNilai
            },
            diagnosis: {
                is_enrolled_in_ekonomi_class: enrollments.some(e =>
                    e.nm_kelas && e.nm_kelas.toUpperCase().includes('EKONOMI')
                ),
                ekonomi_nilai_exists: ekonomiNilai.length > 0,
                possible_issue: ekonomiNilai.length === 0
                    ? 'Nilai Ekonomi tidak ditemukan di database. Mungkin belum disinkronisasi dari aplikasi pemerintah.'
                    : 'Nilai Ekonomi ada di database.'
            }
        });

    } catch (error) {
        console.error('Error:', error);
        return NextResponse.json(
            { error: 'Failed to check enrollment', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
