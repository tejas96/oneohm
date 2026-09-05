import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ProjectType, type SubsidyTier } from '@tejas96/shared/types';

import {
  CreateSubsidyConfigurationDto,
  UpdateSubsidyConfigurationDto,
} from '../dto/subsidy-configuration';
import { SubsidyConfiguration } from '../entities/subsidy-configuration.entity';
import { SubsidyConfigurationRepository } from '../repositories/subsidy-configuration.repository';

@Injectable()
export class SubsidyConfigurationService {
  constructor(private readonly subsidyConfigurationRepository: SubsidyConfigurationRepository) {}

  async findAll(filters?: {
    projectType?: ProjectType;
    isActive?: boolean;
    search?: string;
  }): Promise<SubsidyConfiguration[]> {
    return this.subsidyConfigurationRepository.findAll(filters);
  }

  async findById(id: string): Promise<SubsidyConfiguration> {
    const config = await this.subsidyConfigurationRepository.findById(id);
    if (!config) throw new NotFoundException('Subsidy configuration not found');
    return config;
  }

  async create(
    dto: CreateSubsidyConfigurationDto,
    createdBy?: string,
  ): Promise<SubsidyConfiguration> {
    const effectiveFrom = dto.effectiveFrom
      ? this.toDate(dto.effectiveFrom, 'effectiveFrom')
      : null;
    const effectiveTo = dto.effectiveTo ? this.toDate(dto.effectiveTo, 'effectiveTo') : null;
    this.validateDateRange(effectiveFrom, effectiveTo);

    const tiers = this.normalizeTiers(dto.tiers);
    return this.subsidyConfigurationRepository.create({
      ...dto,
      tiers,
      effectiveFrom: effectiveFrom ?? undefined,
      effectiveTo: effectiveTo ?? undefined,
      createdBy,
    });
  }

  async update(
    id: string,
    dto: UpdateSubsidyConfigurationDto,
    updatedBy?: string,
  ): Promise<SubsidyConfiguration> {
    const existing = await this.findById(id);

    // A present-but-null date means "clear it". `?? undefined` on the way out
    // would drop the key and leave the old date in place under a 200 response.
    const effectiveFrom = Object.prototype.hasOwnProperty.call(dto, 'effectiveFrom')
      ? dto.effectiveFrom
        ? this.toDate(dto.effectiveFrom, 'effectiveFrom')
        : null
      : (existing.effectiveFrom ?? null);
    const effectiveTo = Object.prototype.hasOwnProperty.call(dto, 'effectiveTo')
      ? dto.effectiveTo
        ? this.toDate(dto.effectiveTo, 'effectiveTo')
        : null
      : (existing.effectiveTo ?? null);
    this.validateDateRange(effectiveFrom, effectiveTo);

    const tiers = this.normalizeTiers(dto.tiers);
    return this.subsidyConfigurationRepository.update(id, {
      ...dto,
      tiers,
      effectiveFrom,
      effectiveTo,
      updatedBy,
    });
  }

  async delete(id: string): Promise<void> {
    await this.findById(id);
    await this.subsidyConfigurationRepository.delete(id);
  }

  private validateDateRange(effectiveFrom: Date | null, effectiveTo: Date | null): void {
    if (effectiveFrom && effectiveTo && effectiveTo < effectiveFrom) {
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

  private normalizeTiers(
    tiers?: CreateSubsidyConfigurationDto['tiers'],
  ): SubsidyTier[] | undefined {
    if (!tiers) return undefined;
    return tiers.map((tier) => ({
      fromKw: tier.fromKw,
      toKw: tier.toKw ?? null,
      ratePerKw: tier.ratePerKw,
    }));
  }
}
