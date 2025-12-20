import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    return NextResponse.json({ 
      success: true, 
      message: 'Sync endpoint is accessible',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Test sync error:', error);
    return NextResponse.json({ 
      error: 'Test failed', 
      message: (error as Error).message 
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    // Simple test without database connections
    const authHeader = request.headers.get('Authorization');
    const requestBody = await request.text();
    let body;
    
    try {
      body = requestBody ? JSON.parse(requestBody) : {};
    } catch (e) {
      return Response.json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }

    // Check if user is admin using the body data
    if (!body || !body.level || body.level !== 'Admin') {
      return Response.json({ error: 'Unauthorized - Admin access required' }, { status: 401 });
    }
    
    return Response.json({ 
      success: true, 
      message: 'Sync would start now (test mode)',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Sync error:', error);
    return Response.json({ 
      error: 'Sync failed', 
      message: (error as Error).message 
    }, { status: 500 });
  }
}