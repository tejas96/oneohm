import { Controller, Get, Query, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';

import { OrganizationEntity } from '../../organizations/entities/organization.entity';
import { OrganizationRepository } from '../../organizations/repositories/organization.repository';
import { PlatformOrganizationResponseDto } from '../dto';

/**
 * Public Organization Search Controller
 * No authentication required
 * Used by customers to find their organization
 */
@ApiTags('Public - Organizations')
@Controller('public/organizations')
export class PublicOrganizationController {
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
    type: [PlatformOrganizationResponseDto],
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Query must be at least 3 characters',
  })
  async searchOrganizations(
    @Query('query') query: string,
    @Query('limit') limit?: number,
  ): Promise<PlatformOrganizationResponseDto[]> {
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
      plainToInstance(PlatformOrganizationResponseDto, org, {
        excludeExtraneousValues: true,
      }),
    );
  }

  /**
   * Get organization by code
   * Public endpoint for validating organization during registration
   */
  @Get(':code')
  @ApiOperation({
    summary: 'Get organization by code',
    description: 'Public API to get organization details by code',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Organization found',
    type: PlatformOrganizationResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Organization not found',
  })
  async getOrganizationByCode(
    @Query('code') code: string,
  ): Promise<PlatformOrganizationResponseDto | null> {
    if (!code) {
      return null;
    }

    const organization = await this.organizationRepository.findOneByCode(code);

    if (!organization) {
      return null;
    }

    return plainToInstance(PlatformOrganizationResponseDto, organization, {
      excludeExtraneousValues: true,
    });
  }
}
