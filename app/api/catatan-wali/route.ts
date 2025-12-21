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

        if (!peserta_didik_id) {
            return NextResponse.json(
                { error: 'peserta_didik_id is required' },
                { status: 400 }
            );
        }

        // Query catatan wali data
        const result = await sql`
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
