import { migrateUsersToIAM } from './migrate-users-to-iam';
import dataSource from '../database/ormconfig';

/**
 * Runner script for User Roles to IAM migration
 * Usage: npm run migrate:users-to-iam
 */

async function run(): Promise<void> {

  try {
    console.log('Initializing database connection...');
    await dataSource.initialize();
    
    console.log('Running User Roles → IAM migration...');
    await migrateUsersToIAM(dataSource);
    
    console.log('✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
    process.exit(0);
  }
}

void run();

