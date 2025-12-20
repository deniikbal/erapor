import { NextRequest, NextResponse } from 'next/server';
import { getDbClient, Semester } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const sql = getDbClient();
    
    const result = await sql`
      SELECT *
      FROM semester
      ORDER BY semester_id DESC
    `;

    const semesterList = result as Semester[];
    return NextResponse.json({ data: semesterList }, { status: 200 });
  } catch (error) {
    console.error('Get semester error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat mengambil data semester' },
      { status: 500 }
    );
  }
}
