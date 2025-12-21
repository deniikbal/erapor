import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export async function GET(request: NextRequest) {
    try {
        // 1. Check table structure
        const columns = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'tabel_kehadiran'
      ORDER BY ordinal_position
    `;

        // 2. Get sample data
        const sampleData = await sql`
      SELECT * FROM tabel_kehadiran 
      LIMIT 5
    `;

        return NextResponse.json({
            success: true,
            columns: columns,
            sampleData: sampleData,
            totalColumns: columns.length,
            totalSamples: sampleData.length
        });
    } catch (error) {
        console.error('Error checking table:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Failed to check table structure',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}
