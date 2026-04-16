import { NextRequest, NextResponse } from 'next/server';
import { getDbClient } from '@/lib/db';

/**
 * GET /api/semester/active
 * Mengambil data semester yang sedang aktif (periode_aktif = '1')
 */
export async function GET() {
  try {
    const sql = getDbClient();
    
    // Ambil semester yang aktif
    const result = await sql`
      SELECT *
      FROM semester
      WHERE periode_aktif = '1'
      LIMIT 1
    `;

    if (result.length === 0) {
      // Jika tidak ada yang aktif, ambil yang paling baru berdasarkan semester_id
      const fallback = await sql`
        SELECT *
        FROM semester
        ORDER BY semester_id DESC
        LIMIT 1
      `;
      
      return NextResponse.json({ 
        data: fallback.length > 0 ? fallback[0] : null,
        message: 'No active semester found, showing latest.' 
      }, { status: 200 });
    }

    return NextResponse.json({ data: result[0] }, { status: 200 });
  } catch (error) {
    console.error('Get active semester error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat mengambil data semester aktif' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/semester/active
 * Mengatur semester aktif baru
 */
export async function POST(request: NextRequest) {
  try {
    const { semester_id } = await request.json();

    if (!semester_id) {
      return NextResponse.json(
        { error: 'Semester ID harus diisi' },
        { status: 400 }
      );
    }

    const sql = getDbClient();

    // Gunakan transaksi untuk memastikan konsistensi
    // Set SEMUA menjadi '0' dulu
    await sql`
      UPDATE semester
      SET periode_aktif = '0'
    `;

    // Set yang terpilih menjadi '1'
    const result = await sql`
      UPDATE semester
      SET periode_aktif = '1'
      WHERE semester_id = ${semester_id}
      RETURNING *
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Semester ID tidak ditemukan' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'Semester aktif berhasil diperbarui',
      data: result[0]
    }, { status: 200 });
  } catch (error) {
    console.error('Set active semester error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat menyimpan pengaturan semester aktif' },
      { status: 500 }
    );
  }
}
