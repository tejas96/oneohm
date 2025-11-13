import { Injectable } from '@nestjs/common';
import { type DataSource } from 'typeorm';

/**
 * AutoNumberingService
 *
 * Centralized service for generating sequential numbers with custom formats.
 * Provides thread-safe number generation for entities requiring auto-numbering.
 *
 * Supported formats:
 * - {PREFIX}-{YEAR}-{NUMBER}: e.g., LA-2024-001
 * - {PREFIX}-{NUMBER}: e.g., INV-00123
 * - {YEAR}-{MONTH}-{NUMBER}: e.g., 2024-11-001
 *
 * @example
 * // In repository or service:
 * const loanNumber = await this.autoNumberingService.generateNumber(
 *   'loan_applications',
 *   'application_number',
 *   'LA',
 *   true, // includeYear
 *   4     // padding
 * );
 * // Result: LA-2024-0001
 */
@Injectable()
export class AutoNumberingService {
  constructor(private readonly dataSource: DataSource) {}

  /**
   * Generate next sequential number for an entity
   *
   * @param tableName - Database table name
   * @param columnName - Column name storing the number
   * @param prefix - Prefix for the number (e.g., 'LA', 'INV')
   * @param includeYear - Whether to include year in format
   * @param padding - Number of digits for padding (default: 3)
   * @param separator - Separator character (default: '-')
   */
  async generateNumber(
    tableName: string,
    columnName: string,
    prefix: string,
    includeYear: boolean = true,
    padding: number = 3,
    separator: string = '-',
  ): Promise<string> {
    const year = new Date().getFullYear();

    // Build the pattern to search for
    const pattern = includeYear
      ? `${prefix}${separator}${year}${separator}%`
      : `${prefix}${separator}%`;

    // Use advisory lock for thread-safety
    const lockId = this.generateLockId(tableName, columnName);

    try {
      // Acquire advisory lock
      await this.dataSource.query('SELECT pg_advisory_lock($1)', [lockId]);

      // Find the highest existing number
      const result = await this.dataSource.query(
        `
        SELECT ${columnName}
        FROM ${tableName}
        WHERE ${columnName} LIKE $1
        ORDER BY ${columnName} DESC
        LIMIT 1
        `,
        [pattern],
      );

      let nextNumber = 1;

      if (result.length > 0) {
        const lastNumber = result[0][columnName] as string;
        // Extract the numeric part (last segment after splitting by separator)
        const parts = lastNumber.split(separator);
        const numericPart = parts[parts.length - 1];
        if (numericPart) {
          nextNumber = parseInt(numericPart, 10) + 1;
        }
      }

      // Format the number with padding
      const paddedNumber = nextNumber.toString().padStart(padding, '0');

      // Build final number
      if (includeYear) {
        return `${prefix}${separator}${year}${separator}${paddedNumber}`;
      }
      return `${prefix}${separator}${paddedNumber}`;
    } finally {
      // Release advisory lock
      await this.dataSource.query('SELECT pg_advisory_unlock($1)', [lockId]);
    }
  }

  /**
   * Generate a unique number with custom format
   *
   * @param format - Format string with placeholders: {PREFIX}, {YEAR}, {MONTH}, {NUMBER}
   * @param tableName - Table name for querying existing numbers
   * @param columnName - Column name storing the number
   * @param padding - Number of digits for padding (default: 3)
   *
   * @example
   * const number = await generateCustomNumber(
   *   '{PREFIX}-{YEAR}{MONTH}-{NUMBER}',
   *   'orders',
   *   'order_number',
   *   4
   * );
   * // Result: ORD-202411-0001
   */
  async generateCustomNumber(
    format: string,
    tableName: string,
    columnName: string,
    prefix: string,
    padding: number = 3,
  ): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');

    // Replace known placeholders to build pattern
    const pattern = format
      .replace('{PREFIX}', prefix)
      .replace('{YEAR}', year.toString())
      .replace('{MONTH}', month)
      .replace('{NUMBER}', '%');

    const lockId = this.generateLockId(tableName, columnName);

    try {
      await this.dataSource.query('SELECT pg_advisory_lock($1)', [lockId]);

      const result = await this.dataSource.query(
        `
        SELECT ${columnName}
        FROM ${tableName}
        WHERE ${columnName} LIKE $1
        ORDER BY ${columnName} DESC
        LIMIT 1
        `,
        [pattern],
      );

      let nextNumber = 1;

      if (result.length > 0) {
        const lastNumber = result[0][columnName] as string;
        // Extract numeric part from end
        const match = lastNumber.match(/(\d+)$/);
        if (match && match[1]) {
          nextNumber = parseInt(match[1], 10) + 1;
        }
      }

      const paddedNumber = nextNumber.toString().padStart(padding, '0');

      // Build final number
      return format
        .replace('{PREFIX}', prefix)
        .replace('{YEAR}', year.toString())
        .replace('{MONTH}', month)
        .replace('{NUMBER}', paddedNumber);
    } finally {
      await this.dataSource.query('SELECT pg_advisory_unlock($1)', [lockId]);
    }
  }

  /**
   * Validate if a number follows the expected format
   */
  validateNumberFormat(
    number: string,
    prefix: string,
    includeYear: boolean = true,
    separator: string = '-',
  ): boolean {
    const year = new Date().getFullYear();

    if (includeYear) {
      const regex = new RegExp(`^${prefix}${separator}${year}${separator}\\d+$`);
      return regex.test(number);
    }
    const regex = new RegExp(`^${prefix}${separator}\\d+$`);
    return regex.test(number);
  }

  /**
   * Generate a consistent lock ID from table and column name
   * PostgreSQL advisory locks use bigint, so we hash the string
   */
  private generateLockId(tableName: string, columnName: string): number {
    const str = `${tableName}_${columnName}`;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }
}
