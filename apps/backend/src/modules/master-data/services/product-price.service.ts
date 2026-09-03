import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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
    productId: string,
    filters?: { isActive?: boolean },
  ): Promise<ProductPriceEntity[]> {
    await this.assertProductExists(productId);
    const prices = await this.productPriceRepository.findAllByProductId(productId);
    if (filters?.isActive === undefined) return prices;
    return prices.filter((price) => price.isActive === filters.isActive);
  }

  async create(
    productId: string,
    dto: CreateProductPriceDto,
    createdBy?: string,
  ): Promise<ProductPriceEntity> {
    await this.assertProductExists(productId);

    const effectiveFrom = this.toDate(dto.effectiveFrom, 'effectiveFrom');
    const effectiveTo = dto.effectiveTo ? this.toDate(dto.effectiveTo, 'effectiveTo') : undefined;

    this.validateDateRange(effectiveFrom, effectiveTo);

    await this.assertNoOverlap(
      productId,
      dto.projectType ?? null,
      this.formatDate(effectiveFrom),
      effectiveTo ? this.formatDate(effectiveTo) : null,
    );

    await this.deactivateExistingPrices(productId, dto.projectType, effectiveFrom);

    return this.productPriceRepository.create({
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
    productId: string,
    dto: UpdateProductPriceDto,
    updatedBy?: string,
  ): Promise<ProductPriceEntity> {
    await this.assertProductExists(productId);
    const existing = await this.findById(id, productId);
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

    if (nextIsActive) {
      await this.assertNoOverlap(
        productId,
        nextProjectType ?? null,
        this.formatDate(effectiveFrom),
        effectiveTo ? this.formatDate(effectiveTo) : null,
        id,
      );
    }

    if (nextIsActive && (projectTypeChanged || touchesScheduleOrActive)) {
      await this.deactivateExistingPrices(productId, nextProjectType, effectiveFrom, id);
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

    return this.productPriceRepository.update(id, {
      ...updateData,
    });
  }

  async deactivate(id: string, productId: string, updatedBy?: string): Promise<ProductPriceEntity> {
    await this.assertProductExists(productId, { allowDeleted: true });
    const existing = await this.findById(id, productId);
    const effectiveTo = existing.effectiveTo ?? this.today();

    return this.productPriceRepository.update(id, {
      isActive: false,
      effectiveTo,
      updatedBy,
    });
  }

  private async findById(id: string, productId: string): Promise<ProductPriceEntity> {
    const price = await this.productPriceRepository.findById(id, productId);
    if (!price) {
      throw new NotFoundException('Product price not found');
    }
    return price;
  }

  private async assertProductExists(
    productId: string,
    options?: { allowDeleted?: boolean },
  ): Promise<void> {
    const product = options?.allowDeleted
      ? await this.productRepository.findAnyById(productId)
      : await this.productRepository.findById(productId);
    if (!product) {
      throw new NotFoundException('Product not found');
    }
  }

  /**
   * An overlapping active price makes resolution ambiguous, and the resolved
   * value is stamped permanently onto BOM lines. Refuse it at write time — that
   * is the only point where a human can still fix it.
   */
  private async assertNoOverlap(
    productId: string,
    projectType: string | null,
    effectiveFrom: string,
    effectiveTo: string | null,
    excludeId?: string,
  ): Promise<void> {
    const clashes = await this.productPriceRepository.findOverlappingActive(
      productId,
      projectType,
      effectiveFrom,
      effectiveTo,
      excludeId,
    );
    if (clashes.length > 0) {
      const windows = clashes
        .map(
          (c) =>
            `${this.formatDate(c.effectiveFrom)} → ${c.effectiveTo ? this.formatDate(c.effectiveTo) : 'open'}`,
        )
        .join(', ');
      throw new ConflictException(
        `An active price for this product and project type already covers that period (${windows}). ` +
          `Set an end date on the existing price first, or deactivate it.`,
      );
    }
  }

  private async deactivateExistingPrices(
    productId: string,
    projectType: ProjectType | undefined,
    effectiveFrom: Date,
    exceptId?: string,
  ): Promise<void> {
    const prices = await this.productPriceRepository.findAllByProductId(productId);
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
        this.productPriceRepository.update(price.id, {
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

  /**
   * TypeORM hydrates a `date`-typed column (ProductPriceEntity.effectiveFrom /
   * effectiveTo) as a plain 'YYYY-MM-DD' string at runtime, not a Date, despite
   * the entity's TS type. Values built locally via toDate() are real Date
   * instances. Accept both so callers don't need to know which they hold.
   */
  private formatDate(value: Date | string): string {
    if (typeof value === 'string') return value.slice(0, 10);
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
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
