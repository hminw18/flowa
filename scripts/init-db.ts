/**
 * Database initialization script for Railway deployment
 * Run this after deploying to initialize the database schema
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { Pool } from 'pg';

async function initDatabase() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL is not set');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
  });

  try {
    console.log('🔄 Initializing database schema...');

    // Read schema SQL file
    const schemaSql = readFileSync(join(__dirname, '../server/schema.sql'), 'utf-8');

    // Execute schema
    await pool.query(schemaSql);

    console.log('✅ Database schema initialized successfully!');

    // Run migration to clean up
    console.log('🔄 Running migration...');
    const migrationSql = readFileSync(join(__dirname, '../server/migrate-clean.sql'), 'utf-8');
    await pool.query(migrationSql);

    console.log('✅ Migration completed successfully!');
    console.log('✅ Database is ready!');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

initDatabase();
