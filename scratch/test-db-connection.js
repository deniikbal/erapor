const { Pool } = require('pg');
require('dotenv').config();

async function testConnection() {
  const pool = new Pool({
    host: process.env.LOCAL_DB_HOST || 'localhost',
    port: parseInt(process.env.LOCAL_DB_PORT || '5432'),
    database: process.env.LOCAL_DB_DATABASE || 'erapor',
    user: process.env.LOCAL_DB_USERNAME || 'postgres',
    password: process.env.LOCAL_DB_PASSWORD || '', // Use empty string if not provided
  });

  try {
    console.log(`Connecting to ${process.env.LOCAL_DB_HOST}:${process.env.LOCAL_DB_PORT}...`);
    const client = await pool.connect();
    console.log('Successfully connected to local database!');
    const res = await client.query('SELECT version()');
    console.log('PostgreSQL version:', res.rows[0].version);
    client.release();
  } catch (err) {
    console.error('Failed to connect to local database:', err.message);
  } finally {
    await pool.end();
  }
}

testConnection();
