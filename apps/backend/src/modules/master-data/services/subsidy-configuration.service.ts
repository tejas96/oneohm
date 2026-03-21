import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ProjectType, type SubsidyTier } from '@oneohm-epc/shared/types';

import {
  CreateSubsidyConfigurationDto,
  UpdateSubsidyConfigurationDto,
} from '../dto/subsidy-configuration';
import { SubsidyConfiguration } from '../entities/subsidy-configuration.entity';
import { SubsidyConfigurationRepository } from '../repositories/subsidy-configuration.repository';

@Injectable()
export class SubsidyConfigurationService {
  constructor(private readonly subsidyConfigurationRepository: SubsidyConfigurationRepository) {}

  async findAll(
    organizationId: string,
    filters?: { projectType?: ProjectType; isActive?: boolean; search?: string },
  ): Promise<SubsidyConfiguration[]> {
    return this.subsidyConfigurationRepository.findAll(organizationId, filters);
  }

  async findById(id: string, organizationId: string): Promise<SubsidyConfiguration> {
    const config = await this.subsidyConfigurationRepository.findById(id, organizationId);
    if (!config) throw new NotFoundException('Subsidy configuration not found');
    return config;
  }

  async create(
    organizationId: string,
    dto: CreateSubsidyConfigurationDto,
    createdBy?: string,
  ): Promise<SubsidyConfiguration> {
    const effectiveFrom = dto.effectiveFrom
      ? this.toDate(dto.effectiveFrom, 'effectiveFrom')
      : null;
    const effectiveTo = dto.effectiveTo ? this.toDate(dto.effectiveTo, 'effectiveTo') : null;
    this.validateDateRange(effectiveFrom, effectiveTo);

    const tiers = this.normalizeTiers(dto.tiers);
    return this.subsidyConfigurationRepository.create(organizationId, {
      ...dto,
      tiers,
      effectiveFrom: effectiveFrom ?? undefined,
      effectiveTo: effectiveTo ?? undefined,
      createdBy,
    });
  }

  async update(
    id: string,
    organizationId: string,
    dto: UpdateSubsidyConfigurationDto,
    updatedBy?: string,
  ): Promise<SubsidyConfiguration> {
    const existing = await this.findById(id, organizationId);

    const effectiveFrom = dto.effectiveFrom
      ? this.toDate(dto.effectiveFrom, 'effectiveFrom')
      : (existing.effectiveFrom ?? null);
    const effectiveTo = dto.effectiveTo
      ? this.toDate(dto.effectiveTo, 'effectiveTo')
      : (existing.effectiveTo ?? null);
    this.validateDateRange(effectiveFrom, effectiveTo);

    const tiers = this.normalizeTiers(dto.tiers);
    return this.subsidyConfigurationRepository.update(id, organizationId, {
      ...dto,
      tiers,
      effectiveFrom: effectiveFrom ?? undefined,
      effectiveTo: effectiveTo ?? undefined,
      updatedBy,
    });
  }

  async delete(id: string, organizationId: string): Promise<void> {
    await this.findById(id, organizationId);
    await this.subsidyConfigurationRepository.delete(id, organizationId);
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
