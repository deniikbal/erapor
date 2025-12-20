import { Pool } from 'pg';

export async function POST(request: Request) {
    let localDb: any = null;

    try {
        // Check if user is admin
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

        console.log('Checking local database schemas and tables...');

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

        // Get all schemas (excluding system schemas)
        const schemasResult = await localDb.query(`
      SELECT schema_name 
      FROM information_schema.schemata 
      WHERE schema_name NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
      ORDER BY schema_name
    `);

        const schemas = schemasResult.rows.map((row: { schema_name: string }) => row.schema_name);
        console.log(`Found ${schemas.length} schemas:`, schemas);

        // Get tables for each schema
        const schemaDetails = await Promise.all(schemas.map(async (schemaName: string) => {
            const tablesResult = await localDb.query(`
        SELECT 
          table_name,
          (SELECT count(*) FROM information_schema.columns WHERE table_schema = $1 AND table_name = t.table_name) as column_count
        FROM information_schema.tables t
        WHERE table_schema = $1
        AND table_type = 'BASE TABLE'
        ORDER BY table_name
      `, [schemaName]);

            const tables = await Promise.all(tablesResult.rows.map(async (row: { table_name: string, column_count: string }) => {
                // Get row count for each table
                const countResult = await localDb.query(`SELECT COUNT(*) as count FROM "${schemaName}"."${row.table_name}"`);
                const rowCount = parseInt(countResult.rows[0].count);

                return {
                    name: row.table_name,
                    columnCount: parseInt(row.column_count),
                    rowCount: rowCount
                };
            }));

            return {
                name: schemaName,
                tables: tables,
                tableCount: tables.length,
                totalRows: tables.reduce((sum, table) => sum + table.rowCount, 0)
            };
        }));

        // Close connection
        await localDb.end();

        return Response.json({
            success: true,
            schemas: schemaDetails,
            totalSchemas: schemas.length,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Check database error:', error);

        // Make sure to close the local database connection if it was created
        if (localDb) {
            try {
                await localDb.end();
            } catch (closeError) {
                console.error('Error closing local database connection:', closeError);
            }
        }

        return Response.json({
            error: 'Failed to check database',
            message: (error as Error).message
        }, { status: 500 });
    }
}
