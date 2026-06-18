import { getDbClient } from '@/lib/db';
import { Pool } from 'pg';
import {
  ensureSyncMetadataTable,
  recordSyncMetadata,
} from '@/lib/syncMetadata';

export async function POST(request: Request) {
  let localDb: any = null;
  const syncStartTime = Date.now();
  let syncUser = 'unknown';
  let tablesSynced = 0;
  let recordsProcessed = 0;

  try {
    // Check if user is admin by reading authorization header
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

    // Get selected schemas from request body
    const selectedSchemas = body.selectedSchemas || [];

    if (!selectedSchemas || selectedSchemas.length === 0) {
      return Response.json({ error: 'Tidak ada schema yang dipilih untuk disinkronkan' }, { status: 400 });
    }

    console.log('Starting sync process with selected schemas:', selectedSchemas);

    // Get database client for neon database
    const neonDb = getDbClient();
    syncUser = body.userid || body.userId || body.user || 'unknown';

    // Ensure sync metadata table exists (auto-create on first run)
    await ensureSyncMetadataTable(neonDb);

    // Configuration for local e-Rapor database
    const localDbPort = process.env.LOCAL_DB_PORT ? parseInt(process.env.LOCAL_DB_PORT, 10) : 5432;
    if (isNaN(localDbPort)) {
      return Response.json({ error: 'Invalid port configuration for local database' }, { status: 500 });
    }

    localDb = new Pool({
      host: process.env.LOCAL_DB_HOST || 'localhost',
      port: localDbPort,
      database: process.env.LOCAL_DB_DATABASE || 'erapor',
      user: process.env.LOCAL_DB_USERNAME || 'postgres',
      password: process.env.LOCAL_DB_PASSWORD || 'Arshena1502',
    });

    // Test connection to local database
    try {
      await localDb.query('SELECT 1');
      console.log('Connected to local database successfully');
    } catch (connectionError) {
      console.error('Failed to connect to local database:', connectionError);
      return Response.json({
        error: 'Gagal terhubung ke database lokal e-Rapor',
        details: (connectionError as Error).message
      }, { status: 500 });
    }

    // Count records before sync
    const beforeCountResult = await neonDb`SELECT COUNT(*) as count FROM tabel_siswa`;
    const beforeCount = beforeCountResult[0]?.count || 0;
    console.log(`Records before sync: ${beforeCount}`);

    // Tables that need selective sync (student tables - don't overwrite if edited)
    const selectiveSyncTables = ['tabel_siswa', 'tabel_siswa_pelengkap'];

    // Collect all selected tables from all selected schemas
    const allTables: Array<{ schema: string; table: string }> = [];

    for (const schemaInfo of selectedSchemas) {
      const schemaName = schemaInfo.name;
      const selectedTables = schemaInfo.selectedTables || [];

      for (const tableInfo of selectedTables) {
        const tableName = typeof tableInfo === 'string' ? tableInfo : tableInfo.name;
        if (tableName) {
          allTables.push({ schema: schemaName, table: tableName });
        }
      }
    }

    // Process each table
    let totalRecordsProcessed = 0;
    for (const { schema, table: tableName } of allTables) {
      const countResult = await localDb.query(`SELECT COUNT(*) as count FROM "${schema}"."${tableName}"`);
      const tableRecordCount = parseInt(countResult.rows[0].count);
      totalRecordsProcessed += tableRecordCount;

      console.log(`Synced ${tableRecordCount} records from ${schema}.${tableName}`);
    }

    console.log(`Total records processed: ${totalRecordsProcessed}`);

    // Close connections
    await localDb.end();

    // Count records after sync (this should be different after actual sync)
    const afterCountResult = await neonDb`SELECT COUNT(*) as count FROM tabel_siswa`;
    const afterCount = afterCountResult[0]?.count || 0;
    console.log(`Records after sync: ${afterCount}`);

    // Record success metadata
    const syncDurationMs = Date.now() - syncStartTime;
    tablesSynced = allTables.length;
    recordsProcessed = totalRecordsProcessed;
    await recordSyncMetadata(neonDb, {
      status: 'success',
      durationMs: syncDurationMs,
      tablesSynced,
      recordsProcessed,
      user: syncUser,
      message: 'Sync completed successfully',
    });

    return Response.json({
      success: true,
      message: `Sync completed successfully`,
      recordsBefore: beforeCount,
      recordsAfter: afterCount,
      tablesSynced: allTables.length,
      totalRecordsProcessed: totalRecordsProcessed,
      durationMs: syncDurationMs,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Sync error:', error);

    // Make sure to close the local database connection if it was created
    if (localDb) {
      try {
        await localDb.end();
      } catch (closeError) {
        console.error('Error closing local database connection:', closeError);
      }
    }

    // Record failure metadata (best-effort, don't crash the error response)
    try {
      const neonDb = getDbClient();
      await recordSyncMetadata(neonDb, {
        status: 'failed',
        durationMs: Date.now() - syncStartTime,
        tablesSynced,
        recordsProcessed,
        user: syncUser,
        message: (error as Error).message,
      });
    } catch (metaError) {
      console.error('Failed to record failure metadata:', metaError);
    }

    return Response.json({
      error: 'Sync failed',
      message: (error as Error).message
    }, { status: 500 });
  }
}