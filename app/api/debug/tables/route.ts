import { NextResponse } from 'next/server';
import { getDbClient } from '@/lib/db';

export async function GET() {
  try {
    const sql = getDbClient();
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
    
    return NextResponse.json({ tables: tables.map(t => t.table_name) });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
