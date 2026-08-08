import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';

import { ProductPriceEntity } from '../entities/product-price.entity';

@Injectable()
export class ProductPriceRepository {
  constructor(
    @InjectRepository(ProductPriceEntity)
    private readonly repository: Repository<ProductPriceEntity>,
  ) {}

  /**
   * Find active price for a product with project_type fallback.
   * Fallback: exact project_type match > NULL (universal).
   */
  async findActiveForProduct(
    productId: string,
    projectType?: string,
    asOfDate?: Date,
  ): Promise<ProductPriceEntity | null> {
    const date = asOfDate || new Date();
    const dateStr = this.formatDate(date);

    const query = this.repository
      .createQueryBuilder('price')
      .andWhere('price.product_id = :productId', { productId })
      .andWhere('price.is_active = true')
      .andWhere('price.effective_from <= :date', { date: dateStr })
      .andWhere('(price.effective_to IS NULL OR price.effective_to >= :date)', { date: dateStr });

    if (projectType) {
      query.andWhere('(price.project_type = :projectType OR price.project_type IS NULL)', {
        projectType,
      });
      query.orderBy(
        `CASE WHEN price.project_type = :projectType THEN 0 WHEN price.project_type IS NULL THEN 1 END`,
        'ASC',
      );
      query.setParameters({ projectType });
    } else {
      query.orderBy(`CASE WHEN price.project_type IS NULL THEN 0 ELSE 1 END`, 'ASC');
    }

    return query.getOne();
  }

  /**
   * Find active prices for multiple products in a single query.
   * Returns a Map of productId -> ProductPriceEntity.
   */
  async findActiveForProducts(
    productIds: string[],
    projectType?: string,
    asOfDate?: Date,
  ): Promise<Map<string, ProductPriceEntity>> {
    if (productIds.length === 0) return new Map();

    const date = asOfDate || new Date();
    const dateStr = this.formatDate(date);

    const query = this.repository
      .createQueryBuilder('price')
      .andWhere('price.product_id IN (:...productIds)', { productIds })
      .andWhere('price.is_active = true')
      .andWhere('price.effective_from <= :date', { date: dateStr })
      .andWhere('(price.effective_to IS NULL OR price.effective_to >= :date)', { date: dateStr });

    if (projectType) {
      query.andWhere('(price.project_type = :projectType OR price.project_type IS NULL)', {
        projectType,
      });
    }

    query.orderBy('price.productId', 'ASC');
    if (projectType) {
      query.addOrderBy(
        `CASE WHEN price.project_type = :projectType THEN 0 WHEN price.project_type IS NULL THEN 1 ELSE 2 END`,
        'ASC',
      );
    }

    const allPrices = await query.getMany();

    const resultMap = new Map<string, ProductPriceEntity>();
    for (const price of allPrices) {
      if (!resultMap.has(price.productId)) {
        resultMap.set(price.productId, price);
      }
    }

    return resultMap;
  }

  async findAllByProductId(productId: string): Promise<ProductPriceEntity[]> {
    return this.repository.find({
      where: { productId },
      order: { effectiveFrom: 'DESC' },
    });
  }

  async findById(id: string, productId?: string): Promise<ProductPriceEntity | null> {
    return this.repository.findOne({
      where: {
        id,
        ...(productId ? { productId } : {}),
      },
    });
  }

  async create(data: Partial<ProductPriceEntity>): Promise<ProductPriceEntity> {
    const entity = this.repository.create({ ...data });
    return this.repository.save(entity);
  }

  async update(id: string, data: Partial<ProductPriceEntity>): Promise<ProductPriceEntity> {
    await this.repository.update({ id }, {
      ...data,
      updatedAt: new Date(),
    } as QueryDeepPartialEntity<ProductPriceEntity>);
    const updated = await this.repository.findOne({ where: { id } });
    if (!updated) throw new NotFoundException('Product price not found');
    return updated;
  }

  async deactivate(id: string): Promise<void> {
    await this.repository.update({ id }, { isActive: false });
  }

  private formatDate(value: Date): string {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
