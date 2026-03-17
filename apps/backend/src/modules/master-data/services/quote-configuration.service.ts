import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import {
  CreateQuoteConfigurationDto,
  UpdateQuoteConfigurationDto,
} from '../dto/quote-configuration';
import { QuoteConfiguration } from '../entities/quote-configuration.entity';
import { QuoteConfigurationRepository } from '../repositories/quote-configuration.repository';

@Injectable()
export class QuoteConfigurationService {
  constructor(private readonly quoteConfigurationRepository: QuoteConfigurationRepository) {}

  async getActive(organizationId: string): Promise<QuoteConfiguration> {
    return this.quoteConfigurationRepository.getOrCreateDefault(organizationId);
  }

  async findById(id: string, organizationId: string): Promise<QuoteConfiguration> {
    const config = await this.quoteConfigurationRepository.findById(id, organizationId);
    if (!config) throw new NotFoundException('Quote configuration not found');
    return config;
  }

  async create(
    organizationId: string,
    dto: CreateQuoteConfigurationDto,
    createdBy?: string,
  ): Promise<QuoteConfiguration> {
    try {
      return await this.quoteConfigurationRepository.create(organizationId, {
        ...dto,
        createdBy,
      });
    } catch (error: unknown) {
      const err = error as { code?: string };
      if (err?.code === '23503') {
        throw new BadRequestException(`Invalid organization ID: ${organizationId}`);
      }
      throw error;
    }
  }

  async update(
    id: string,
    organizationId: string,
    dto: UpdateQuoteConfigurationDto,
    updatedBy?: string,
  ): Promise<QuoteConfiguration> {
    await this.findById(id, organizationId);
    const updated = await this.quoteConfigurationRepository.update(id, organizationId, {
      ...dto,
      updatedBy,
    });

    if (dto.isActive === true) {
      return this.quoteConfigurationRepository.setActive(id, organizationId);
    }

    return updated;
  }
}
