import { getDbClient } from '@/lib/db';
import { Pool } from 'pg';

export async function POST(request: Request) {
    const encoder = new TextEncoder();
    let localDb: Pool | null = null;

    const stream = new ReadableStream({
        async start(controller) {
            const sendEvent = (data: any) => {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
            };

            try {
                // Check if user is admin
                const requestBody = await request.text();
                let body;

                try {
                    body = requestBody ? JSON.parse(requestBody) : {};
                } catch (e) {
                    sendEvent({ type: 'error', message: 'Invalid JSON in request body' });
                    controller.close();
                    return;
                }

                // Check if user is admin using the body data
                if (!body || !body.level || body.level !== 'Admin') {
                    sendEvent({ type: 'error', message: 'Unauthorized - Admin access required' });
                    controller.close();
                    return;
                }

                // Get selected schemas from request body
                const selectedSchemas = body.selectedSchemas || [];

                if (!selectedSchemas || selectedSchemas.length === 0) {
                    sendEvent({ type: 'error', message: 'Tidak ada schema yang dipilih untuk disinkronkan' });
                    controller.close();
                    return;
                }

                console.log('Starting sync process with selected schemas:', selectedSchemas);

                // Get database client for neon database
                const neonDb = getDbClient();

                // Configuration for local e-Rapor database
                const localDbPort = process.env.LOCAL_DB_PORT ? parseInt(process.env.LOCAL_DB_PORT, 10) : 5432;
                if (isNaN(localDbPort)) {
                    sendEvent({ type: 'error', message: 'Invalid port configuration for local database' });
                    controller.close();
                    return;
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
                    sendEvent({
                        type: 'error',
                        message: 'Gagal terhubung ke database lokal e-Rapor: ' + (connectionError as Error).message
                    });
                    controller.close();
                    return;
                }

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

                    // Send progress event
                    sendEvent({
                        type: 'progress',
                        schema: schema,
                        table: tableName,
                        records: 0
                    });

                    try {
                        let recordCount = 0;

                        if (selectiveSyncTables.includes(tableName)) {
                            // Selective sync for student tables
                            recordCount = await syncSelectiveTable(localDb, neonDb, tableName, schema);
                        } else {
                            // Forced sync for all other tables
                            recordCount = await syncForcedTable(localDb, neonDb, tableName, schema);
                        }

                        totalRecordsProcessed += recordCount;

                        // Send completion event for this table
                        sendEvent({
                            type: 'complete',
                            schema: schema,
                            table: tableName,
                            records: recordCount
                        });

                        console.log(`Synced ${recordCount} records from ${schema}.${tableName}`);
                    } catch (error) {
                        console.error(`Error syncing ${schema}.${tableName}:`, error);
                        sendEvent({
                            type: 'error',
                            message: `Error syncing ${schema}.${tableName}: ${(error as Error).message}`
                        });
                    }
                }

                console.log(`Total records processed: ${totalRecordsProcessed}`);

                // Close connections
                await localDb.end();
                localDb = null;

                // Send completion event
                sendEvent({
                    type: 'done',
                    tablesSynced: allTables.length,
                    totalRecords: totalRecordsProcessed,
                    timestamp: new Date().toISOString()
                });

                controller.close();
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

                sendEvent({
                    type: 'error',
                    message: (error as Error).message
                });

                controller.close();
            }
        }
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        },
    });
}

// Function to sync tables with selective policy (student tables)
async function syncSelectiveTable(localDb: Pool, neonDb: any, tableName: string, schema: string = 'public'): Promise<number> {
    console.log(`Starting selective sync for table: ${schema}.${tableName}`);

    // Add sync tracking columns if they don't exist
    await ensureSyncColumns(neonDb, tableName);

    // Get all data from local database
    const localDataResult = await localDb.query(`SELECT * FROM "${schema}"."${tableName}"`);
    const localData = localDataResult.rows;

    if (localData.length === 0) {
        console.log(`No data found in local ${schema}.${tableName}, skipping...`);
        return 0;
    }

    // Process each record selectively
    for (const record of localData) {
        await syncSingleRecord(neonDb, tableName, record);
    }

    console.log(`Successfully synced ${localData.length} records in ${schema}.${tableName}`);
    return localData.length;
}

