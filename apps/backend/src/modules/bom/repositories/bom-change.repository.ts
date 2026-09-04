import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';

import { BomChangeEntity } from '../entities/bom-change.entity';

/**
 * Insert-only access to the change log.
 *
 * There is deliberately no update or delete method: the table's trigger would
 * reject one anyway, and offering the method invites a caller to try.
 */
@Injectable()
export class BomChangeRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  /**
   * Append change rows. Always takes the caller's manager so the log lands in
   * the same transaction as the item change it describes — a change without
   * its log row would break the reconciliation assertion.
   */
  async append(
    rows: Array<Partial<BomChangeEntity>>,
    manager: EntityManager,
  ): Promise<BomChangeEntity[]> {
    const repo = manager.getRepository(BomChangeEntity);
    return repo.save(rows.map((r) => repo.create(r)));
  }

  async findByBom(bomId: string): Promise<BomChangeEntity[]> {
    return this.dataSource.getRepository(BomChangeEntity).find({
      where: { bomId },
      order: { createdAt: 'DESC' },
    });
  }

  /** Signed sum. Equals current BOM value minus quoted BOM value. */
  async sumImpact(bomId: string, manager?: EntityManager): Promise<number> {
    const repo = (manager ?? this.dataSource).getRepository(BomChangeEntity);
    const row = await repo
      .createQueryBuilder('c')
      .select('COALESCE(SUM(c.cost_impact_paise), 0)', 'total')
      .where('c.bom_id = :bomId', { bomId })
      .getRawOne<{ total: string }>();
    return Number(row?.total ?? 0);
  }
}
