/**
 * Migration script to clean up old schema
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: join(process.cwd(), '.env.local') });

async function runMigration() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL is not set');
    console.log('Available env vars:', Object.keys(process.env).filter(k => k.includes('DATABASE')));
    process.exit(1);
  }

  console.log('📡 Connecting to database...');

  // Always use SSL for Railway
  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
  });

  try {
    console.log('🔄 Running migration...');

    // Read migration SQL file
    const migrationSql = readFileSync(join(process.cwd(), 'server/migrate-clean.sql'), 'utf-8');

    // Execute migration
    await pool.query(migrationSql);

    console.log('✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
