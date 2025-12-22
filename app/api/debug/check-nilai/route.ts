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

        // Get all nilai entries (without DISTINCT ON)
        const allNilai = await sql`
            SELECT 
                n.mata_pelajaran_id,
                n.nilai_peng,
                n.nilai_ket,
                m.nm_lokal as nama_mapel,
                k.nm_kelas,
                k.jenis_rombel,
                k.tingkat_pendidikan_id
            FROM tabel_nilaiakhir n
            LEFT JOIN tabel_anggotakelas ak ON n.anggota_rombel_id = ak.anggota_rombel_id
            LEFT JOIN tabel_kelas k ON ak.rombongan_belajar_id = k.rombongan_belajar_id
            LEFT JOIN tabel_map_mapelk2013 m ON n.mata_pelajaran_id = m.mata_pelajaran_id
            WHERE ak.peserta_didik_id = ${peserta_didik_id}
                AND n.semester_id = '20251'
            ORDER BY m.nm_lokal, k.jenis_rombel DESC
        `;

        // Get nilai with DISTINCT ON (current implementation)
        const distinctNilai = await sql`
            SELECT DISTINCT ON (n.mata_pelajaran_id)
                n.mata_pelajaran_id,
                n.nilai_peng,
                m.nm_lokal as nama_mapel,
                k.jenis_rombel
            FROM tabel_nilaiakhir n
            LEFT JOIN tabel_anggotakelas ak ON n.anggota_rombel_id = ak.anggota_rombel_id
            LEFT JOIN tabel_kelas k ON ak.rombongan_belajar_id = k.rombongan_belajar_id
            LEFT JOIN tabel_map_mapelk2013 m ON n.mata_pelajaran_id = m.mata_pelajaran_id
            WHERE ak.peserta_didik_id = ${peserta_didik_id}
                AND n.semester_id = '20251'
            ORDER BY 
                n.mata_pelajaran_id,
                k.jenis_rombel DESC NULLS LAST
        `;

        // Group all nilai by mapel
        const groupedByMapel = allNilai.reduce((acc: any, curr: any) => {
            const mapelId = curr.mata_pelajaran_id;
            if (!acc[mapelId]) {
                acc[mapelId] = {
                    nama_mapel: curr.nama_mapel,
                    entries: []
                };
            }
            acc[mapelId].entries.push({
                nilai: curr.nilai_peng,
                kelas: curr.nm_kelas,
                jenis_rombel: curr.jenis_rombel
            });
            return acc;
        }, {});

        return NextResponse.json({
            student_id: peserta_didik_id,
            total_nilai_entries: allNilai.length,
            distinct_nilai_count: distinctNilai.length,
            all_nilai: allNilai,
            distinct_nilai: distinctNilai,
            grouped_by_mapel: groupedByMapel
        });

    } catch (error) {
        console.error('Error:', error);
        return NextResponse.json(
            { error: 'Failed to debug nilai', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
