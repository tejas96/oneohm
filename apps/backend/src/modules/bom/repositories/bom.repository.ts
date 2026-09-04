import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { COMPANY } from '@tejas96/shared/constants';
import { DataSource, EntityManager, Repository } from 'typeorm';

import { BomEntity } from '../entities/bom.entity';

@Injectable()
export class BomRepository {
  constructor(
    @InjectRepository(BomEntity)
    private readonly repository: Repository<BomEntity>,
    private readonly dataSource: DataSource,
  ) {}

  async findByProject(projectId: string): Promise<BomEntity | null> {
    return this.repository.findOne({
      where: { projectId },
      relations: [
        'items',
        'items.product',
        'items.product.productType',
        'items.product.brand',
        'items.serials',
      ],
      order: { items: { sortOrder: 'ASC' } },
    });
  }

  async findById(id: string): Promise<BomEntity | null> {
    return this.repository.findOne({
      where: { id },
      relations: ['items', 'items.product', 'items.product.productType', 'items.serials'],
      order: { items: { sortOrder: 'ASC' } },
    });
  }

  /**
   * Create the header only. Lines are added by BomBaselineService, each with
   * its own change-log row, so there is no path that inserts items without
   * logging them.
   *
   * Wraps generateBomNumber (which uses a pessimistic write lock) and the
   * subsequent INSERT inside a single transaction so the lock is always held
   * within an open transaction context.
   *
   * Pass `manager` to join a transaction the caller has already opened. The
   * number sequence stays under exactly the same lock either way — it is still
   * taken inside an open transaction, just the caller's rather than one of our
   * own. BomBaselineService.seedFromQuoteVersion needs this: creating the
   * header in a separate transaction from its items leaves an EMPTY BOM behind
   * whenever the item write fails, and an empty header then permanently blocks
   * re-seeding, because the caller's idempotency check only asks whether a BOM
   * exists. That is the same "silently empty BOM" failure this rebuild exists
   * to close, reached by another route.
   */
  async createForProject(
    data: {
      projectId: string;
      baselineQuoteVersionId?: string | null;
      createdBy: string;
      notes?: string;
    },
    manager?: EntityManager,
  ): Promise<BomEntity> {
    const insert = async (m: EntityManager): Promise<BomEntity> => {
      const bomNumber = await this.generateBomNumber(COMPANY.code, m);
      const repo = m.getRepository(BomEntity);
      return repo.save(repo.create({ ...data, bomNumber }));
    };
    return manager ? insert(manager) : this.dataSource.transaction(insert);
  }

  /**
   * Generate a sequential, org-scoped BOM number.
   * Pattern: BOM-{ORG_CODE}-{YEAR}-{NNNN}
   *
   * MUST be called inside an open transaction (manager must be provided) so
   * the pessimistic write lock is valid. The public `createForProject()`
   * method handles this automatically.
   */
  async generateBomNumber(organizationCode: string, manager: EntityManager): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `BOM-${organizationCode}-${year}`;

    const repo = manager.getRepository(BomEntity);

    const latest = await repo
      .createQueryBuilder('bom')
      .where('bom.bomNumber LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('bom.bomNumber', 'DESC')
      .setLock('pessimistic_write')
      .getOne();

    let sequence = 1;
    if (latest?.bomNumber) {
      const parts = latest.bomNumber.split('-');
      const lastSequence = parseInt(parts[parts.length - 1] || '0', 10);
      sequence = lastSequence + 1;
    }

    return `${prefix}-${sequence.toString().padStart(4, '0')}`;
  }
}
