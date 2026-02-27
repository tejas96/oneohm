import { type EntityManager, type Repository } from 'typeorm';

/**
 * Generates a human-readable entity code in the format: {PREFIX}-{ORG_CODE}-{YEAR}-{SEQ4}
 *
 * Example: CUST-ONEOHM-2026-0001, PRJ-ONEOHM-2026-0003
 *
 * Queries the repository for the highest existing code with the same prefix/year
 * and increments the sequence number. Includes soft-deleted records to prevent reuse.
 *
 * @param repo - TypeORM repository for the entity
 * @param columnName - The column that stores the code (e.g. 'customerNumber', 'propertyNumber')
 * @param prefix - Code prefix (e.g. 'CUST', 'PROP', 'MS', 'SSV', 'TSK')
 * @param orgCode - Organization code (e.g. 'ONEOHM')
 * @param dbColumnName - The actual database column name (snake_case), if different from TypeORM entity property
 * @param manager - Optional EntityManager for transaction-aware queries
 */
export async function generateEntityCode(
  repo: Repository<any>,
  columnName: string,
  prefix: string,
  orgCode: string,
  dbColumnName?: string,
  manager?: EntityManager,
): Promise<string> {
  const year = new Date().getFullYear();
  const fullPrefix = `${prefix}-${orgCode}-${year}`;
  const pattern = `${fullPrefix}-%`;

  const actualDbColumn = dbColumnName || camelToSnake(columnName);

  const effectiveRepo = manager ? manager.getRepository(repo.target) : repo;

  const result = await effectiveRepo
    .createQueryBuilder('e')
    .withDeleted()
    .select(`e.${actualDbColumn}`, 'code')
    .where(`e.${actualDbColumn} LIKE :pattern`, { pattern })
    .orderBy(`e.${actualDbColumn}`, 'DESC')
    .limit(1)
    .getRawOne<{ code: string }>();

  let nextSeq = 1;
  if (result?.code) {
    const parts = result.code.split('-');
    const lastPart = parts[parts.length - 1];
    if (lastPart) {
      const parsed = parseInt(lastPart, 10);
      nextSeq = Number.isNaN(parsed) ? 1 : parsed + 1;
    }
  }

  return `${fullPrefix}-${String(nextSeq).padStart(4, '0')}`;
}

function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}
