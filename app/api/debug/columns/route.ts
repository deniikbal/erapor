import { NextResponse } from 'next/server';
import { getDbClient } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tableName = searchParams.get('table');
    
    if (!tableName) {
      return NextResponse.json({ error: 'Table name required' }, { status: 400 });
    }

    const sql = getDbClient();
    const columns = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = ${tableName}
    `;
    
    return NextResponse.json({ table: tableName, columns });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
