import { NextRequest, NextResponse } from 'next/server';
import { getDbClient, MarginSettings } from '@/lib/db';
import { retryQuery } from '@/lib/dbRetryHelper';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ptk_id = searchParams.get('ptk_id');

    if (!ptk_id) {
      return NextResponse.json(
        { error: 'PTK ID harus diisi' },
        { status: 400 }
      );
    }

    const sql = getDbClient();
    
    const result = await sql`
      SELECT *
      FROM tabel_margin_settings
      WHERE ptk_id = ${ptk_id}
      LIMIT 1
    `;

    if (result.length === 0) {
      // Return default settings if not found
      return NextResponse.json({ 
        data: {
          margin_top: 20,
          margin_bottom: 20,
          margin_left: 20,
          margin_right: 20
        }
      }, { status: 200 });
    }

    const settings = result[0] as MarginSettings;
    return NextResponse.json({ data: settings }, { status: 200 });
  } catch (error) {
    console.error('Get margin settings error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat mengambil data margin settings' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { ptk_id, margin_top, margin_bottom, margin_left, margin_right } = await request.json();

    if (!ptk_id) {
      return NextResponse.json(
        { error: 'PTK ID harus diisi' },
        { status: 400 }
      );
    }

    const sql = getDbClient();
    
    // Check if settings exist
    const existing = await sql`
      SELECT margin_id FROM tabel_margin_settings
      WHERE ptk_id = ${ptk_id}
      LIMIT 1
    `;

    let result;
    if (existing.length > 0) {
      // Update existing
      result = await sql`
        UPDATE tabel_margin_settings
        SET 
          margin_top = ${margin_top},
          margin_bottom = ${margin_bottom},
          margin_left = ${margin_left},
          margin_right = ${margin_right},
          updated_at = NOW()
        WHERE ptk_id = ${ptk_id}
        RETURNING *
      `;
    } else {
      // Insert new
      result = await sql`
        INSERT INTO tabel_margin_settings (ptk_id, margin_top, margin_bottom, margin_left, margin_right)
        VALUES (${ptk_id}, ${margin_top}, ${margin_bottom}, ${margin_left}, ${margin_right})
        RETURNING *
      `;
    }

    return NextResponse.json({ 
      message: 'Margin settings berhasil disimpan',
      data: result[0]
    }, { status: 200 });
  } catch (error) {
    console.error('Save margin settings error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat menyimpan margin settings' },
      { status: 500 }
    );
  }
}
