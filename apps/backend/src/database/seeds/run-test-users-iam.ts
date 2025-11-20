import { seedTestUsersIAM } from './test-users-iam.seed';
import dataSource from '../ormconfig';

/**
 * Runner script for Test Users IAM seed
 * Usage: ts-node -r tsconfig-paths/register src/database/seeds/run-test-users-iam.ts
 */

async function run(): Promise<void> {
  try {
    console.log('Initializing database connection...');
    await dataSource.initialize();

    console.log('Running Test Users IAM seed...');
    await seedTestUsersIAM(dataSource);

    console.log('✅ Seed completed successfully!');
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
    process.exit(0);
  }
}

void run();
