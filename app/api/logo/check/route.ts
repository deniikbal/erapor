import { NextResponse } from 'next/server';
import { getDbClient } from '@/lib/db';

export async function GET() {
  try {
    const sql = getDbClient();

    console.log('Checking tambah.logo_ttdkepsek...');

    // Check logo_ttdkepsek structure in schema tambah
    const logoStructure = await sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'tambah' AND table_name = 'logo_ttdkepsek'
      ORDER BY ordinal_position
    `;

    console.log('tambah.logo_ttdkepsek structure:', logoStructure);

    // Check tabel_sekolah structure (public schema)
    const sekolahStructure = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'tabel_sekolah'
      ORDER BY ordinal_position
    `;

    console.log('public.tabel_sekolah structure:', sekolahStructure);

    // Sample data from logo_ttdkepsek
    const logoSample = await sql`
      SELECT * FROM tambah.logo_ttdkepsek LIMIT 5
    `;

    console.log('Logo sample:', logoSample);

    // Sample data from tabel_sekolah
    const sekolahSample = await sql`
      SELECT * FROM public.tabel_sekolah LIMIT 1
    `;

    console.log('Sekolah sample:', sekolahSample);

    return NextResponse.json({
      schema: 'tambah',
      tableName: 'logo_ttdkepsek',
      logoStructure,
      logoSample,
      sekolahStructure,
      sekolahSample,
    });
  } catch (error) {
    console.error('Check logo error:', error);
    return NextResponse.json(
      { error: 'Error checking database structure', details: String(error) },
      { status: 500 }
    );
  }
}
