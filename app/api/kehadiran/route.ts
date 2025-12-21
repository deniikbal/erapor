import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import type { Kehadiran } from '@/lib/db';

const sql = neon(process.env.DATABASE_URL!);

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

        // Query attendance data - get ALL columns first to see what's available
        const result = await sql`
      SELECT *
      FROM tabel_kehadiran
      WHERE peserta_didik_id = ${peserta_didik_id}
      LIMIT 1
    `;

        if (result.length === 0) {
            // Return zero values if no attendance data found
            return NextResponse.json({
                peserta_didik_id,
                sakit: 0,
                izin: 0,
                alpha: 0
            });
        }

        // Extract the first row to see available columns
        const row = result[0];

        // Try different possible column names for "tanpa keterangan"
        const alpha = row.alpha ?? row.tanpa_keterangan ?? row.alpa ?? row.tk ?? 0;

        const kehadiranData: Kehadiran = {
            peserta_didik_id: row.peserta_didik_id,
            sakit: row.sakit ?? 0,
            izin: row.izin ?? 0,
            alpha: alpha
        };

        return NextResponse.json(kehadiranData);
    } catch (error) {
        console.error('Error fetching kehadiran:', error);

        // Return default values on error
        const { searchParams } = new URL(request.url);
        const peserta_didik_id = searchParams.get('peserta_didik_id');

        return NextResponse.json({
            peserta_didik_id: peserta_didik_id || '',
            sakit: 0,
            izin: 0,
            alpha: 0
        });
    }
}
