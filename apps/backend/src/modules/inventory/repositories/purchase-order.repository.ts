import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PaymentStatus, PurchaseOrderStatus, PurchaseOrderType } from '@tejas96/shared/types';
import { EntityManager, In, IsNull, Not, Repository } from 'typeorm';

import { PurchaseOrderEntity } from '../entities/purchase-order.entity';

/**
 * Purchase Order Repository
 * Handles database operations for purchase orders
 */
@Injectable()
export class PurchaseOrderRepository {
  constructor(
    @InjectRepository(PurchaseOrderEntity)
    private readonly repository: Repository<PurchaseOrderEntity>,
  ) {}

  /**
   * Create a new purchase order
   */
  async create(poData: Partial<PurchaseOrderEntity>): Promise<PurchaseOrderEntity> {
    const po = this.repository.create(poData);
    return this.repository.save(po);
  }

  /**
   * Find purchase order by ID with relations
   */
  async findById(id: string, organizationId: string): Promise<PurchaseOrderEntity> {
    const po = await this.repository.findOne({
      where: { id, organizationId, deletedAt: IsNull() },
      relations: ['vendor', 'warehouse', 'project', 'items', 'items.product', 'creator', 'updater'],
    });

    if (!po) {
      throw new NotFoundException(`Purchase Order with ID ${id} not found`);
    }

    return po;
  }

  /**
   * Find purchase order by PO number
   */
  async findByPoNumber(
    poNumber: string,
    organizationId: string,
  ): Promise<PurchaseOrderEntity | null> {
    return this.repository.findOne({
      where: { poNumber, organizationId, deletedAt: IsNull() },
      relations: ['vendor', 'items'],
    });
  }

  /**
   * Find all purchase orders with filters and pagination
   */
  async findAll(
    organizationId: string,
    page = 1,
    limit = 20,
    filters?: {
      status?: PurchaseOrderStatus;
      paymentStatus?: PaymentStatus;
      poType?: PurchaseOrderType;
      vendorId?: string;
      warehouseId?: string;
      projectId?: string;
      fromDate?: string;
      toDate?: string;
      search?: string;
    },
  ): Promise<{ purchaseOrders: PurchaseOrderEntity[]; total: number }> {
    const query = this.repository
      .createQueryBuilder('po')
      .leftJoinAndSelect('po.vendor', 'vendor')
      .leftJoinAndSelect('po.warehouse', 'warehouse')
      .leftJoinAndSelect('po.project', 'project')
      .where('po.organizationId = :organizationId', { organizationId })
      .andWhere('po.deletedAt IS NULL');

    // Apply filters
    if (filters?.status) {
      query.andWhere('po.status = :status', { status: filters.status });
    }

    if (filters?.paymentStatus) {
      query.andWhere('po.paymentStatus = :paymentStatus', { paymentStatus: filters.paymentStatus });
    }

    if (filters?.poType) {
      query.andWhere('po.poType = :poType', { poType: filters.poType });
    }

    if (filters?.vendorId) {
      query.andWhere('po.vendorId = :vendorId', { vendorId: filters.vendorId });
    }

    if (filters?.warehouseId) {
      query.andWhere('po.warehouseId = :warehouseId', { warehouseId: filters.warehouseId });
    }

    if (filters?.projectId) {
      query.andWhere('po.projectId = :projectId', { projectId: filters.projectId });
    }

    if (filters?.fromDate) {
      query.andWhere('po.poDate >= :fromDate', { fromDate: filters.fromDate });
    }

    if (filters?.toDate) {
      query.andWhere('po.poDate <= :toDate', { toDate: filters.toDate });
    }

    if (filters?.search) {
      query.andWhere('(po.poNumber ILIKE :search OR vendor.name ILIKE :search)', {
        search: `%${filters.search}%`,
      });
    }

    // Pagination
    const skip = (page - 1) * limit;
    query.skip(skip).take(limit);

    // Order by
    query.orderBy('po.poDate', 'DESC').addOrderBy('po.createdAt', 'DESC');

    const [purchaseOrders, total] = await query.getManyAndCount();

    return { purchaseOrders, total };
  }

  /**
   * Update purchase order
   */
  async update(
    id: string,
    organizationId: string,
    updateData: Record<string, unknown>,
  ): Promise<PurchaseOrderEntity> {
    const po = await this.findById(id, organizationId);

    Object.assign(po, updateData);

    return this.repository.save(po);
  }

