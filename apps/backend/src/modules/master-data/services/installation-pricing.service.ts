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

@Injectable()
export class InstallationPricingService {
  constructor(private readonly installationPricingRepository: InstallationPricingRepository) {}

  async findAll(
    organizationId: string,
    filters?: { isActive?: boolean; search?: string },
  ): Promise<InstallationPricing[]> {
    return this.installationPricingRepository.findAll(organizationId, filters);
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
    const existing = await this.installationPricingRepository.findAll(organizationId);
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
    await this.findById(id, organizationId);

    if (dto.minSystemSizeKw !== undefined || dto.maxSystemSizeKw !== undefined) {
      const current = await this.findById(id, organizationId);
      const newMin = dto.minSystemSizeKw ?? Number(current.minSystemSizeKw);
      const newMax =
        dto.maxSystemSizeKw !== undefined
          ? dto.maxSystemSizeKw
          : current.maxSystemSizeKw != null
            ? Number(current.maxSystemSizeKw)
            : null;
      this.validateRange(newMin, newMax);
    }

    const updateData: Partial<InstallationPricing> = { ...dto } as any;
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
    if (max !== null && max <= min) {
      throw new BadRequestException(
        `maxSystemSizeKw (${max}) must be greater than minSystemSizeKw (${min})`,
      );
    }
    if (min < 0) {
      throw new BadRequestException('minSystemSizeKw must be >= 0');
    }
  }
}
