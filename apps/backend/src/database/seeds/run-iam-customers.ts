import { seedIAMCustomers } from './iam-customers.seed';
import dataSource from '../ormconfig';

/**
 * Runner script for IAM Customers seed
 * Usage: ts-node -r tsconfig-paths/register src/database/seeds/run-iam-customers.ts
 */

async function run(): Promise<void> {
  try {
    console.error('Initializing database connection...');
    await dataSource.initialize();

    console.error('Running IAM Customers seed...');
    await seedIAMCustomers(dataSource);

    console.error('✅ Seed completed successfully!');
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
    process.exit(0);
  }
}

void run();
