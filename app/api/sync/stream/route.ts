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

                // Sync each table with forced sync (truncate and insert)
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
                        // Always use forced sync: truncate and insert fresh data
                        const recordCount = await syncForcedTable(localDb, neonDb, tableName, schema);

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

    // Get primary key from LOCAL database (not Neon)
    const primaryKey = await getPrimaryKeyFromLocal(localDb, tableName, schema);
    console.log(`Using primary key column: ${primaryKey} for table ${tableName}`);

    // Get all data from local database
    const localDataResult = await localDb.query(`SELECT * FROM "${schema}"."${tableName}"`);
    const localData = localDataResult.rows;

    if (localData.length === 0) {
        console.log(`No data found in local ${schema}.${tableName}, skipping...`);
        return 0;
    }

    // Process each record selectively
    let syncedCount = 0;
    for (const record of localData) {
        const synced = await syncSingleRecord(neonDb, tableName, record, primaryKey);
        if (synced) syncedCount++;
    }

    console.log(`Successfully synced ${syncedCount} out of ${localData.length} records in ${schema}.${tableName}`);
    return syncedCount;
}

// Function to sync tables with forced policy (all other tables)
async function syncForcedTable(localDb: Pool, neonDb: any, tableName: string, schema: string = 'public'): Promise<number> {
    console.log(`Starting forced sync for table: ${schema}.${tableName}`);

    try {
        // Check if table exists in Neon database first
        const tableExistsResult = await neonDb.query(`
            SELECT COUNT(*) as count FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = $1
        `, [tableName]);

        const tableExists = parseInt(tableExistsResult[0]?.count || '0') > 0;
        console.log(`Check: Table "${tableName}" exists in Neon: ${tableExists}`);

        if (!tableExists) {
            console.warn(`⚠️  Table "${tableName}" does not exist in Neon database`);
            console.log(`📝 Auto-creating table "${tableName}" from local database structure...`);

            // Auto-create the table based on local database structure
            await createTableFromLocal(localDb, neonDb, tableName, schema);

            console.log(`✅ Table "${tableName}" created successfully in Neon`);
        }

        // Get all data from local database
        const localDataResult = await localDb.query(`SELECT * FROM "${schema}"."${tableName}"`);
        const localData = localDataResult.rows;

        if (localData.length === 0) {
            console.log(`No data found in local ${schema}.${tableName}, table exists but is empty`);
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

// Function to create table in Neon based on local database structure
async function createTableFromLocal(localDb: Pool, neonDb: any, tableName: string, schema: string = 'public') {
    console.log(`Fetching table structure for "${schema}"."${tableName}" from local database...`);

    // Get column information from local database
    const columnsResult = await localDb.query(`
        SELECT 
            column_name,
            data_type,
            character_maximum_length,
            numeric_precision,
            numeric_scale,
            is_nullable,
            column_default
        FROM information_schema.columns
        WHERE table_schema = $1 AND table_name = $2
        ORDER BY ordinal_position
    `, [schema, tableName]);

    if (columnsResult.rows.length === 0) {
        throw new Error(`No columns found for table ${schema}.${tableName}`);
    }

    // Build CREATE TABLE statement
    const columnDefinitions = columnsResult.rows.map((col: any) => {
        let def = `"${col.column_name}" ${mapDataType(col)}`;

        if (col.is_nullable === 'NO') {
            def += ' NOT NULL';
        }

        // Skip default values - they cause SQL syntax errors with functions
        // if (col.column_default) {
        //     let defaultVal = col.column_default.replace(/::[\w\s()]+/g, '');
        //     def += ` DEFAULT ${defaultVal}`;
        // }

        return def;
    });

    const createTableSQL = `CREATE TABLE "${tableName}" (${columnDefinitions.join(', ')})`;

    console.log(`Executing: ${createTableSQL.substring(0, 150)}...`);

    try {
        await neonDb.query(createTableSQL, []);
        console.log(`✅ Table "${tableName}" created with ${columnsResult.rows.length} columns`);
    } catch (createError: any) {
        console.error('Error creating table:', createError.message);
        throw new Error(`Failed to create table ${tableName}: ${createError.message}`);
    }
}

// Map PostgreSQL data types from local to Neon-compatible types
function mapDataType(column: any): string {
    const dataType = column.data_type.toLowerCase();

    // Handle character types with length
    if (dataType === 'character varying' || dataType === 'varchar') {
        return column.character_maximum_length
            ? `VARCHAR(${column.character_maximum_length})`
            : 'TEXT';
    }

    if (dataType === 'character' || dataType === 'char') {
        return column.character_maximum_length
            ? `CHAR(${column.character_maximum_length})`
            : 'CHAR(1)';
    }

    // Handle numeric types with precision
    if (dataType === 'numeric' || dataType === 'decimal') {
        if (column.numeric_precision && column.numeric_scale) {
            return `NUMERIC(${column.numeric_precision},${column.numeric_scale})`;
        }
        return 'NUMERIC';
    }

    // Common type mappings
    const typeMap: Record<string, string> = {
        'integer': 'INTEGER',
        'bigint': 'BIGINT',
        'smallint': 'SMALLINT',
        'boolean': 'BOOLEAN',
        'text': 'TEXT',
        'date': 'DATE',
        'timestamp without time zone': 'TIMESTAMP',
        'timestamp with time zone': 'TIMESTAMPTZ',
        'time without time zone': 'TIME',
        'uuid': 'UUID',
        'json': 'JSON',
        'jsonb': 'JSONB',
        'real': 'REAL',
        'double precision': 'DOUBLE PRECISION',
        'bytea': 'BYTEA'
    };

    return typeMap[dataType] || dataType.toUpperCase();
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

async function syncSingleRecord(neonDb: any, tableName: string, localRecord: any, primaryKey: string) {
    const primaryKeyValue = localRecord[primaryKey];

    if (!primaryKeyValue) {
        console.log(`Skipping record without primary key '${primaryKey}' in ${tableName}`);
        return false;
    }

    // Get the record from Neon if it exists - use .query() for parameterized statements
    const selectQuery = `SELECT "${primaryKey}", is_locally_edited FROM "${tableName}" WHERE "${primaryKey}" = $1`;
    const neonRecordResult = await neonDb.query(selectQuery, [primaryKeyValue]);

    if (neonRecordResult.length === 0) {
        // Record doesn't exist in Neon, insert it
        await insertRecord(neonDb, tableName, localRecord, primaryKey);
        return true;
    } else {
        // Record exists, check if it was edited locally in Neon
        const neonRecord = neonRecordResult[0];

        if (neonRecord.is_locally_edited) {
            console.log(`Record ${primaryKeyValue} in ${tableName} was edited in Neon, skipping sync`);
            // Update the sync timestamp but don't overwrite the data
            const updateQuery = `UPDATE "${tableName}" SET last_local_sync = CURRENT_TIMESTAMP WHERE "${primaryKey}" = $1`;
            await neonDb.query(updateQuery, [primaryKeyValue]);
            return false;
        } else {
            // Record wasn't edited in Neon, safe to sync from local
            await updateRecord(neonDb, tableName, primaryKeyValue, localRecord, primaryKey);
            return true;
        }
    }
}

async function insertRecord(neonDb: any, tableName: string, record: any, primaryKey: string) {
    const columns = Object.keys(record);
    const values = Object.values(record);

    // Add sync tracking values
    const insertColumns = [...columns, 'is_locally_edited', 'last_local_sync'];
    const insertValues = [...values, false, new Date()];

    await executeDynamicInsert(neonDb, tableName, insertColumns, insertValues);
}

async function updateRecord(neonDb: any, tableName: string, primaryKeyValue: any, record: any, primaryKey: string) {
    const columns = Object.keys(record);

    // Build SET clause for all columns except primary key and sync columns
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

// Get primary key from Neon database (legacy function, kept for compatibility)
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

// Get primary key from LOCAL database (source of truth)
async function getPrimaryKeyFromLocal(localDb: Pool, tableName: string, schema: string = 'public') {
    const result = await localDb.query(`
        SELECT kcu.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu 
          ON tc.constraint_name = kcu.constraint_name
        WHERE tc.table_schema = $1
          AND tc.table_name = $2
          AND tc.constraint_type = 'PRIMARY KEY'
        LIMIT 1
    `, [schema, tableName]);

    if (result.rows.length > 0) {
        return result.rows[0].column_name;
    }

    // Fallback: try common primary key column names
    const fallbackColumns = ['peserta_didik_id', 'nis', 'nisn', 'id'];
    const checkResult = await localDb.query(`SELECT * FROM "${schema}"."${tableName}" LIMIT 1`);

    if (checkResult.rows.length > 0) {
        const record = checkResult.rows[0];
        for (const col of fallbackColumns) {
            if (record.hasOwnProperty(col) && record[col] !== null && record[col] !== undefined) {
                console.log(`Using fallback primary key column: ${col} for table ${tableName}`);
                return col;
            }
        }
    }

    console.warn(`No primary key found for ${tableName}, defaulting to 'id'`);
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

    // Batch insert for better performance
    const BATCH_SIZE = 500; // Insert 250 records at a time (increased from 100 for speed)
    const batches = [];

    for (let i = 0; i < filteredData.length; i += BATCH_SIZE) {
        batches.push(filteredData.slice(i, i + BATCH_SIZE));
    }

    console.log(`Inserting ${filteredData.length} records in ${batches.length} batches of up to ${BATCH_SIZE} records each`);

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];

        if (batch.length === 0) continue;

        // Get columns from first row (all rows should have same columns)
        const rowColumns = Object.keys(batch[0]);
        const columnsList = rowColumns.map(col => `"${col}"`).join(', ');

        // Build multi-row VALUES clause
        const placeholders: string[] = [];
        const allValues: any[] = [];
        let paramIndex = 1;

        for (const row of batch) {
            const rowPlaceholders = rowColumns.map(() => `$${paramIndex++}`);
            placeholders.push(`(${rowPlaceholders.join(', ')})`);

            // Add values in same order as columns
            rowColumns.forEach(col => {
                allValues.push(row[col]);
            });
        }

        // Execute batch insert with multi-row VALUES
        const query = `INSERT INTO "${tableName}" (${columnsList}) VALUES ${placeholders.join(', ')}`;

        try {
            await neonDb.query(query, allValues);
            console.log(`Batch ${batchIndex + 1}/${batches.length}: Inserted ${batch.length} records`);
        } catch (error) {
            console.error(`Error inserting batch ${batchIndex + 1}:`, error);
            throw error;
        }
    }

    console.log(`✓ Successfully inserted all ${filteredData.length} records into ${tableName}`);
}
