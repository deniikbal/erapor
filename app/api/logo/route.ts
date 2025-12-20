import { NextRequest, NextResponse } from 'next/server';
import { getDbClient } from '@/lib/db';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export async function GET() {
  try {
    const sql = getDbClient();

    console.log('Fetching logo data...');

    // Get sekolah_id from tabel_sekolah (should be only one)
    const sekolah = await sql`
      SELECT sekolah_id FROM public.tabel_sekolah LIMIT 1
    `;
    
    console.log('Sekolah found:', sekolah.length);

    if (sekolah.length === 0) {
      return NextResponse.json(
        { error: 'Data sekolah tidak ditemukan' },
        { status: 404 }
      );
    }

    const sekolah_id = sekolah[0].sekolah_id;
    console.log('Sekolah ID:', sekolah_id);

    // Get logo data from tambah.logo_ttdkepsek
    try {
      const result = await sql`
        SELECT * FROM tambah.logo_ttdkepsek
        WHERE sekolah_id = ${sekolah_id}
      `;

      console.log('Logo data found:', result.length);

      if (result.length === 0) {
      // Return empty logo data if not exists
        return NextResponse.json({
          logo: {
            sekolah_id,
            logo_pemda: null,
            logo_sek: null,
            ttd_kepsek: null,
            kop_sekolah: null,
          }
        }, { status: 200 });
      }

      return NextResponse.json({ logo: result[0] }, { status: 200 });
    } catch (logoError: any) {
      console.error('Error querying tambah.logo_ttdkepsek:', logoError);
      
      // If schema or table doesn't exist, return empty data
      if (logoError.message?.includes('does not exist')) {
        console.log('Table tambah.logo_ttdkepsek does not exist, returning empty data');
        return NextResponse.json({
          logo: {
            sekolah_id,
            logo_pemda: null,
            logo_sek: null,
            ttd_kepsek: null,
            kop_sekolah: null,
          }
        }, { status: 200 });
      }
      
      throw logoError; // Re-throw if it's a different error
    }
  } catch (error) {
    console.error('Get logo error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat mengambil data logo', details: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const sql = getDbClient();
    const formData = await request.formData();

    console.log('Upload logo request received');

    // Get sekolah_id from form data
    const sekolah_id = formData.get('sekolah_id') as string;
    
    if (!sekolah_id) {
      return NextResponse.json(
        { error: 'Sekolah ID harus diisi' },
        { status: 400 }
      );
    }

    console.log('Sekolah ID from form:', sekolah_id);

    // Ensure logos directory exists
    const logosDir = join(process.cwd(), 'public', 'logos');
    if (!existsSync(logosDir)) {
      await mkdir(logosDir, { recursive: true });
    }

    // Process each file upload
    const uploadedPaths: any = {};

    const fileFields = ['logo_pemda', 'logo_sek', 'ttd_kepsek', 'kop_sekolah'];
    
    for (const field of fileFields) {
      const file = formData.get(field) as File | null;
      
      if (file && file.size > 0) {
        // Generate unique filename using timestamp and random string
        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substring(7);
        const extension = file.name.split('.').pop();
        const filename = `${timestamp}_${randomStr}.${extension}`;
        
        // Save file to public/logos
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const filepath = join(logosDir, filename);
        await writeFile(filepath, buffer);
        
        // Store relative path for database
        uploadedPaths[field] = `logos/${filename}`;
        console.log(`Uploaded ${field}:`, uploadedPaths[field]);
      }
    }

    // Check if record exists in tambah schema
    console.log('Checking if record exists for sekolah_id:', sekolah_id);
    
    const existing = await sql`
      SELECT sekolah_id FROM tambah.logo_ttdkepsek
      WHERE sekolah_id = ${sekolah_id}::uuid
    `;

    console.log('Existing records found:', existing.length);

    if (existing.length > 0) {
      // Update existing record (only update fields that have new uploads)
      console.log('Updating existing record...');
      
      // Build UPDATE query dynamically using conditional updates
      const updates: string[] = [];
      
      if (uploadedPaths.logo_pemda) {
        console.log('Updating logo_pemda:', uploadedPaths.logo_pemda);
        await sql`
          UPDATE tambah.logo_ttdkepsek 
          SET logo_pemda = ${uploadedPaths.logo_pemda}
          WHERE sekolah_id = ${sekolah_id}::uuid
        `;
        updates.push('logo_pemda');
      }
      
      if (uploadedPaths.logo_sek) {
        console.log('Updating logo_sek:', uploadedPaths.logo_sek);
        await sql`
          UPDATE tambah.logo_ttdkepsek 
          SET logo_sek = ${uploadedPaths.logo_sek}
          WHERE sekolah_id = ${sekolah_id}::uuid
        `;
        updates.push('logo_sek');
      }
      
      if (uploadedPaths.ttd_kepsek) {
        console.log('Updating ttd_kepsek:', uploadedPaths.ttd_kepsek);
        await sql`
          UPDATE tambah.logo_ttdkepsek 
          SET ttd_kepsek = ${uploadedPaths.ttd_kepsek}
          WHERE sekolah_id = ${sekolah_id}::uuid
        `;
        updates.push('ttd_kepsek');
      }
      
      if (uploadedPaths.kop_sekolah) {
        console.log('Updating kop_sekolah:', uploadedPaths.kop_sekolah);
        await sql`
          UPDATE tambah.logo_ttdkepsek 
          SET kop_sekolah = ${uploadedPaths.kop_sekolah}
          WHERE sekolah_id = ${sekolah_id}::uuid
        `;
        updates.push('kop_sekolah');
      }
      
      console.log('Updated fields:', updates);
    } else {
      // Insert new record
      console.log('Inserting new record...');
      console.log('Insert data:', {
        sekolah_id,
        logo_pemda: uploadedPaths.logo_pemda || null,
        logo_sek: uploadedPaths.logo_sek || null,
        ttd_kepsek: uploadedPaths.ttd_kepsek || null,
        kop_sekolah: uploadedPaths.kop_sekolah || null,
      });
      
      const result = await sql`
        INSERT INTO tambah.logo_ttdkepsek (
          sekolah_id, 
          logo_pemda, 
          logo_sek, 
          ttd_kepsek, 
          kop_sekolah
        )
        VALUES (
          ${sekolah_id}::uuid,
          ${uploadedPaths.logo_pemda || null},
          ${uploadedPaths.logo_sek || null},
          ${uploadedPaths.ttd_kepsek || null},
          ${uploadedPaths.kop_sekolah || null}
        )
      `;
      
      console.log('Insert result:', result);
    }

    return NextResponse.json({
      message: 'Logo berhasil diupload',
      uploaded: uploadedPaths
    }, { status: 200 });
  } catch (error) {
    console.error('Upload logo error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat upload logo', details: String(error) },
      { status: 500 }
    );
  }
}
