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
import { IntegrationProvider, IntegrationCategory } from '@tejas96/shared/types';

import { OrganizationContext } from '../../../common/decorators';
import { CurrentUser } from '../../auth/decorators';
import { JwtAuthGuard } from '../../auth/guards';
import { type CurrentUserType } from '../../auth/types';
import { CreateIntegrationDto, UpdateIntegrationDto, IntegrationResponseDto } from '../dto';
import { IntegrationEntity } from '../entities';
import { IntegrationService } from '../services';

@ApiTags('Admin - Integrations')
@ApiBearerAuth()
@Controller('admin/integrations')
@UseGuards(JwtAuthGuard)
export class AdminIntegrationController {
  constructor(private readonly integrationService: IntegrationService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new integration' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Integration created successfully',
    type: IntegrationResponseDto,
  })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Integration already exists' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Credential validation failed' })
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
  @ApiOperation({ summary: 'Get all integrations' })
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
  @ApiOperation({ summary: 'Get integration by ID' })
  @ApiParam({ name: 'id', description: 'Integration ID' })
  @ApiResponse({ status: HttpStatus.OK, type: IntegrationResponseDto })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Integration not found' })
  async getIntegrationById(
    @OrganizationContext() organizationId: string,
    @Param('id') id: string,
    @CurrentUser() _currentUser: CurrentUserType,
  ): Promise<IntegrationResponseDto> {
    const integration = await this.integrationService.getIntegrationById(id, organizationId);
    return this.toResponseDto(integration);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update integration' })
  @ApiParam({ name: 'id', description: 'Integration ID' })
  @ApiResponse({ status: HttpStatus.OK, type: IntegrationResponseDto })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Integration not found' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Credential validation failed' })
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
  @ApiOperation({ summary: 'Delete integration' })
  @ApiParam({ name: 'id', description: 'Integration ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Integration deleted successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Integration not found' })
  async deleteIntegration(
    @OrganizationContext() organizationId: string,
    @Param('id') id: string,
    @CurrentUser() _currentUser: CurrentUserType,
  ): Promise<{ message: string }> {
    await this.integrationService.deleteIntegration(id, organizationId);
    return { message: 'Integration deleted successfully' };
  }

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
