import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import type { Kehadiran } from '@/lib/db';
import { retryQuery } from '@/lib/dbRetryHelper';

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

        // Ambil semester aktif
        const activeSemester = await sql`
            SELECT semester_id FROM semester WHERE periode_aktif = '1' LIMIT 1
        `;
        const activeSemesterId = activeSemester.length > 0 ? activeSemester[0].semester_id : null;

        // Query attendance data - filtered by semester
        const result = activeSemesterId 
            ? await sql`
                SELECT *
                FROM tabel_kehadiran
                WHERE peserta_didik_id = ${peserta_didik_id}
                  AND semester_id = ${activeSemesterId}
                LIMIT 1
              `
            : await sql`
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
