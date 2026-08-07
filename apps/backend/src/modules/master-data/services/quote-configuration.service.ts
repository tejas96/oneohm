import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { ProfitMarginTier } from '@tejas96/shared/types';

import {
  CreateQuoteConfigurationDto,
  ProfitMarginTierDto,
  UpdateQuoteConfigurationDto,
} from '../dto/quote-configuration';
import { QuoteConfiguration } from '../entities/quote-configuration.entity';
import { QuoteConfigurationRepository } from '../repositories/quote-configuration.repository';

const PG_FK_VIOLATION_CODE = '23503';

@Injectable()
export class QuoteConfigurationService {
  constructor(private readonly quoteConfigurationRepository: QuoteConfigurationRepository) {}

  async getActive(): Promise<QuoteConfiguration> {
    return this.quoteConfigurationRepository.getOrCreateDefault();
  }

  async findById(id: string): Promise<QuoteConfiguration> {
    const config = await this.quoteConfigurationRepository.findById(id);
    if (!config) throw new NotFoundException('Quote configuration not found');
    return config;
  }

  async create(
    dto: CreateQuoteConfigurationDto,
    createdBy?: string,
  ): Promise<QuoteConfiguration> {
    if (dto.gstConfig) {
      const { rate1Percentage, rate2Percentage } = dto.gstConfig;
      if (rate1Percentage !== undefined && rate2Percentage !== undefined) {
        this.assertGstPercentagesSum100(rate1Percentage, rate2Percentage);
      }
    }
    if (dto.paymentMilestones && dto.paymentMilestones.length > 0) {
      this.assertPaymentMilestonesSum100(dto.paymentMilestones);
    }
    const { profitMarginTiers: profitMarginTiersDto, ...createRest } = dto;
    if (profitMarginTiersDto !== undefined) {
      this.validateProfitMarginTiers(this.normalizeProfitMarginTiers(profitMarginTiersDto));
    }
    try {
      return await this.quoteConfigurationRepository.create({
        ...createRest,
        ...(profitMarginTiersDto !== undefined && {
          profitMarginTiers: this.normalizeProfitMarginTiers(profitMarginTiersDto),
        }),
        createdBy,
      });
    } catch (error: unknown) {
      const err = error as { code?: string };
      if (err?.code === PG_FK_VIOLATION_CODE) {
        throw new BadRequestException(`Invalid organization ID: `);
      }
      throw error;
    }
  }

  async update(
    id: string,
    dto: UpdateQuoteConfigurationDto,
    updatedBy?: string,
  ): Promise<QuoteConfiguration> {
    if (dto.gstConfig) {
      const { rate1Percentage, rate2Percentage } = dto.gstConfig;
      if (rate1Percentage !== undefined && rate2Percentage !== undefined) {
        this.assertGstPercentagesSum100(rate1Percentage, rate2Percentage);
      }
    }
    if (dto.paymentMilestones && dto.paymentMilestones.length > 0) {
      this.assertPaymentMilestonesSum100(dto.paymentMilestones);
    }
    const { profitMarginTiers: profitMarginTiersDto, ...updateRest } = dto;
    if (profitMarginTiersDto !== undefined) {
      this.validateProfitMarginTiers(this.normalizeProfitMarginTiers(profitMarginTiersDto));
    }
    await this.findById(id);
    const updated = await this.quoteConfigurationRepository.update(id, {
      ...updateRest,
      ...(profitMarginTiersDto !== undefined && {
        profitMarginTiers: this.normalizeProfitMarginTiers(profitMarginTiersDto),
      }),
      updatedBy,
    });

    if (updateRest.isActive === true) {
      return this.quoteConfigurationRepository.setActive(id);
    }

    return updated;
  }

  private assertGstPercentagesSum100(rate1Percentage: number, rate2Percentage: number): void {
    const PERCENTAGE_TOLERANCE = 0.01;
    const total = rate1Percentage + rate2Percentage;
    if (Math.abs(total - 100) > PERCENTAGE_TOLERANCE) {
      throw new BadRequestException(`GST split percentages must total 100% (currently ${total}%)`);
    }
  }

  private assertPaymentMilestonesSum100(milestones: { percentage: number }[]): void {
    const PERCENTAGE_TOLERANCE = 0.01;
    const total = milestones.reduce((sum, m) => sum + m.percentage, 0);
    if (Math.abs(total - 100) > PERCENTAGE_TOLERANCE) {
      throw new BadRequestException(`Payment milestones must total 100% (currently ${total}%)`);
    }
  }

  private normalizeProfitMarginTiers(dtos: ProfitMarginTierDto[]): ProfitMarginTier[] {
    return dtos.map((t) => ({
      minSystemSizeKw: t.minSystemSizeKw,
      maxSystemSizeKw: t.maxSystemSizeKw ?? null,
      marginPercent: t.marginPercent,
    }));
  }

  private validateProfitMarginTiers(tiers: ProfitMarginTier[]): void {
    for (let i = 0; i < tiers.length; i++) {
      const tier = tiers[i]!;
      if (tier.marginPercent < 0) {
        throw new BadRequestException(`Profit margin tier ${i + 1}: margin must be >= 0`);
      }
      if (tier.maxSystemSizeKw !== null) {
        if (tier.maxSystemSizeKw < tier.minSystemSizeKw) {
          throw new BadRequestException(
            `Profit margin tier ${i + 1}: max system size must be >= min system size`,
          );
        }
      }
    }
    for (let i = 0; i < tiers.length; i++) {
      for (let j = i + 1; j < tiers.length; j++) {
        if (this.profitMarginTiersOverlap(tiers[i]!, tiers[j]!)) {
          throw new BadRequestException(
            `Profit margin tiers ${i + 1} and ${j + 1} have overlapping system size ranges`,
          );
        }
      }
    }
  }

  private profitMarginTiersOverlap(a: ProfitMarginTier, b: ProfitMarginTier): boolean {
    const endA = a.maxSystemSizeKw ?? Number.POSITIVE_INFINITY;
    const endB = b.maxSystemSizeKw ?? Number.POSITIVE_INFINITY;
    return a.minSystemSizeKw <= endB && b.minSystemSizeKw <= endA;
  }
}
