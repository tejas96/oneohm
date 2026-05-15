import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { StockAllocationService } from './stock-allocation.service';
import { CreateReturnRequestDto } from '../dto/return-requests/create-return-request.dto';
import { ReturnRequestEntity, type ReturnRequestStatus } from '../entities/return-request.entity';
import { StockAllocationEntity } from '../entities/stock-allocation.entity';

@Injectable()
export class ReturnRequestService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly stockAllocationService: StockAllocationService,
  ) {}

  /**
   * Create a return request manually or via BOM reconcile (over-dispatch path).
   */
  async create(
    organizationId: string,
    dto: CreateReturnRequestDto,
    createdBy: string,
  ): Promise<ReturnRequestEntity> {
    const repo = this.dataSource.getRepository(ReturnRequestEntity);

    // Validate the allocation belongs to this org
    const allocationRepo = this.dataSource.getRepository(StockAllocationEntity);
    const allocation = await allocationRepo.findOne({
      where: { id: dto.allocationId, organizationId },
    });
    if (!allocation) {
      throw new NotFoundException(`Stock allocation ${dto.allocationId} not found`);
    }

    const request = repo.create({
      organizationId,
      allocationId: dto.allocationId,
      bomId: dto.bomId,
      quantity: dto.quantity,
      reason: dto.reason,
      status: 'pending',
      createdBy,
    });
    return repo.save(request);
  }

  /**
   * List return requests with optional filters.
   */
  async list(
    organizationId: string,
    filters?: {
      status?: ReturnRequestStatus;
      bomId?: string;
      allocationId?: string;
    },
  ): Promise<ReturnRequestEntity[]> {
    const repo = this.dataSource.getRepository(ReturnRequestEntity);
    const query = repo
      .createQueryBuilder('rr')
      .where('rr.organizationId = :organizationId', { organizationId })
      .orderBy('rr.createdAt', 'DESC');

    if (filters?.status) {
      query.andWhere('rr.status = :status', { status: filters.status });
    }
    if (filters?.bomId) {
      query.andWhere('rr.bomId = :bomId', { bomId: filters.bomId });
    }
    if (filters?.allocationId) {
      query.andWhere('rr.allocationId = :allocationId', { allocationId: filters.allocationId });
    }

    return query.getMany();
  }

  async findById(id: string, organizationId: string): Promise<ReturnRequestEntity> {
    const repo = this.dataSource.getRepository(ReturnRequestEntity);
    const request = await repo.findOne({ where: { id, organizationId } });
    if (!request) throw new NotFoundException(`Return request ${id} not found`);
    return request;
  }

  /**
   * Complete a return request — PM has physically received the units.
   * Calls StockAllocationService.returnToStock to move qty back to available.
   */
  async complete(
    id: string,
    organizationId: string,
    completedBy: string,
  ): Promise<ReturnRequestEntity> {
    const request = await this.findById(id, organizationId);

    if (request.status === 'completed') {
      throw new BadRequestException('Return request is already completed');
    }
    if (request.status === 'cancelled') {
      throw new BadRequestException('Cannot complete a cancelled return request');
    }

    // Execute the physical return to stock
    await this.stockAllocationService.returnToStock(
      request.allocationId,
      organizationId,
      request.quantity,
      request.reason,
      completedBy,
    );

    const repo = this.dataSource.getRepository(ReturnRequestEntity);
    await repo.update(id, {
      status: 'completed',
      completedAt: new Date(),
      completedBy,
    });

    return this.findById(id, organizationId);
  }

  /**
   * Cancel a return request — PM accepts the over-dispatch (scope creep / write-off).
   * No inventory change; the dispatched excess is simply accepted.
   */
  async cancel(
    id: string,
    organizationId: string,
    cancelledBy: string,
  ): Promise<ReturnRequestEntity> {
    const request = await this.findById(id, organizationId);

    if (request.status === 'completed') {
      throw new BadRequestException('Cannot cancel a completed return request');
    }
    if (request.status === 'cancelled') {
      throw new BadRequestException('Return request is already cancelled');
    }

    const repo = this.dataSource.getRepository(ReturnRequestEntity);
    await repo.update(id, { status: 'cancelled', completedBy: cancelledBy });
    return this.findById(id, organizationId);
  }
}