// Function to sync tables with forced policy (all other tables)
async function syncForcedTable(localDb: Pool, neonDb: any, tableName: string, schema: string = 'public'): Promise<number> {
    console.log(`Starting forced sync for table: ${schema}.${tableName}`);

    try {
        // Get all data from local database
        const localDataResult = await localDb.query(`SELECT * FROM "${schema}"."${tableName}"`);
        const localData = localDataResult.rows;

        if (localData.length === 0) {
            console.log(`No data found in local ${schema}.${tableName}, clearing Neon table...`);
            // Delete using raw SQL - table name is safe as it comes from database metadata
            const deleteResult = await neonDb.query(`DELETE FROM "${tableName}"`, []);
            console.log('Delete result:', deleteResult);
            return 0;
        }

        // Clear the table in Neon database
        const clearResult = await neonDb.query(`DELETE FROM "${tableName}"`, []);
        console.log(`Cleared ${tableName}, affected rows:`, clearResult);

        if (localData.length > 0) {
            // Insert all data from local to Neon
            await insertAllData(neonDb, tableName, localData);
        }

        console.log(`Successfully synced ${localData.length} records in ${schema}.${tableName}`);
        return localData.length;
    } catch (error) {
        console.error(`Error syncing forced table ${schema}.${tableName}:`, error);
        throw error;
    }
}

async function ensureSyncColumns(neonDb: any, tableName: string) {
    // Add sync tracking columns if they don't exist
    const syncColumns = [
        { name: 'is_locally_edited', def: 'BOOLEAN DEFAULT FALSE' },
        { name: 'last_local_sync', def: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP' }
    ];

    for (const col of syncColumns) {
        try {
            // Check if column exists first
            const checkResult = await neonDb.query(`SELECT column_name FROM information_schema.columns WHERE table_name = $1 AND column_name = $2`, [tableName, col.name]);

            if (checkResult.length === 0) {
                // Use .query() for ALTER TABLE with raw SQL
                await neonDb.query(`ALTER TABLE "${tableName}" ADD COLUMN ${col.name} ${col.def}`, []);
                console.log(`Added column ${col.name} to ${tableName}`);
            }
        } catch (error) {
            console.log(`Column likely already exists in ${tableName}:`, (error as Error).message);
        }
    }
}

async function syncSingleRecord(neonDb: any, tableName: string, localRecord: any) {
    // Get primary key for the table
    const primaryKey = await getPrimaryKey(neonDb, tableName);
    const primaryKeyValue = localRecord[primaryKey];

    if (!primaryKeyValue) {
        console.log(`Skipping record without primary key in ${tableName}`);
        return;
    }

    // Get the record from Neon if it exists - use .query() for parameterized statements
    const selectQuery = `SELECT "${primaryKey}", is_locally_edited FROM "${tableName}" WHERE "${primaryKey}" = $1`;
    const neonRecordResult = await neonDb.query(selectQuery, [primaryKeyValue]);

    if (neonRecordResult.length === 0) {
        // Record doesn't exist in Neon, insert it
        await insertRecord(neonDb, tableName, localRecord);
    } else {
        // Record exists, check if it was edited locally in Neon
        const neonRecord = neonRecordResult[0];

        if (neonRecord.is_locally_edited) {
            console.log(`Record ${primaryKeyValue} in ${tableName} was edited in Neon, skipping sync`);
            // Update the sync timestamp but don't overwrite the data
            const updateQuery = `UPDATE "${tableName}" SET last_local_sync = CURRENT_TIMESTAMP WHERE "${primaryKey}" = $1`;
            await neonDb.query(updateQuery, [primaryKeyValue]);
        } else {
            // Record wasn't edited in Neon, safe to sync from local
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

    // Build SET clause for all columns except primary key and sync columns
    const primaryKey = await getPrimaryKey(neonDb, tableName);
    const updateColumns = columns
        .filter(col => col !== primaryKey && col !== 'is_locally_edited' && col !== 'last_local_sync');

    if (updateColumns.length === 0) {
        return; // Nothing to update
    }

    // Build UPDATE query with parameterized values
    const setClause = updateColumns.map((col, idx) => `"${col}" = $${idx + 2}`).join(', ');
    const values = [primaryKeyValue, ...updateColumns.map(col => record[col])];

    // Execute using .query() method
    const query = `UPDATE "${tableName}" SET ${setClause}, last_local_sync = CURRENT_TIMESTAMP WHERE "${primaryKey}" = $1`;
    await neonDb.query(query, values);
}



async function executeDynamicInsert(neonDb: any, tableName: string, columns: string[], values: any[]) {
    // Build parameterized query
    const columnsList = columns.map(col => `"${col}"`).join(', ');
    const placeholders = columns.map((_, idx) => `$${idx + 1}`).join(', ');

    const query = `INSERT INTO "${tableName}" (${columnsList}) VALUES (${placeholders})`;

    // Execute with parameters using .query() method
    console.log('Executing INSERT:', query.substring(0, 100) + '...');
    const result = await neonDb.query(query, values);
    console.log('INSERT result:', result);
    return result;
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