  /**
   * Soft delete purchase order
   */
  async softDelete(id: string, organizationId: string, deletedBy: string): Promise<void> {
    const po = await this.findById(id, organizationId);

    po.deletedAt = new Date();
    po.updatedBy = deletedBy;

    await this.repository.save(po);
  }

  /**
   * Count purchase orders by status
   */
  async countByStatus(organizationId: string): Promise<Record<PurchaseOrderStatus, number>> {
    const result = await this.repository
      .createQueryBuilder('po')
      .select('po.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('po.organizationId = :organizationId', { organizationId })
      .andWhere('po.deletedAt IS NULL')
      .groupBy('po.status')
      .getRawMany<{ status: PurchaseOrderStatus; count: string }>();

    const counts: Record<PurchaseOrderStatus, number> = {
      [PurchaseOrderStatus.DRAFT]: 0,
      [PurchaseOrderStatus.PENDING_APPROVAL]: 0,
      [PurchaseOrderStatus.APPROVED]: 0,
      [PurchaseOrderStatus.SENT]: 0,
      [PurchaseOrderStatus.CONFIRMED]: 0,
      [PurchaseOrderStatus.PARTIALLY_RECEIVED]: 0,
      [PurchaseOrderStatus.RECEIVED]: 0,
      [PurchaseOrderStatus.CANCELLED]: 0,
    };

    for (const row of result) {
      counts[row.status] = parseInt(row.count, 10);
    }

    return counts;
  }

  /**
   * Get total purchase order value by status
   */
  async getTotalValueByStatus(
    organizationId: string,
    status: PurchaseOrderStatus,
  ): Promise<number> {
    const result = await this.repository
      .createQueryBuilder('po')
      .select('SUM(po.totalAmount)', 'totalValue')
      .where('po.organizationId = :organizationId', { organizationId })
      .andWhere('po.status = :status', { status })
      .andWhere('po.deletedAt IS NULL')
      .getRawOne<{ totalValue: string }>();

    return result?.totalValue ? parseFloat(result.totalValue) : 0;
  }

  /**
   * Get pending approvals count
   */
  async getPendingApprovalsCount(organizationId: string): Promise<number> {
    return this.repository.count({
      where: {
        organizationId,
        status: PurchaseOrderStatus.PENDING_APPROVAL,
        deletedAt: IsNull(),
      },
    });
  }

  /**
   * Get overdue purchase orders
   */
  async getOverduePurchaseOrders(organizationId: string): Promise<PurchaseOrderEntity[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return this.repository
      .createQueryBuilder('po')
      .leftJoinAndSelect('po.vendor', 'vendor')
      .leftJoinAndSelect('po.warehouse', 'warehouse')
      .where('po.organizationId = :organizationId', { organizationId })
      .andWhere('po.expectedDeliveryDate < :today', { today })
      .andWhere('po.status IN (:...statuses)', {
        statuses: [
          PurchaseOrderStatus.SENT,
          PurchaseOrderStatus.CONFIRMED,
          PurchaseOrderStatus.PARTIALLY_RECEIVED,
        ],
      })
      .andWhere('po.deletedAt IS NULL')
      .orderBy('po.expectedDeliveryDate', 'ASC')
      .getMany();
  }

  /**
   * True if the vendor has any non-deleted PO in this org that is not cancelled or fully received.
   */
  async hasActivePOs(vendorId: string, organizationId: string): Promise<boolean> {
    const po = await this.repository.findOne({
      where: {
        vendorId,
        organizationId,
        deletedAt: IsNull(),
        status: Not(In([PurchaseOrderStatus.CANCELLED, PurchaseOrderStatus.RECEIVED])),
      },
      select: ['id'],
    });

    return po !== null;
  }

  /**
   * Generate next PO number (concurrency-safe via numbering_sequences)
   */
  async generatePoNumber(organizationId: string, manager?: EntityManager): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const sequenceKey = `po-${year}-${month}`;
    const yyyymm = `${year}${month}`;

    const exec = manager ?? this.repository.manager;
    const result = await exec.query(
      `INSERT INTO numbering_sequences (organization_id, sequence_key, last_value)
       VALUES ($1, $2, 1)
       ON CONFLICT (organization_id, sequence_key)
       DO UPDATE SET last_value = numbering_sequences.last_value + 1
       RETURNING last_value`,
      [organizationId, sequenceKey],
    );

    const raw = result[0]?.last_value;
    const seq = typeof raw === 'string' ? parseInt(raw, 10) : (raw ?? 1);
    return `PO-${yyyymm}-${String(seq).padStart(4, '0')}`;
  }
}
