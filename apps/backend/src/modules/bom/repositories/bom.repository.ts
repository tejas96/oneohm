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
      relations: ['items', 'items.product', 'items.product.productType', 'items.serials'],
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
   */
  async createForProject(data: {
    projectId: string;
    baselineQuoteVersionId?: string | null;
    createdBy: string;
    notes?: string;
  }): Promise<BomEntity> {
    return this.dataSource.transaction(async (manager) => {
      const bomNumber = await this.generateBomNumber(COMPANY.code, manager);
      const repo = manager.getRepository(BomEntity);
      return repo.save(repo.create({ ...data, bomNumber }));
    });
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
