import { NextResponse } from 'next/server';
import { getDbClient } from '@/lib/db';

export async function GET() {
  try {
    const sql = getDbClient();
    const result = await sql`
      SELECT 
        d.id_dimensi, 
        COALESCE(d.nama_dimensi, '') as nama_dimensi, 
        s.id_subdimensi, 
        s.nama_subdimensi
      FROM dpl_subdimensi s
      LEFT JOIN profil_lulusan d ON s.id_dimensi = d.id_dimensi
      ORDER BY d.urut ASC NULLS LAST, s.urut ASC NULLS LAST
    `;
    
    return NextResponse.json({ subdimensi: result }, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching referensi subdimensi:', error);
    return NextResponse.json(
      { error: `Gagal mengambil data referensi: ${error.message}` },
      { status: 500 }
    );
  }
}
