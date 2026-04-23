import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export interface CatatanWali {
    peserta_didik_id: string;
    deskripsi: string;
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const peserta_didik_id = searchParams.get('peserta_didik_id');
        let semester_id = searchParams.get('semester_id');

        if (!peserta_didik_id) {
            return NextResponse.json(
                { error: 'peserta_didik_id is required' },
                { status: 400 }
            );
        }

        // Jika semester_id tidak dikirim, ambil yang aktif
        if (!semester_id) {
            const activeSemester = await sql`
                SELECT semester_id FROM semester WHERE periode_aktif = '1' LIMIT 1
            `;
            semester_id = activeSemester.length > 0 ? activeSemester[0].semester_id : null;
        }

        // Query catatan wali data - filtered by semester
        const result = semester_id
            ? await sql`
                SELECT *
                FROM tabel_cat_wali
                WHERE peserta_didik_id = ${peserta_didik_id}
                  AND semester_id = ${semester_id}
                LIMIT 1
              `
            : await sql`
                SELECT *
                FROM tabel_cat_wali
                WHERE peserta_didik_id = ${peserta_didik_id}
                LIMIT 1
              `;

        if (result.length === 0) {
            // Return default empty note if no data found
            return NextResponse.json({
                peserta_didik_id,
                deskripsi: '-'
            });
        }

        const catatanData: CatatanWali = {
            peserta_didik_id: result[0].peserta_didik_id,
            deskripsi: result[0].deskripsi || '-'
        };

        return NextResponse.json(catatanData);
    } catch (error) {
        console.error('Error fetching catatan wali:', error);

        // Return default values on error
        const { searchParams } = new URL(request.url);
        const peserta_didik_id = searchParams.get('peserta_didik_id');

        return NextResponse.json({
            peserta_didik_id: peserta_didik_id || '',
            deskripsi: '-'
        });
    }
}
