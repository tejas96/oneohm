import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { SERIALIZED_PRODUCT_TYPE_CODES } from '@tejas96/shared/types';
import { DataSource, QueryFailedError } from 'typeorm';

import { BomItemSerialEntity } from '../entities/bom-item-serial.entity';
import { BomItemEntity } from '../entities/bom-item.entity';

const SERIAL_NUMBER_PATTERN = /^[A-Za-z0-9_/-]+$/;
const SERIAL_NUMBER_MAX_LENGTH = 100;

/**
 * Serial numbers for the units of a BOM line.
 *
 * The old API addressed ONE serial per bom_items row, which only worked
 * because a 12-panel line was exploded into 12 rows keyed by
 * group_key + unit_index. bom_items is back to one row per product, so a
 * serial now lives on its own row in bom_item_serials and the endpoint sets
 * the WHOLE list for a line at once. That makes it idempotent — the caller
 * sends what the line's serials are, not a diff — and it removes the
 * per-unit-row addressing whose rows a quantity change used to shuffle hard
 * enough that an in-flight serial edit could 404.
 */
@Injectable()
export class BomSerialService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  /**
   * Replace the serial list for one BOM line.
   *
   * Delete-then-insert inside ONE transaction, which is safe precisely because
   * both halves are scoped to a single item and roll back together. It is NOT
   * the delete-then-recreate shape persistBom used to have: that deleted a
   * whole BOM before rebuilding it, inside a swallowing try/catch, so a failed
   * re-save destroyed the BOM that was already there. Here nothing outside the
   * one line is touched, and a failure leaves the previous list intact.
   */
  async setSerials(
    itemId: string,
    serials: string[],
    userId: string,
  ): Promise<BomItemSerialEntity[]> {
    return this.dataSource.transaction(async (manager) => {
      const item = await manager.getRepository(BomItemEntity).findOne({
        where: { id: itemId },
        relations: ['product', 'product.productType'],
      });
      if (!item) {
        throw new NotFoundException(`BOM item ${itemId} not found`);
      }

      this.assertSerializable(item.product?.productType?.code);

      // Math.ceil because quantity is NUMERIC(12,3): a 2.5-unit line is two
      // whole units plus a part, and the part can still carry a serial.
      if (serials.length > Math.ceil(Number(item.quantity))) {
        throw new BadRequestException(
          `This line has ${item.quantity} unit(s); you gave ${serials.length} serial numbers.`,
        );
      }

      const normalized = serials.map((serial) => this.requireSerialNumber(serial));

      const serialRepo = manager.getRepository(BomItemSerialEntity);
      await serialRepo.delete({ bomItemId: itemId });

      if (normalized.length === 0) return [];

      const rows = normalized.map((serialNumber) =>
        serialRepo.create({ bomItemId: itemId, serialNumber, createdBy: userId }),
      );

      try {
        return await serialRepo.save(rows);
      } catch (error) {
        // uq_bom_item_serials (bom_item_id, serial_number). Because the list is
        // replaced wholesale, the only way to hit it is a duplicate WITHIN the
        // submitted list — say so rather than 500ing on the index name.
        if (error instanceof QueryFailedError && (error as { code?: string }).code === '23505') {
          throw new ConflictException(
            'The same serial number appears twice in this list. Each unit needs its own.',
          );
        }
        throw error;
      }
    });
  }

  /**
   * Where else this serial number is already recorded. Powers the "this panel
   * is already on another project" warning before a serial is committed.
   *
   * Reads bom_item_serials and joins products for the name — bom_items.name is
   * unmapped legacy and Task 20 drops it.
   */
  async findConflicts(serialNumber: string): Promise<
    Array<{
      bomId: string;
      bomNumber: string;
      projectId: string;
      itemId: string;
      productName: string;
    }>
  > {
    const normalized = this.normalizeSerialNumber(serialNumber);
    if (!normalized) return [];

    const rows = await this.dataSource
      .getRepository(BomItemSerialEntity)
      .createQueryBuilder('serial')
      .innerJoin('serial.bomItem', 'item')
      .innerJoin('item.bom', 'bom')
      .leftJoin('item.product', 'product')
      .select([
        'item.id AS item_id',
        'product.name AS product_name',
        'bom.id AS bom_id',
        'bom.bomNumber AS bom_number',
        'bom.projectId AS project_id',
      ])
      .where('serial.serial_number = :serialNumber', { serialNumber: normalized })
      .orderBy('bom.createdAt', 'DESC')
      .getRawMany<{
        item_id: string;
        product_name: string | null;
        bom_id: string;
        bom_number: string;
        project_id: string;
      }>();

    return rows.map((row) => ({
      bomId: row.bom_id,
      bomNumber: row.bom_number,
      projectId: row.project_id,
      itemId: row.item_id,
      productName: row.product_name ?? '(product removed)',
    }));
  }

  /**
   * Serial eligibility is decided on the PRODUCT TYPE code, not on a BOM
   * column. The old check used bom_items.item_type, whose values ('panel')
   * never matched product_types.code ('solar_panel').
   */
  private assertSerializable(productTypeCode: string | undefined): void {
    if (!productTypeCode || !SERIALIZED_PRODUCT_TYPE_CODES.includes(productTypeCode as never)) {
      throw new BadRequestException(
        `Serial numbers are not tracked for ${productTypeCode ?? 'this'} products`,
      );
    }
  }

  /** A serial the caller actually sent. Blank is a mistake here, not a clear. */
  private requireSerialNumber(serialNumber: string): string {
    const normalized = this.normalizeSerialNumber(serialNumber);
    if (!normalized) {
      throw new BadRequestException('A serial number cannot be blank');
    }
    return normalized;
  }

  /**
   * `undefined` is in the signature because a missing `?serialNumber=` query
   * param arrives as undefined however the handler's parameter is typed.
   */
  private normalizeSerialNumber(serialNumber: string | null | undefined): string | null {
    if (serialNumber === null || serialNumber === undefined) return null;
    const trimmed = serialNumber.trim();
    if (!trimmed) return null;
    if (trimmed.length > SERIAL_NUMBER_MAX_LENGTH) {
      throw new BadRequestException(
        `serialNumber must be at most ${SERIAL_NUMBER_MAX_LENGTH} characters`,
      );
    }
    if (!SERIAL_NUMBER_PATTERN.test(trimmed)) {
      throw new BadRequestException(
        'serialNumber contains invalid characters (allowed: letters, numbers, -, _, /)',
      );
    }
    return trimmed;
  }
}
