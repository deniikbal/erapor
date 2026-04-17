import { NextRequest, NextResponse } from 'next/server';
import { loginUser } from '@/lib/auth';
import { getDbClient } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { username, password, semester_id } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username dan password harus diisi' },
        { status: 400 }
      );
    }

    const { user, error } = await loginUser(username, password);

    if (error || !user) {
      return NextResponse.json(
        { error: error || 'Login gagal' },
        { status: 401 }
      );
    }

    // Update semester aktif jika semester_id diberikan
    if (semester_id) {
      const sql = getDbClient();
      try {
        // Set semua ke 0 dulu
        await sql`UPDATE semester SET periode_aktif = '0'`;
        // Set yang dipilih ke 1
        await sql`UPDATE semester SET periode_aktif = '1' WHERE semester_id = ${semester_id}`;
      } catch (smsError) {
        console.error('Failed to update active semester during login:', smsError);
        // Kita tidak menghentikan login jika update semester gagal, 
        // tapi log error tersebut untuk debugging.
      }
    }

    return NextResponse.json({ user }, { status: 200 });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan yang tidak terduga' },
      { status: 500 }
    );
  }
}
