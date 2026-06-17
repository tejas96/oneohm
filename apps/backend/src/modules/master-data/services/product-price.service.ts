import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ProjectType } from '@tejas96/shared/types';

import { CreateProductPriceDto, UpdateProductPriceDto } from '../dto/product-prices';
import { ProductPriceEntity } from '../entities/product-price.entity';
import { ProductPriceRepository } from '../repositories/product-price.repository';
import { ProductRepository } from '../repositories/product.repository';

@Injectable()
export class ProductPriceService {
  constructor(
    private readonly productPriceRepository: ProductPriceRepository,
    private readonly productRepository: ProductRepository,
  ) {}

  async findAll(
    organizationId: string,
    productId: string,
    filters?: { isActive?: boolean },
  ): Promise<ProductPriceEntity[]> {
    await this.assertProductExists(productId, organizationId);
    const prices = await this.productPriceRepository.findAllByProductId(organizationId, productId);
    if (filters?.isActive === undefined) return prices;
    return prices.filter((price) => price.isActive === filters.isActive);
  }

  async create(
    organizationId: string,
    productId: string,
    dto: CreateProductPriceDto,
    createdBy?: string,
  ): Promise<ProductPriceEntity> {
    await this.assertProductExists(productId, organizationId);

    const effectiveFrom = this.toDate(dto.effectiveFrom, 'effectiveFrom');
    const effectiveTo = dto.effectiveTo ? this.toDate(dto.effectiveTo, 'effectiveTo') : undefined;

    this.validateDateRange(effectiveFrom, effectiveTo);

    await this.deactivateExistingPrices(organizationId, productId, dto.projectType, effectiveFrom);

    return this.productPriceRepository.create(organizationId, {
      ...dto,
      productId,
      effectiveFrom,
      effectiveTo,
      isActive: true,
      createdBy,
    });
  }

  async update(
    id: string,
    organizationId: string,
    productId: string,
    dto: UpdateProductPriceDto,
    updatedBy?: string,
  ): Promise<ProductPriceEntity> {
    await this.assertProductExists(productId, organizationId);
    const existing = await this.findById(id, organizationId, productId);
    const hasProjectTypeUpdate = Object.prototype.hasOwnProperty.call(dto, 'projectType');

    const effectiveFrom = dto.effectiveFrom
      ? this.toDate(dto.effectiveFrom, 'effectiveFrom')
      : existing.effectiveFrom;
    const effectiveTo = dto.effectiveTo
      ? this.toDate(dto.effectiveTo, 'effectiveTo')
      : existing.effectiveTo;

    this.validateDateRange(effectiveFrom, effectiveTo);

    const nextProjectType = hasProjectTypeUpdate
      ? (dto.projectType ?? undefined)
      : (existing.projectType as ProjectType | undefined);

    const nextIsActive = dto.isActive !== undefined ? dto.isActive : existing.isActive;
    const projectTypeChanged =
      hasProjectTypeUpdate && (existing.projectType ?? null) !== (nextProjectType ?? null);
    const touchesScheduleOrActive =
      Object.prototype.hasOwnProperty.call(dto, 'effectiveFrom') ||
      Object.prototype.hasOwnProperty.call(dto, 'effectiveTo') ||
      Object.prototype.hasOwnProperty.call(dto, 'isActive');

    if (nextIsActive && (projectTypeChanged || touchesScheduleOrActive)) {
      await this.deactivateExistingPrices(
        organizationId,
        productId,
        nextProjectType,
        effectiveFrom,
        id,
      );
    }

    const updateData: Partial<ProductPriceEntity> = {
      ...dto,
      updatedBy,
      effectiveFrom,
      effectiveTo,
    };
    if (hasProjectTypeUpdate) {
      updateData.projectType = nextProjectType ?? null;
    }

    return this.productPriceRepository.update(id, organizationId, {
      ...updateData,
    });
  }

  async deactivate(
    id: string,
    organizationId: string,
    productId: string,
    updatedBy?: string,
  ): Promise<ProductPriceEntity> {
    await this.assertProductExists(productId, organizationId, { allowDeleted: true });
    const existing = await this.findById(id, organizationId, productId);
    const effectiveTo = existing.effectiveTo ?? this.today();

    return this.productPriceRepository.update(id, organizationId, {
      isActive: false,
      effectiveTo,
      updatedBy,
    });
  }

  private async findById(
    id: string,
    organizationId: string,
    productId: string,
  ): Promise<ProductPriceEntity> {
    const price = await this.productPriceRepository.findById(id, organizationId, productId);
    if (!price) {
      throw new NotFoundException('Product price not found');
    }
    return price;
  }

  private async assertProductExists(
    productId: string,
    organizationId: string,
    options?: { allowDeleted?: boolean },
  ): Promise<void> {
    const product = options?.allowDeleted
      ? await this.productRepository.findAnyById(productId, organizationId)
      : await this.productRepository.findById(productId, organizationId);
    if (!product) {
      throw new NotFoundException('Product not found');
    }
  }

  private async deactivateExistingPrices(
    organizationId: string,
    productId: string,
    projectType: ProjectType | undefined,
    effectiveFrom: Date,
    exceptId?: string,
  ): Promise<void> {
    const prices = await this.productPriceRepository.findAllByProductId(organizationId, productId);
    const matching = prices.filter(
      (price) =>
        price.isActive &&
        price.id !== exceptId &&
        (price.projectType ?? null) === (projectType ?? null),
    );

    if (matching.length === 0) return;

    const endDate = this.yesterday(effectiveFrom);
    await Promise.all(
      matching.map((price) =>
        this.productPriceRepository.update(price.id, organizationId, {
          isActive: false,
          effectiveTo: endDate,
        }),
      ),
    );
  }

  private validateDateRange(effectiveFrom: Date, effectiveTo?: Date): void {
    if (effectiveTo && effectiveTo < effectiveFrom) {
      throw new BadRequestException('effectiveTo must be on or after effectiveFrom');
    }
  }

  private toDate(value: string, field: string): Date {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException(`Invalid ${field} date`);
    }
    return parsed;
  }

  private today(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  private yesterday(reference: Date): Date {
    const day = new Date(reference.getFullYear(), reference.getMonth(), reference.getDate());
    day.setDate(day.getDate() - 1);
    return day;
  }
}
