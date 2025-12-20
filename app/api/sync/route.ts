import { getDbClient } from '@/lib/db';
import { Pool } from 'pg';

export async function POST(request: Request) {
  let localDb: any = null;

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

      for (const tableName of selectedTables) {
        allTables.push({ schema: schemaName, table: tableName });
      }
    }

    console.log(`Found ${allTables.length} tables to sync:`, allTables);

    // Sync each table according to its sync policy
    let totalRecordsProcessed = 0;

    for (const tableInfo of allTables) {
      const { schema, table: tableName } = tableInfo;
      console.log(`Syncing table: ${schema}.${tableName}`);

      if (selectiveSyncTables.includes(tableName)) {
        // Selective sync for student tables
        await syncSelectiveTable(localDb, neonDb, tableName, schema);
      } else {
        // Forced sync for all other tables
        await syncForcedTable(localDb, neonDb, tableName, schema);
      }

      // Get count of records processed for this table
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

    return Response.json({
      success: true,
      message: `Sync completed successfully`,
      recordsBefore: beforeCount,
      recordsAfter: afterCount,
      tablesSynced: allTables.length,
      totalRecordsProcessed: totalRecordsProcessed,
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

    return Response.json({
      error: 'Sync failed',
      message: (error as Error).message
    }, { status: 500 });
  }
}

// Function to sync tables with selective policy (student tables)
async function syncSelectiveTable(localDb: any, neonDb: any, tableName: string, schema: string = 'public') {
  console.log(`Starting selective sync for table: ${schema}.${tableName}`);

  // Add sync tracking columns if they don't exist
  await ensureSyncColumns(neonDb, tableName);

  // Get all data from local database
  const localDataResult = await localDb.query(`SELECT * FROM "${schema}"."${tableName}"`);
  const localData = localDataResult.rows;

  if (localData.length === 0) {
    console.log(`No data found in local ${schema}.${tableName}, skipping...`);
    return;
  }

  // Process each record selectively
  for (const record of localData) {
    await syncSingleRecord(neonDb, tableName, record);
  }

  console.log(`Successfully synced ${localData.length} records in ${schema}.${tableName}`);
}

// Function to sync tables with forced policy (all other tables)
async function syncForcedTable(localDb: any, neonDb: any, tableName: string, schema: string = 'public') {
  console.log(`Starting forced sync for table: ${schema}.${tableName}`);

  try {
    // Get all data from local database
    const localDataResult = await localDb.query(`SELECT * FROM "${schema}"."${tableName}"`);
    const localData = localDataResult.rows;

    if (localData.length === 0) {
      console.log(`No data found in local ${schema}.${tableName}, clearing Neon table...`);
      await neonDb.query(`DELETE FROM "${tableName}"`, []);
      return;
    }

    // Clear the table in Neon database
    await neonDb.query(`DELETE FROM "${tableName}"`, []);

    if (localData.length > 0) {
      // Insert all data from local to Neon
      await insertAllData(neonDb, tableName, localData);
    }

    console.log(`Successfully synced ${localData.length} records in ${schema}.${tableName}`);
  } catch (error) {
    console.error(`Error syncing forced table ${schema}.${tableName}:`, error);
    // Don't throw, continue with other tables
  }
}

async function ensureSyncColumns(neonDb: any, tableName: string) {
  const syncColumns = [
    { name: 'is_locally_edited', def: 'BOOLEAN DEFAULT FALSE' },
    { name: 'last_local_sync', def: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP' }
  ];

  for (const col of syncColumns) {
    try {
      const checkResult = await neonDb.query(`SELECT column_name FROM information_schema.columns WHERE table_name = $1 AND column_name = $2`, [tableName, col.name]);

      if (checkResult.length === 0) {
        await neonDb.query(`ALTER TABLE "${tableName}" ADD COLUMN ${col.name} ${col.def}`, []);
        console.log(`Added column ${col.name} to ${tableName}`);
      }
    } catch (error) {
      console.log(`Column likely already exists in ${tableName}:`, (error as Error).message);
    }
  }
}

async function syncSingleRecord(neonDb: any, tableName: string, localRecord: any) {
  const primaryKey = await getPrimaryKey(neonDb, tableName);
  const primaryKeyValue = localRecord[primaryKey];

  if (!primaryKeyValue) {
    console.log(`Skipping record without primary key in ${tableName}`);
    return;
  }

  const selectQuery = `SELECT "${primaryKey}", is_locally_edited FROM "${tableName}" WHERE "${primaryKey}" = $1`;
  const neonRecordResult = await neonDb.query(selectQuery, [primaryKeyValue]);

  if (neonRecordResult.length === 0) {
    await insertRecord(neonDb, tableName, localRecord);
  } else {
    const neonRecord = neonRecordResult[0];

    if (neonRecord.is_locally_edited) {
      console.log(`Record ${primaryKeyValue} in ${tableName} was edited in Neon, skipping sync`);
      const updateQuery = `UPDATE "${tableName}" SET last_local_sync = CURRENT_TIMESTAMP WHERE "${primaryKey}" = $1`;
      await neonDb.query(updateQuery, [primaryKeyValue]);
    } else {
      await updateRecord(neonDb, tableName, primaryKeyValue, localRecord);
    }
  }
}

async function insertRecord(neonDb: any, tableName: string, record: any) {
  const columns = Object.keys(record);
  const values = Object.values(record);

  // Add sync tracking values
  const insertColumns = [...columns, 'is_locally_edited', 'last_local_sync'];
  const insertValues = [...values, false, new Date()];

  await executeDynamicInsert(neonDb, tableName, insertColumns, insertValues);
}

async function updateRecord(neonDb: any, tableName: string, primaryKeyValue: any, record: any) {
  const columns = Object.keys(record);
  const primaryKey = await getPrimaryKey(neonDb, tableName);
  const updateColumns = columns
    .filter(col => col !== primaryKey && col !== 'is_locally_edited' && col !== 'last_local_sync');

  if (updateColumns.length === 0) {
    return;
  }

  const setClause = updateColumns.map((col, idx) => `"${col}" = $${idx + 2}`).join(', ');
  const values = [primaryKeyValue, ...updateColumns.map(col => record[col])];

  const query = `UPDATE "${tableName}" SET ${setClause}, last_local_sync = CURRENT_TIMESTAMP WHERE "${primaryKey}" = $1`;
  await neonDb.query(query, values);
}

async function executeDynamicInsert(neonDb: any, tableName: string, columns: string[], values: any[]) {
  // Build parameterized query
  const columnsList = columns.map(col => `"${col}"`).join(', ');
  const placeholders = columns.map((_, idx) => `$${idx + 1}`).join(', ');

  const query = `INSERT INTO "${tableName}" (${columnsList}) VALUES (${placeholders})`;

  await neonDb.query(query, values);
}

async function getPrimaryKey(neonDb: any, tableName: string) {
  const result = await neonDb.query(`SELECT kcu.column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_name = $1 
      AND tc.constraint_type = 'PRIMARY KEY'`, [tableName]);

  if (result.length > 0) {
    return result[0].column_name;
  }

  return 'id';
}

async function insertAllData(neonDb: any, tableName: string, data: any[]) {
  if (data.length === 0) return;

  const structure = await neonDb.query(`SELECT column_name
    FROM information_schema.columns
    WHERE table_name = $1
    ORDER BY ordinal_position`, [tableName]);

  const columns = structure.map((row: any) => row.column_name);

  const filteredData = data.map(row => {
    const filteredRow: any = {};
    columns.forEach((col: string) => {
      if (row.hasOwnProperty(col)) {
        filteredRow[col] = row[col];
      }
    });
    return filteredRow;
  });

  for (const row of filteredData) {
    const rowColumns = Object.keys(row);
    const rowValues = Object.values(row);
    await executeDynamicInsert(neonDb, tableName, rowColumns, rowValues);
  }
}