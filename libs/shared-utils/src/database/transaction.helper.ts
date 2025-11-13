import { DataSource, EntityManager, QueryRunner } from 'typeorm';
import { DatabaseException } from '../exceptions';

/**
 * TransactionHelper
 * 
 * Provides utilities for managing database transactions with proper error handling.
 * Ensures consistent transaction patterns across the application.
 */
export class TransactionHelper {
  /**
   * Execute work within a transaction
   * Automatically commits on success and rolls back on error
   * 
   * @example
   * await TransactionHelper.executeInTransaction(
   *   this.dataSource,
   *   async (manager) => {
   *     const user = await manager.save(User, userData);
   *     await manager.save(Profile, { ...profileData, userId: user.id });
   *     return user;
   *   }
   * );
   */
  static async executeInTransaction<T>(
    dataSource: DataSource,
    work: (manager: EntityManager) => Promise<T>,
  ): Promise<T> {
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const result = await work(queryRunner.manager);
      await queryRunner.commitTransaction();
      return result;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw new DatabaseException(
        'Transaction failed',
        'executeInTransaction',
        {
          originalError: error instanceof Error ? error.message : String(error),
        },
      );
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Execute work with a query runner (for more control)
   * Caller is responsible for committing/rolling back
   * 
   * @example
   * const queryRunner = await TransactionHelper.createQueryRunner(this.dataSource);
   * try {
   *   await queryRunner.startTransaction();
   *   // ... perform operations
   *   await queryRunner.commitTransaction();
   * } catch (error) {
   *   await queryRunner.rollbackTransaction();
   *   throw error;
   * } finally {
   *   await queryRunner.release();
   * }
   */
  static async createQueryRunner(dataSource: DataSource): Promise<QueryRunner> {
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    return queryRunner;
  }

  /**
   * Execute multiple operations in a single transaction
   * Returns an array of results in the same order as operations
   * 
   * @example
   * const [user, profile] = await TransactionHelper.executeBatch(
   *   this.dataSource,
   *   [
   *     (manager) => manager.save(User, userData),
   *     (manager) => manager.save(Profile, profileData),
   *   ]
   * );
   */
  static async executeBatch<T extends any[]>(
    dataSource: DataSource,
    operations: Array<(manager: EntityManager) => Promise<any>>,
  ): Promise<T> {
    return await this.executeInTransaction(dataSource, async (manager) => {
      const results: any[] = [];
      for (const operation of operations) {
        const result = await operation(manager);
        results.push(result);
      }
      return results as T;
    });
  }

  /**
   * Execute work with savepoint support (nested transactions)
   * 
   * @example
   * await TransactionHelper.executeWithSavepoint(
   *   queryRunner,
   *   'my_savepoint',
   *   async (manager) => {
   *     // ... operations that might need to be rolled back independently
   *   }
   * );
   */
  static async executeWithSavepoint<T>(
    queryRunner: QueryRunner,
    savepointName: string,
    work: (manager: EntityManager) => Promise<T>,
  ): Promise<T> {
    await queryRunner.query(`SAVEPOINT ${savepointName}`);

    try {
      const result = await work(queryRunner.manager);
      await queryRunner.query(`RELEASE SAVEPOINT ${savepointName}`);
      return result;
    } catch (error) {
      await queryRunner.query(`ROLLBACK TO SAVEPOINT ${savepointName}`);
      throw error;
    }
  }
}

