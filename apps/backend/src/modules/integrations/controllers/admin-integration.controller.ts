import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  JwtAuthGuard,
  RolesGuard,
  Role,
  Roles,
  CurrentUser,
  type CurrentUserType,
} from '@oneohm-epc/shared-auth';
import { IntegrationProvider, IntegrationCategory } from '@oneohm-epc/shared-types';
import { OrganizationContext } from '@oneohm-epc/shared-utils';

import { CreateIntegrationDto, UpdateIntegrationDto, IntegrationResponseDto } from '../dto';
import { IntegrationEntity } from '../entities';
import { IntegrationService } from '../services';

/**
 * Admin Integration Controller
 * Manages CRUD operations for integrations
 */
@ApiTags('Admin - Integrations')
@ApiBearerAuth('JWT-auth')
@Controller('admin/integrations')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN, Role.ADMIN)
export class AdminIntegrationController {
  constructor(private readonly integrationService: IntegrationService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a new integration',
    description: 'Create a new third-party integration for the organization',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Integration created successfully',
    type: IntegrationResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Integration already exists',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Credential validation failed',
  })
  async createIntegration(
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Body() dto: CreateIntegrationDto,
  ): Promise<IntegrationResponseDto> {
    const integration = await this.integrationService.createIntegration(
      organizationId,
      dto,
      currentUser.id,
    );

    return this.toResponseDto(integration);
  }

  @Get()
  @ApiOperation({
    summary: 'Get all integrations',
    description: 'Get all integrations for the organization',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of integrations',
    type: [IntegrationResponseDto],
  })
  async getIntegrations(
    @OrganizationContext() organizationId: string,
    @CurrentUser() _currentUser: CurrentUserType,
  ): Promise<IntegrationResponseDto[]> {
    const integrations = await this.integrationService.getIntegrations(organizationId);
    return integrations.map((i) => this.toResponseDto(i));
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get integration by ID',
    description: 'Get a specific integration by its ID',
  })
  @ApiParam({
    name: 'id',
    description: 'Integration ID',
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Integration details',
    type: IntegrationResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Integration not found',
  })
  async getIntegrationById(
    @OrganizationContext() organizationId: string,
    @Param('id') id: string,
    @CurrentUser() _currentUser: CurrentUserType,
  ): Promise<IntegrationResponseDto> {
    const integration = await this.integrationService.getIntegrationById(id, organizationId);
    return this.toResponseDto(integration);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Update integration',
    description: 'Update an existing integration',
  })
  @ApiParam({
    name: 'id',
    description: 'Integration ID',
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Integration updated successfully',
    type: IntegrationResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Integration not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Credential validation failed',
  })
  async updateIntegration(
    @OrganizationContext() organizationId: string,
    @Param('id') id: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Body() dto: UpdateIntegrationDto,
  ): Promise<IntegrationResponseDto> {
    const integration = await this.integrationService.updateIntegration(
      id,
      organizationId,
      dto,
      currentUser.id,
    );

    return this.toResponseDto(integration);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete integration',
    description: 'Delete an integration (soft delete)',
  })
  @ApiParam({
    name: 'id',
    description: 'Integration ID',
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Integration deleted successfully',
    schema: {
      example: {
        message: 'Integration deleted successfully',
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Integration not found',
  })
  async deleteIntegration(
    @OrganizationContext() organizationId: string,
    @Param('id') id: string,
    @CurrentUser() _currentUser: CurrentUserType,
  ): Promise<{ message: string }> {
    await this.integrationService.deleteIntegration(id, organizationId);
    return { message: 'Integration deleted successfully' };
  }

  /**
   * Convert entity to response DTO (excludes encrypted credentials)
   */
  private toResponseDto(integration: IntegrationEntity): IntegrationResponseDto {
    return {
      id: integration.id,
      organizationId: integration.organizationId,
      name: integration.name,
      provider: integration.provider as IntegrationProvider,
      category: integration.category as IntegrationCategory,
      authType: integration.authType,
      configuration: integration.configuration,
      isActive: integration.isActive,
      lastValidatedAt: integration.lastValidatedAt,
      validationError: integration.validationError,
      createdAt: integration.createdAt,
      updatedAt: integration.updatedAt,
      createdBy: integration.createdBy,
      updatedBy: integration.updatedBy,
    };
  }
}
