import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const peserta_didik_id = searchParams.get('peserta_didik_id');

        // 1. Cek semester aktif
        const activeSemester = await sql`
            SELECT semester_id, nama_semester, periode_aktif FROM semester WHERE periode_aktif = '1' LIMIT 1
        `;

        // 2. Cek kolom tabel
        const columns = await sql`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'tabel_cat_wali'
            ORDER BY ordinal_position
        `;

        // 3. Cek total data di tabel
        const totalRows = await sql`
            SELECT COUNT(*) as total FROM tabel_cat_wali
        `;

        // 4. Cek sample data (5 baris pertama)
        const sampleData = await sql`
            SELECT * FROM tabel_cat_wali LIMIT 5
        `;

        // 5. Jika peserta_didik_id dikirim, cek spesifik
        let specificData = null;
        let specificAllSemesters = null;
        if (peserta_didik_id) {
            specificData = await sql`
                SELECT * FROM tabel_cat_wali WHERE peserta_didik_id = ${peserta_didik_id}
            `;
            // Cek semua semester untuk siswa ini
            specificAllSemesters = await sql`
                SELECT semester_id, peserta_didik_id, 
                       SUBSTRING(CAST(deskripsi AS TEXT), 1, 100) as deskripsi_preview
                FROM tabel_cat_wali 
                WHERE peserta_didik_id = ${peserta_didik_id}
            `;
        }

        return NextResponse.json({
            activeSemester: activeSemester[0] || null,
            tableColumns: columns.map((c: any) => `${c.column_name} (${c.data_type})`),
            totalRows: totalRows[0]?.total,
            sampleData: sampleData.map((row: any) => {
                const obj: any = {};
                for (const key of Object.keys(row)) {
                    const val = row[key];
                    obj[key] = typeof val === 'string' && val.length > 80 
                        ? val.substring(0, 80) + '...' 
                        : val;
                }
                return obj;
            }),
            specificData: specificData,
            specificAllSemesters: specificAllSemesters,
        });
    } catch (error) {
        return NextResponse.json({ 
            error: String(error),
            stack: error instanceof Error ? error.stack : undefined
        }, { status: 500 });
    }
}
