/**
 * Migration Runner Script
 *
 * This script is executed during Fly.io deployment (release_command)
 * to run pending database migrations before the new version starts.
 *
 * Features:
 * - Connection retry logic with exponential backoff
 * - Transaction-safe migrations
 * - Detailed logging for debugging
 * - Graceful error handling
 *
 * Usage:
 *   - Development: npx ts-node -r tsconfig-paths/register src/scripts/run-migrations.ts
 *   - Production: node dist/scripts/run-migrations.js
 */

import { join } from 'path';

import { DataSource } from 'typeorm';

// Configuration
const MAX_RETRIES = 5;
const INITIAL_RETRY_DELAY = 2000; // 2 seconds

// Database configuration from environment variables
const getDataSourceConfig = () => {
  // Migrations path - relative to this script location
  // Works in both dev (src/scripts/) and prod (dist/src/scripts/)
  const migrationsPath = join(__dirname, '..', 'database', 'migrations', '*{.js,.ts}');

  return {
    type: 'postgres' as const,
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),
    username: process.env.DATABASE_USER || 'postgres',
    password: process.env.DATABASE_PASSWORD || 'postgres',
    database: process.env.DATABASE_NAME || 'oneohm_epc',
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
    migrations: [migrationsPath],
    migrationsTableName: 'typeorm_migrations',
    logging: process.env.NODE_ENV !== 'production',
    connectTimeoutMS: 30000,
    extra: {
      connectionTimeoutMillis: 30000,
      query_timeout: 60000,
      statement_timeout: 60000,
    },
  };
};

// Sleep helper for retry delays
const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

// Connect with retry logic
async function connectWithRetry(dataSource: DataSource, retries = MAX_RETRIES): Promise<void> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`🔌 Connection attempt ${attempt}/${retries}...`);
      await dataSource.initialize();
      console.log('✅ Database connection established');
      return;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ Connection attempt ${attempt} failed: ${errorMessage}`);

      if (attempt === retries) {
        throw new Error(`Failed to connect to database after ${retries} attempts`);
      }

      const delay = INITIAL_RETRY_DELAY * Math.pow(2, attempt - 1);
      console.log(`⏳ Retrying in ${delay / 1000} seconds...`);
      await sleep(delay);
    }
  }
}

async function runMigrations(): Promise<void> {
  const startTime = Date.now();

  console.log('');
  console.log('================================================');
  console.log('🚀 OneOhm EPC - Database Migration');
  console.log('================================================');
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📍 Database Host: ${process.env.DATABASE_HOST || 'localhost'}`);
  console.log(`📍 Database Name: ${process.env.DATABASE_NAME || 'oneohm_epc'}`);
  console.log(`📍 SSL Enabled: ${process.env.DATABASE_SSL === 'true'}`);
  console.log('================================================');
  console.log('');

  const config = getDataSourceConfig();
  const dataSource = new DataSource(config);

  try {
    // Connect with retry logic
    await connectWithRetry(dataSource);

    // Check for pending migrations
    console.log('');
    console.log('📋 Checking for pending migrations...');

    const pendingMigrations = await dataSource.showMigrations();

    if (pendingMigrations) {
      console.log('📋 Pending migrations detected');
    }

    // Run pending migrations with transaction
    console.log('🔄 Running migrations...');
    const migrations = await dataSource.runMigrations({
      transaction: 'all', // Run all migrations in a single transaction
    });

    console.log('');
    if (migrations.length > 0) {
      console.log('================================================');
      console.log(`✅ Successfully executed ${migrations.length} migration(s):`);
      console.log('================================================');
      migrations.forEach((migration, index) => {
        console.log(`   ${index + 1}. ${migration.name}`);
      });
    } else {
      console.log('================================================');
      console.log('✅ Database schema is up to date');
      console.log('   No pending migrations to run');
      console.log('================================================');
    }

    // Close the connection
    await dataSource.destroy();

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log('');
    console.log(`🔌 Database connection closed`);
    console.log(`⏱️  Total time: ${duration}s`);
    console.log('');
    console.log('✅ Migration process completed successfully!');
    console.log('');

    process.exit(0);
  } catch (error) {
    console.error('');
    console.error('================================================');
    console.error('❌ MIGRATION FAILED');
    console.error('================================================');

    if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
      if (process.env.NODE_ENV !== 'production') {
        console.error('Stack:', error.stack);
      }
    } else {
      console.error('Unknown error:', error);
    }

    console.error('================================================');
    console.error('');

    // Attempt to close connection gracefully
    try {
      if (dataSource.isInitialized) {
        await dataSource.destroy();
      }
    } catch {
      // Ignore cleanup errors
    }

    process.exit(1);
  }
}

// Execute migrations
void runMigrations();
