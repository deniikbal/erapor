import { NextRequest, NextResponse } from 'next/server';
import { getDbClient } from '@/lib/db';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const peserta_didik_id = searchParams.get('peserta_didik_id');
        let semester_id = searchParams.get('semester_id');

        if (!peserta_didik_id) {
            return NextResponse.json({ error: 'peserta_didik_id is required' }, { status: 400 });
        }

        const sql = getDbClient();

        // Jika semester_id tidak dikirim, ambil yang aktif
        if (!semester_id) {
            const activeSemester = await sql`
                SELECT semester_id FROM semester WHERE periode_aktif = '1' LIMIT 1
            `;
            semester_id = activeSemester.length > 0 ? activeSemester[0].semester_id : null;
        }

        if (!semester_id) {
            return NextResponse.json({ kenaikan: null, tingkat: null });
        }

        const result = await sql`
            SELECT kenaikan, tingkat
            FROM tabel_kenaikan
            WHERE peserta_didik_id = ${peserta_didik_id}
              AND semester_id = ${semester_id}
            LIMIT 1
        `;

        if (result.length === 0) {
            return NextResponse.json({ kenaikan: null, tingkat: null });
        }

        return NextResponse.json({
            kenaikan: result[0].kenaikan,
            tingkat: result[0].tingkat
        });
    } catch (error) {
        console.error('Error fetching kenaikan:', error);
        return NextResponse.json({ kenaikan: null, tingkat: null });
    }
}
