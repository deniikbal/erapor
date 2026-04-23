import { NextResponse } from 'next/server';
import { getDbClient } from '@/lib/db';

export async function GET() {
  const sql = getDbClient();
  const result: Record<string, any> = {};

  try {
    // Cek profil_lulusan
    try {
      const pl = await sql`SELECT * FROM profil_lulusan LIMIT 10`;
      result.profil_lulusan_count = pl.length;
      result.profil_lulusan_sample = pl;
    } catch (e: any) { result.profil_lulusan_error = e.message; }

    // Cek kolom profil_lulusan
    try {
      const cols = await sql`
        SELECT column_name, data_type FROM information_schema.columns 
        WHERE table_name = 'profil_lulusan' ORDER BY ordinal_position
      `;
      result.profil_lulusan_columns = cols.map((c: any) => c.column_name);
    } catch (e: any) { result.profil_lulusan_columns_error = e.message; }

    // Ambil id_dimensi unik dari dpl_subdimensi
    const ids = await sql`SELECT DISTINCT id_dimensi FROM dpl_subdimensi`;
    result.dpl_subdimensi_unique_id_dimensi = ids.map((r: any) => r.id_dimensi);

    // Coba JOIN dpl_subdimensi dengan profil_lulusan
    try {
      const j = await sql`
        SELECT pl.*, s.nama_subdimensi
        FROM profil_lulusan pl
        JOIN dpl_subdimensi s ON pl.id_dimensi = s.id_dimensi
        LIMIT 5
      `;
      result.join_with_profil_lulusan_count = j.length;
      result.join_with_profil_lulusan_sample = j;
    } catch (e: any) { result.join_with_profil_lulusan_error = e.message; }

    // Hasil pencarian sebelumnya sudah menunjukkan tabel yang benar adalah profil_lulusan
    result.info = "Gunakan profil_lulusan untuk relasi dpl_subdimensi.id_dimensi";

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ fatal_error: error.message }, { status: 500 });
  }
}
