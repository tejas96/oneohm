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

  /**
   * `created_by` on a row is a bare uuid — the durable reference — so a
   * display name is resolved alongside it here, the same shape the ledger
   * already uses for `recordedByName`/`approvedByName`
   * (ledger.repository.ts's `getEntryAttributionByProject`): `NULLIF(TRIM(...))`
   * so a user with no name comes back null rather than an empty string, and a
   * LEFT JOIN so a row whose author no longer resolves (a deleted user, or
   * historical data seeded straight into the table) still returns the row
   * with `createdByName: null` instead of dropping it.
   */
  async findByBom(bomId: string): Promise<Array<BomChangeEntity & { createdByName: string | null }>> {
    const { entities, raw } = await this.dataSource
      .getRepository(BomChangeEntity)
      .createQueryBuilder('c')
      .leftJoin('users', 'u', 'u.id = c.created_by')
      .addSelect(`NULLIF(TRIM(CONCAT_WS(' ', u.first_name, u.last_name)), '')`, 'createdByName')
      .where('c.bom_id = :bomId', { bomId })
      // `c` is the createQueryBuilder root — an ENTITY alias — so orderBy needs
      // the property path (`createdAt`), not the raw column
      // (`created_at`): see orderby-property-paths.spec.ts. `u`, below, is a
      // plain-string leftJoin with no entity metadata, so ITS columns
      // (first_name/last_name in addSelect) correctly stay raw SQL names.
      .orderBy('c.createdAt', 'DESC')
      .getRawAndEntities();

    return entities.map((entity, i) => ({
      ...entity,
      createdByName: (raw[i]?.createdByName as string | undefined) ?? null,
    }));
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
