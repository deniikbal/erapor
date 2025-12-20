import { NextRequest, NextResponse } from 'next/server';
import { loginUser } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

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

    return NextResponse.json({ user }, { status: 200 });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan yang tidak terduga' },
      { status: 500 }
    );
  }
}
