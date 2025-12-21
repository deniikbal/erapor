import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';

const envContent = readFileSync('.env', 'utf-8');
envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        process.env[key.trim()] = valueParts.join('=').trim();
    }
});

const sql = neon(process.env.DATABASE_URL);

const cols = await sql`
  SELECT column_name 
  FROM information_schema.columns
  WHERE table_name = 'refekstra_kurikuler'
  ORDER BY ordinal_position
`;

console.log('refekstra_kurikuler columns:');
cols.forEach(c => console.log('  -', c.column_name));

const sample = await sql`SELECT * FROM refekstra_kurikuler LIMIT 2`;
console.log('\nSample data:');
sample.forEach((row, idx) => {
    console.log(`${idx + 1}.`, row);
});
