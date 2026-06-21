import { getDbClient } from '@/lib/db';
import { Pool } from 'pg';
import crypto from 'crypto';
import {
  ensureSyncMetadataTable,
  recordSyncMetadata,
} from '@/lib/syncMetadata';
import { SELECTIVE_SYNC_TABLES } from '@/lib/syncTables';

export async function POST(request: Request) {
    const encoder = new TextEncoder();
    let localDb: Pool | null = null;
    const syncStartTime = Date.now();
    let syncUser = 'unknown';
    let tablesSynced = 0;
    let recordsProcessed = 0;

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
                syncUser = body.userid || body.userId || body.user || 'unknown';

                // Ensure sync metadata table exists (auto-create on first run)
                await ensureSyncMetadataTable(neonDb);

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

                // Tabel yang menggunakan selective sync (hanya user_login untuk preserve password)
                const selectiveSyncTables = SELECTIVE_SYNC_TABLES;

                for (const tableInfo of allTables) {
                    const { schema, table: tableName } = tableInfo;
                    const isSelective = selectiveSyncTables.includes(tableName);
                    console.log(`Syncing table: ${schema}.${tableName} [${isSelective ? 'SELECTIVE' : 'FORCED'}]`);

                    // Send progress event
                    sendEvent({
                        type: 'progress',
                        schema: schema,
                        table: tableName,
                        records: 0,
                        mode: isSelective ? 'selective' : 'forced'
                    });

                    try {
                        let recordCount: number;
                        if (isSelective) {
                            // Selective sync: cek per record, data yang sudah diedit di web tidak ditimpa
                            recordCount = await syncSelectiveTable(localDb, neonDb, tableName, schema);
                        } else {
                            // Forced sync: hapus semua data lama lalu insert ulang dari lokal
                            recordCount = await syncForcedTable(localDb, neonDb, tableName, schema);
                        }

                        totalRecordsProcessed += recordCount;

                        // Send completion event for this table
                        sendEvent({
                            type: 'complete',
                            schema: schema,
                            table: tableName,
                            records: recordCount,
                            mode: isSelective ? 'selective' : 'forced'
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

                // Record success metadata (best-effort)
                tablesSynced = allTables.length;
                recordsProcessed = totalRecordsProcessed;
                const syncDurationMs = Date.now() - syncStartTime;
                await recordSyncMetadata(neonDb, {
                    status: 'success',
                    durationMs: syncDurationMs,
                    tablesSynced,
                    recordsProcessed,
                    user: syncUser,
                    message: 'Sync completed successfully',
                });

                // Send completion event
                sendEvent({
                    type: 'done',
                    tablesSynced: allTables.length,
                    totalRecords: totalRecordsProcessed,
                    durationMs: syncDurationMs,
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

                // Record failure metadata (best-effort, don't break error response)
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
    console.log(`Using primary key columns: [${primaryKey.join(', ')}] for table ${tableName}`);

    // Get all data from local database
    const localDataResult = await localDb.query(`SELECT * FROM "${schema}"."${tableName}"`);
    const localData = localDataResult.rows;

    if (localData.length === 0) {
        console.log(`No data found in local ${schema}.${tableName}, skipping...`);
        return 0;
    }

    // Process records in large batches for massive performance boost
    const syncedCount = await upsertAllData(neonDb, tableName, localData, primaryKey);

    console.log(`Successfully synced ${syncedCount} records in ${schema}.${tableName} using Bulk UPSERT`);
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

        // Backup data yang ada sebelum dihapus (untuk rollback jika insert gagal)
        let backupData: any[] = [];
        try {
            backupData = await neonDb(`SELECT * FROM "${tableName}"`);
            console.log(`📦 Backed up ${backupData.length} existing records from ${tableName}`);
        } catch (e) {
            console.log(`No existing data to backup in ${tableName}`);
        }

        // Clear the table in Neon database
        const clearResult = await neonDb.query(`DELETE FROM "${tableName}"`, []);
        console.log(`Cleared ${tableName}, affected rows:`, clearResult);

        try {
            if (localData.length > 0) {
                // Insert all data from local to Neon
                await insertAllData(neonDb, tableName, localData);
            }
        } catch (insertError) {
            // Insert gagal — coba restore data backup agar tidak kehilangan data
            console.error(`❌ Insert failed for ${tableName}, attempting to restore backup...`);
            if (backupData.length > 0) {
                try {
                    await insertAllData(neonDb, tableName, backupData);
                    console.log(`✅ Backup restored successfully for ${tableName}`);
                } catch (restoreError) {
                    console.error(`❌ CRITICAL: Failed to restore backup for ${tableName}:`, restoreError);
                }
            }
            throw insertError;
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

async function insertRecord(neonDb: any, tableName: string, localRecord: any, primaryKey: string) {
    const columns = Object.keys(localRecord);
    const values = [...Object.values(localRecord)];

    // Add sync tracking values
    const insertColumns = [...columns, 'is_locally_edited', 'last_local_sync'];
    const insertValues = [...values, false, new Date()];

    // Untuk user_login baru, generate password default dengan hash
    if (tableName === 'user_login' && localRecord.userid && localRecord.level) {
        const defaultPassword = getDefaultPassword(localRecord.userid, localRecord.level);
        const { hash, salt } = generatePasswordHash(defaultPassword);
        const passwordIdx = insertColumns.indexOf('password');
        const saltIdx = insertColumns.indexOf('salt');
        if (passwordIdx !== -1) insertValues[passwordIdx] = hash;
        if (saltIdx !== -1) insertValues[saltIdx] = salt;
        if (passwordIdx === -1) { insertColumns.push('password'); insertValues.push(hash); }
        if (saltIdx === -1) { insertColumns.push('salt'); insertValues.push(salt); }
        console.log(`🔐 Password default untuk user baru: ${localRecord.userid} (${localRecord.level})`);
    }

    await executeDynamicInsert(neonDb, tableName, insertColumns, insertValues);
}

async function updateRecord(neonDb: any, tableName: string, primaryKeyValue: any, localRecord: any, primaryKey: string) {
    const columns = Object.keys(localRecord);

    // Kolom yang tidak boleh di-update
    const excludeColumns = [primaryKey, 'is_locally_edited', 'last_local_sync'];

    // Untuk user_login, jangan update password & salt (agar password yang diubah di web tetap tersimpan)
    if (tableName === 'user_login') {
        excludeColumns.push('password', 'salt');
        console.log(`🔒 Preserving password for existing user: ${primaryKeyValue}`);
    }

    const updateColumns = columns.filter(col => !excludeColumns.includes(col));

    if (updateColumns.length === 0) {
        return; // Nothing to update
    }

    // Build UPDATE query with parameterized values
    const setClause = updateColumns.map((col, idx) => `"${col}" = $${idx + 2}`).join(', ');
    const values = [primaryKeyValue, ...updateColumns.map(col => localRecord[col])];

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
// Returns string[] to support composite primary keys (e.g. peserta_didik_id + semester_id)
async function getPrimaryKeyFromLocal(localDb: Pool, tableName: string, schema: string = 'public'): Promise<string[]> {
    // Khusus user_login, pakai userid sebagai kunci sinkronisasi.
    // Di beberapa database e-Rapor, kolom id pada user_login tidak unik sehingga
    // tidak aman dijadikan PK/ON CONFLICT target. Neon biasanya sudah memakai userid.
    if (tableName === 'user_login') {
        const userIdColumn = await localDb.query(`
            SELECT column_name
            FROM information_schema.columns
            WHERE table_schema = $1 AND table_name = $2 AND column_name = 'userid'
        `, [schema, tableName]);

        if (userIdColumn.rows.length > 0) {
            console.log(`Using fixed primary key column: userid for table user_login`);
            return ['userid'];
        }
    }

    const result = await localDb.query(`
        SELECT kcu.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu 
          ON tc.constraint_name = kcu.constraint_name
        WHERE tc.table_schema = $1
          AND tc.table_name = $2
          AND tc.constraint_type = 'PRIMARY KEY'
        ORDER BY kcu.ordinal_position
    `, [schema, tableName]);

    if (result.rows.length > 0) {
        const keys = result.rows.map((r: any) => r.column_name);
        console.log(`Primary key for ${tableName}: [${keys.join(', ')}]`);
        return keys;
    }

    // Fallback: try common primary key column names
    const fallbackColumns = ['peserta_didik_id', 'nis', 'nisn', 'id'];
    const checkResult = await localDb.query(`SELECT * FROM "${schema}"."${tableName}" LIMIT 1`);

    if (checkResult.rows.length > 0) {
        const record = checkResult.rows[0];
        for (const col of fallbackColumns) {
            if (record.hasOwnProperty(col) && record[col] !== null && record[col] !== undefined) {
                console.log(`Using fallback primary key column: ${col} for table ${tableName}`);
                return [col];
            }
        }
    }

    console.warn(`No primary key found for ${tableName}, defaulting to 'id'`);
    return ['id'];
}

// Function to generate password hash with salt (SHA-512)
function generatePasswordHash(password: string): { hash: string; salt: string } {
    const salt = crypto.randomBytes(64).toString('hex');
    const hash = crypto.createHash('sha512').update(salt + password).digest('hex');
    return { hash, salt };
}

// Function to generate default password based on level
function getDefaultPassword(userid: string, level: string): string {
    if (userid === 'administrator') {
        return 'administrator';
    }

    // Default passwords based on level
    switch (level) {
        case 'Admin':
            return 'admin123';
        case 'Guru':
            return '@dikdasmen123456*';
        case 'Siswa':
            return 'siswa123';
        default:
            return 'default123';
    }
}

async function insertAllData(neonDb: any, tableName: string, data: any[]) {
    if (data.length === 0) return;

    const structure = await neonDb.query(`SELECT column_name
    FROM information_schema.columns
    WHERE table_name = $1
    ORDER BY ordinal_position`, [tableName]);

    const columns = structure.map((row: any) => row.column_name);

    // user_login sekarang menggunakan selective sync, jadi tidak perlu reset password di sini
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

/**
 * Pastikan primary key constraint ada di tabel Neon.
 * Jika belum ada, buat constraint-nya agar ON CONFLICT bisa bekerja.
 */
async function ensurePrimaryKeyConstraint(neonDb: any, tableName: string, primaryKey: string[]): Promise<boolean> {
    try {
        // Cek apakah constraint sudah ada
        const constraintCheck = await neonDb.query(`
            SELECT tc.constraint_name, kcu.column_name
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu 
              ON tc.constraint_name = kcu.constraint_name
            WHERE tc.table_name = $1
              AND tc.constraint_type = 'PRIMARY KEY'
            ORDER BY kcu.ordinal_position
        `, [tableName]);

        if (constraintCheck.length > 0) {
            // Cek apakah kolom PK yang ada cocok dengan yang diharapkan
            const existingPkCols = constraintCheck.map((r: any) => r.column_name);
            const expectedPkCols = [...primaryKey].sort();
            const actualPkCols = [...existingPkCols].sort();
            
            if (JSON.stringify(expectedPkCols) === JSON.stringify(actualPkCols)) {
                return true; // Constraint sudah benar
            }
            
            // PK ada tapi kolom tidak cocok — drop dan buat ulang
            const constraintName = constraintCheck[0].constraint_name;
            console.log(`⚠️  PK mismatch for ${tableName}: existing=[${existingPkCols.join(',')}] expected=[${primaryKey.join(',')}]`);
            console.log(`Dropping old constraint "${constraintName}"...`);
            await neonDb.query(`ALTER TABLE "${tableName}" DROP CONSTRAINT "${constraintName}"`, []);
            console.log(`Old constraint dropped. Creating new composite PK...`);
        }

        // Buat primary key constraint (composite jika lebih dari 1 kolom)
        const pkColumns = primaryKey.map(k => `"${k}"`).join(', ');
        console.log(`Creating PRIMARY KEY constraint on "${tableName}"(${pkColumns})...`);
        await neonDb.query(`ALTER TABLE "${tableName}" ADD PRIMARY KEY (${pkColumns})`, []);
        console.log(`✅ PRIMARY KEY constraint created for ${tableName}(${pkColumns})`);
        return true;
    } catch (err: any) {
        console.warn(`⚠️  Cannot create PK constraint for ${tableName}: ${err.message}`);
        return false; // Gagal buat constraint
    }
}

/**
 * Perform Bulk UPSERT for selective sync tables
 * High performance: processes hundreds of records in a single query
 */
async function upsertAllData(neonDb: any, tableName: string, data: any[], primaryKey: string[]) {
    if (data.length === 0) return 0;

    // Get current table columns from Neon
    const structure = await neonDb.query(`SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = $1`, [tableName]);
    
    const validColumns = structure.map((row: any) => row.column_name);
    
    // Preparation for user_login passwords
    const isUserLoginTable = tableName === 'user_login';

    // Pastikan primary key constraint ada sebelum UPSERT
    const hasConstraint = await ensurePrimaryKeyConstraint(neonDb, tableName, primaryKey);
    
    if (!hasConstraint) {
        // Fallback: gunakan DELETE + INSERT per record jika constraint tidak bisa dibuat
        console.warn(`⚠️  Falling back to record-by-record sync for ${tableName} (no PK constraint)`);
        return await fallbackRecordByRecord(neonDb, tableName, data, primaryKey, validColumns, isUserLoginTable);
    }
    
    // Batch processing
    const BATCH_SIZE = 250; 
    let totalSynced = 0;

    for (let i = 0; i < data.length; i += BATCH_SIZE) {
        const batch = data.slice(i, i + BATCH_SIZE);
        if (batch.length === 0) continue;

        // Columns found in first row of this batch that exist in target table
        const rowColumns = Object.keys(batch[0]).filter(col => validColumns.includes(col));
        
        // Add sync tracking columns if missing
        const insertColumns = [...rowColumns];
        if (!insertColumns.includes('is_locally_edited')) insertColumns.push('is_locally_edited');
        if (!insertColumns.includes('last_local_sync')) insertColumns.push('last_local_sync');

        const placeholders: string[] = [];
        const allValues: any[] = [];
        let paramIndex = 1;

        for (const row of batch) {
            const rowValues: any[] = [];
            
            // Build values for this row
            rowColumns.forEach(col => {
                let val = row[col];
                rowValues.push(val);
            });

            // Special logic for new users in user_login: pre-generate password hashes
            if (isUserLoginTable && row.userid && row.level) {
                const defaultPassword = getDefaultPassword(row.userid, row.level);
                const { hash, salt } = generatePasswordHash(defaultPassword);
                
                const passIdx = rowColumns.indexOf('password');
                const saltIdx = rowColumns.indexOf('salt');
                
                if (passIdx !== -1) rowValues[passIdx] = hash;
                if (saltIdx !== -1) rowValues[saltIdx] = salt;
            }

            // Push placeholders and final values (including sync columns)
            const rowPlaceholders = rowColumns.map(() => `$${paramIndex++}`);
            
            // Add is_locally_edited (false for sync) and last_local_sync
            rowPlaceholders.push(`$${paramIndex++}`); // is_locally_edited
            rowPlaceholders.push(`$${paramIndex++}`); // last_local_sync
            
            placeholders.push(`(${rowPlaceholders.join(', ')})`);
            
            allValues.push(...rowValues);
            allValues.push(false); // is_locally_edited = false
            allValues.push(new Date()); // last_local_sync = now
        }

        // Build the DO UPDATE SET part - exclude ALL primary key columns
        const updateColumns = rowColumns.filter(col => !primaryKey.includes(col));
        
        // Also exclude password/salt for user_login to preserve web edits
        let finalUpdateColumns = updateColumns;
        if (isUserLoginTable) {
            finalUpdateColumns = updateColumns.filter(col => col !== 'password' && col !== 'salt');
        }

        const setClause = finalUpdateColumns.map(col => `"${col}" = EXCLUDED."${col}"`).join(', ');
        
        // ON CONFLICT dengan composite key: ("col1", "col2")
        const conflictColumns = primaryKey.map(k => `"${k}"`).join(', ');
        
        const query = `
            INSERT INTO "${tableName}" (${insertColumns.map(c => `"${c}"`).join(', ')})
            VALUES ${placeholders.join(', ')}
            ON CONFLICT (${conflictColumns}) 
            DO UPDATE SET 
                ${setClause},
                last_local_sync = EXCLUDED.last_local_sync
            WHERE "${tableName}".is_locally_edited = false
        `;

        try {
            await neonDb.query(query, allValues);
            totalSynced += batch.length;
            console.log(`UPSERT Batch ${Math.floor(i/BATCH_SIZE)+1}: Processed ${batch.length} records for ${tableName}`);
        } catch (error: any) {
            console.error(`Error in Bulk UPSERT batch for ${tableName}:`, error.message);
            // Fallback ke record-by-record untuk batch ini
            console.warn(`⚠️  Retrying batch ${Math.floor(i/BATCH_SIZE)+1} record-by-record...`);
            const batchSynced = await fallbackRecordByRecord(neonDb, tableName, batch, primaryKey, validColumns, isUserLoginTable);
            totalSynced += batchSynced;
        }
    }

    return totalSynced;
}

/**
 * Fallback sync: DELETE existing then INSERT, record by record
 * Digunakan jika tabel tidak memiliki constraint yang valid untuk ON CONFLICT
 */
async function fallbackRecordByRecord(
    neonDb: any, tableName: string, data: any[], primaryKey: string[], 
    validColumns: string[], isUserLoginTable: boolean
): Promise<number> {
    let count = 0;
    for (const row of data) {
        try {
            // Cek semua PK columns ada nilainya
            const pkValues = primaryKey.map(k => row[k]);
            if (pkValues.some(v => v === null || v === undefined)) continue;

            const rowColumns = Object.keys(row).filter(col => validColumns.includes(col));
            const insertColumns = [...rowColumns];
            if (!insertColumns.includes('is_locally_edited')) insertColumns.push('is_locally_edited');
            if (!insertColumns.includes('last_local_sync')) insertColumns.push('last_local_sync');

            const rowValues = rowColumns.map(col => row[col]);

            if (isUserLoginTable && row.userid && row.level) {
                const { hash, salt } = generatePasswordHash(getDefaultPassword(row.userid, row.level));
                const passIdx = rowColumns.indexOf('password');
                const saltIdx = rowColumns.indexOf('salt');
                if (passIdx !== -1) rowValues[passIdx] = hash;
                if (saltIdx !== -1) rowValues[saltIdx] = salt;
            }

            // DELETE existing record - composite WHERE clause
            const whereClause = primaryKey.map((k, idx) => `"${k}" = $${idx + 1}`).join(' AND ');
            await neonDb.query(`DELETE FROM "${tableName}" WHERE ${whereClause}`, pkValues);

            // INSERT baru
            const allValues = [...rowValues, false, new Date()];
            const colList = insertColumns.map(c => `"${c}"`).join(', ');
            const phList = allValues.map((_, idx) => `$${idx + 1}`).join(', ');
            await neonDb.query(`INSERT INTO "${tableName}" (${colList}) VALUES (${phList})`, allValues);
            count++;
        } catch (err: any) {
            console.error(`Fallback record error in ${tableName}:`, err.message);
        }
    }
    console.log(`Fallback sync completed: ${count}/${data.length} records in ${tableName}`);
    return count;
}

