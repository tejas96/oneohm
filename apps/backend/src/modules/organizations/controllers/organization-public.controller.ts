import { Controller, Get, HttpStatus, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';

import { OrganizationResponseDto } from '../dto';
import { OrganizationEntity } from '../entities/organization.entity';
import { OrganizationRepository } from '../repositories/organization.repository';

/**
 * Public Organization Controller
 * No authentication required
 * Used by customers to find their organization during registration
 */
@ApiTags('Public - Organizations')
@Controller('public/organizations')
export class OrganizationPublicController {
  constructor(private readonly organizationRepository: OrganizationRepository) {}

  /**
   * Search organizations by name or code
   * Public endpoint for customer onboarding
   */
  @Get('search')
  @ApiOperation({
    summary: 'Search organizations',
    description: 'Public API to search organizations by name or code for customer registration',
  })
  @ApiQuery({
    name: 'query',
    required: true,
    description: 'Search query (min 3 characters)',
    example: 'Solar Power',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Maximum results to return',
    example: 10,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Organizations matching search query',
    type: [OrganizationResponseDto],
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Query must be at least 3 characters',
  })
  async searchOrganizations(
    @Query('query') query: string,
    @Query('limit') limit?: number,
  ): Promise<OrganizationResponseDto[]> {
    const searchLimit = limit ? Math.min(limit, 50) : 10;

    if (!query || query.length < 3) {
      return [];
    }

    const result = await this.organizationRepository.findAll({
      limit: searchLimit,
      offset: 0,
    });

    const searchLower = query.toLowerCase();
    const filtered = result.items.filter((org: OrganizationEntity) => {
      return (
        org.name.toLowerCase().includes(searchLower) || org.code.toLowerCase().includes(searchLower)
      );
    });

    return filtered.map((org: OrganizationEntity) =>
      plainToInstance(OrganizationResponseDto, org, {
        excludeExtraneousValues: true,
      }),
    );
  }

  /**
   * Get organization by code
   * Public endpoint for validating organization during registration
   */
  @Get('by-code')
  @ApiOperation({
    summary: 'Get organization by code',
    description: 'Public API to get organization details by code',
  })
  @ApiQuery({
    name: 'code',
    required: true,
    description: 'Organization code',
    example: 'SOLAR_INDIA',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Organization found',
    type: OrganizationResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Organization not found',
  })
  async getOrganizationByCode(
    @Query('code') code: string,
  ): Promise<OrganizationResponseDto | null> {
    if (!code) {
      return null;
    }

    const organization = await this.organizationRepository.findOneByCode(code);

    if (!organization) {
      return null;
    }

    return plainToInstance(OrganizationResponseDto, organization, {
      excludeExtraneousValues: true,
    });
  }
}
