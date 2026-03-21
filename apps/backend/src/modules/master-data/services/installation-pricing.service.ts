import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  CreateInstallationPricingDto,
  UpdateInstallationPricingDto,
} from '../dto/installation-pricing';
import { InstallationPricing } from '../entities/installation-pricing.entity';
import { InstallationPricingRepository } from '../repositories/installation-pricing.repository';

export interface PaginatedInstallationPricing {
  data: InstallationPricing[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

@Injectable()
export class InstallationPricingService {
  constructor(private readonly installationPricingRepository: InstallationPricingRepository) {}

  async findAll(
    organizationId: string,
    filters?: { isActive?: boolean; search?: string; page?: number; limit?: number },
  ): Promise<PaginatedInstallationPricing> {
    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 20;
    const { data, total } = await this.installationPricingRepository.findAll(organizationId, {
      ...filters,
      page,
      limit,
    });
    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    };
  }

  /** Fetch all tiers without pagination — used internally for duplicate checks */
  private async findAllRaw(organizationId: string): Promise<InstallationPricing[]> {
    const { data } = await this.installationPricingRepository.findAll(organizationId, {
      page: 1,
      limit: 10_000,
    });
    return data;
  }

  async findById(id: string, organizationId: string): Promise<InstallationPricing> {
    const pricing = await this.installationPricingRepository.findById(id, organizationId);
    if (!pricing) {
      throw new NotFoundException(`Installation pricing tier not found`);
    }
    return pricing;
  }

  async create(
    organizationId: string,
    dto: CreateInstallationPricingDto,
  ): Promise<InstallationPricing> {
    this.validateRange(dto.minSystemSizeKw, dto.maxSystemSizeKw ?? null);

    // Check for duplicate tier (same min/max in same org)
    const existing = await this.findAllRaw(organizationId);
    const duplicate = existing.find(
      (p) =>
        Number(p.minSystemSizeKw) === dto.minSystemSizeKw &&
        (p.maxSystemSizeKw == null
          ? dto.maxSystemSizeKw == null
          : Number(p.maxSystemSizeKw) === dto.maxSystemSizeKw),
    );
    if (duplicate) {
      throw new ConflictException(
        `A pricing tier for ${dto.minSystemSizeKw}–${dto.maxSystemSizeKw ?? '∞'} KW already exists`,
      );
    }

    return this.installationPricingRepository.create(organizationId, {
      ...dto,
      effectiveFrom: new Date(dto.effectiveFrom),
      effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : null,
    });
  }

  async update(
    id: string,
    organizationId: string,
    dto: UpdateInstallationPricingDto,
  ): Promise<InstallationPricing> {
    const current = await this.findById(id, organizationId);

    const mergedMin = dto.minSystemSizeKw ?? Number(current.minSystemSizeKw);
    const mergedMax =
      dto.maxSystemSizeKw !== undefined
        ? dto.maxSystemSizeKw
        : current.maxSystemSizeKw != null
          ? Number(current.maxSystemSizeKw)
          : null;

    if (dto.minSystemSizeKw !== undefined || dto.maxSystemSizeKw !== undefined) {
      this.validateRange(mergedMin, mergedMax);
    }

    const existingTiers = await this.findAllRaw(organizationId);
    const duplicate = existingTiers.find(
      (p) =>
        p.id !== id &&
        Number(p.minSystemSizeKw) === mergedMin &&
        (p.maxSystemSizeKw == null ? mergedMax == null : Number(p.maxSystemSizeKw) === mergedMax),
    );
    if (duplicate) {
      throw new ConflictException(
        `A pricing tier for ${mergedMin}–${mergedMax ?? '∞'} KW already exists`,
      );
    }

    const updateData = { ...dto } as unknown as Partial<InstallationPricing>;
    if (dto.effectiveFrom) {
      updateData.effectiveFrom = new Date(dto.effectiveFrom);
    }
    if (dto.effectiveTo) {
      updateData.effectiveTo = new Date(dto.effectiveTo);
    }

    return this.installationPricingRepository.update(id, organizationId, updateData);
  }

  async delete(id: string, organizationId: string): Promise<void> {
    await this.findById(id, organizationId);
    await this.installationPricingRepository.delete(id, organizationId);
  }

  private validateRange(min: number, max: number | null): void {
    if (max !== null && max < min) {
      throw new BadRequestException(
        `maxSystemSizeKw (${max}) must be greater than or equal to minSystemSizeKw (${min})`,
      );
    }
    if (min < 0) {
      throw new BadRequestException('minSystemSizeKw must be >= 0');
    }
  }
}
