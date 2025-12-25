import { NextRequest, NextResponse } from 'next/server';
import { getDbClient } from '@/lib/db';

export async function GET() {
    try {
        const sql = await getDbClient();

        const mapel = await sql`
            SELECT 
                mata_pelajaran_id,
                nm_mapel,
                nm_ringkas
            FROM tabel_mapel
            ORDER BY nm_mapel ASC
        `;

        return NextResponse.json({ mapel });
    } catch (error) {
        console.error('Error fetching mapel:', error);
        return NextResponse.json(
            { error: 'Failed to fetch mapel data' },
            { status: 500 }
        );
    }
}

export async function PUT(request: NextRequest) {
    try {
        const body = await request.json();
        const { mata_pelajaran_id, nm_mapel, nm_ringkas } = body;

        if (!mata_pelajaran_id) {
            return NextResponse.json(
                { error: 'mata_pelajaran_id is required' },
                { status: 400 }
            );
        }

        const sql = await getDbClient();

        await sql`
            UPDATE tabel_mapel
            SET 
                nm_mapel = ${nm_mapel},
                nm_ringkas = ${nm_ringkas}
            WHERE mata_pelajaran_id = ${mata_pelajaran_id}
        `;

        return NextResponse.json({
            success: true,
            message: 'Data mapel berhasil diupdate'
        });
    } catch (error) {
        console.error('Error updating mapel:', error);
        return NextResponse.json(
            { error: 'Failed to update mapel data' },
            { status: 500 }
        );
    }
}
