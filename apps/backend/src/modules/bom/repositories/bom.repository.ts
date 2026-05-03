import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';

import { OrganizationEntity } from '../../organizations/entities/organization.entity';
import { BomEntity } from '../entities/bom.entity';

@Injectable()
export class BomRepository {
  constructor(
    @InjectRepository(BomEntity)
    private readonly repository: Repository<BomEntity>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Persist a new BOM with all its items atomically.
   * Wraps generateBomNumber (which uses a pessimistic write lock) and the
   * subsequent INSERT inside a single transaction so the lock is always held
   * within an open transaction context.
   */
  async create(data: Partial<BomEntity>): Promise<BomEntity> {
    return this.dataSource.transaction(async (manager) => {
      // Resolve the org code within the transaction context
      const org = await manager
        .getRepository(OrganizationEntity)
        .findOne({ where: { id: data.organizationId } });
      if (!org) {
        throw new Error(`Organization ${data.organizationId} not found`);
      }

      const bomNumber = await this.generateBomNumber(org.code, manager);
      const repo = manager.getRepository(BomEntity);
      return repo.save(repo.create({ ...data, bomNumber }));
    });
  }

  async findByEntity(
    organizationId: string,
    entityType: string,
    entityId: string,
  ): Promise<BomEntity | null> {
    return this.repository.findOne({
      where: { organizationId, entityType, entityId },
      relations: ['items'],
      order: { items: { sortOrder: 'ASC' } },
    });
  }

  async findByEntityId(id: string, organizationId: string): Promise<BomEntity | null> {
    return this.repository.findOne({
      where: { id, organizationId },
      relations: ['items'],
      order: { items: { sortOrder: 'ASC' } },
    });
  }

  /**
   * Delete the BOM for a given entity, scoped to the organization.
   * organizationId prevents cross-tenant deletion.
   */
  async deleteByEntity(
    organizationId: string,
    entityType: string,
    entityId: string,
  ): Promise<void> {
    const bom = await this.repository.findOne({
      where: { organizationId, entityType, entityId },
    });
    if (bom) {
      await this.repository.remove(bom);
    }
  }

  /**
   * Generate a sequential, org-scoped BOM number.
   * Pattern: BOM-{ORG_CODE}-{YEAR}-{NNNN}
   *
   * MUST be called inside an open transaction (manager must be provided) so
   * the pessimistic write lock is valid. The public `create()` method handles
   * this automatically.
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
