import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { LeadTemperature } from '@oneohm-epc/shared-types';
import { OrganizationContext } from '@oneohm-epc/shared-utils';

import { toDto, toDtoArray, toDtoPaginated } from '../../../common/utils';
import { CurrentUser } from '../../auth/decorators';
import { JwtAuthGuard } from '../../auth/guards';
import { type CurrentUserType } from '../../auth/types';
import {
  CreateCustomerPropertyDto,
  CustomerPropertyResponseDto,
  UpdateCustomerPropertyDto,
} from '../dto';
import { CustomerPropertyService } from '../services/customer-property.service';

/**
 * Customer Property Controller
 * Handles HTTP requests for customer property (installation site) management
 *
 * Multi-Organization Support:
 * - organizationId is required as query parameter or header (X-Organization-Id)
 * - Automatically verifies user has access to the specified organization
 */
@ApiTags('Customer Properties')
@ApiBearerAuth()
@Controller('customer-properties')
@UseGuards(JwtAuthGuard)
export class CustomerPropertyController {
  constructor(private readonly propertyService: CustomerPropertyService) {}

  /**
   * Create a new customer property
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new customer property',
    description:
      'Creates a new property/installation site for a customer. The first property for a customer is automatically set as primary.',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Property created successfully',
    type: CustomerPropertyResponseDto,
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid input data' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Customer not found' })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Consumer number already exists' })
  async create(
    @Body() createDto: CreateCustomerPropertyDto,
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
  ): Promise<CustomerPropertyResponseDto> {
    const property = await this.propertyService.create(organizationId, createDto, currentUser.id);
    return toDto(CustomerPropertyResponseDto, property);
  }

  /**
   * Get all properties
   */
  @Get()
  @ApiOperation({
    summary: 'Get all properties',
    description: 'Retrieve all customer properties for the organization with pagination.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 20)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of properties',
    type: [CustomerPropertyResponseDto],
  })
  async findAll(
    @OrganizationContext() organizationId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ): Promise<{ data: CustomerPropertyResponseDto[]; total: number }> {
    const result = await this.propertyService.findAll(organizationId, page, limit);
    return toDtoPaginated(CustomerPropertyResponseDto, result);
  }

  /**
   * Get properties by customer
   */
  @Get('customer/:customerId')
  @ApiOperation({
    summary: 'Get properties by customer',
    description: 'Retrieve all properties for a specific customer.',
  })
  @ApiParam({ name: 'customerId', type: String, description: 'Customer ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of customer properties',
    type: [CustomerPropertyResponseDto],
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Customer not found' })
  async findByCustomer(
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @OrganizationContext() organizationId: string,
  ): Promise<CustomerPropertyResponseDto[]> {
    const properties = await this.propertyService.findByCustomer(customerId, organizationId);
    return toDtoArray(CustomerPropertyResponseDto, properties);
  }

  /**
   * Get properties by temperature
   */
  @Get('temperature/:temperature')
  @ApiOperation({
    summary: 'Get properties by lead temperature',
    description: 'Retrieve all properties with a specific lead temperature (hot/warm/cold).',
  })
  @ApiParam({
    name: 'temperature',
    enum: LeadTemperature,
    description: 'Lead temperature filter',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of properties',
    type: [CustomerPropertyResponseDto],
  })
  async findByTemperature(
    @Param('temperature') temperature: LeadTemperature,
    @OrganizationContext() organizationId: string,
  ): Promise<CustomerPropertyResponseDto[]> {
    const properties = await this.propertyService.findByTemperature(organizationId, temperature);
    return toDtoArray(CustomerPropertyResponseDto, properties);
  }

  /**
   * Get pending follow-ups
   */
  @Get('follow-ups/pending')
  @ApiOperation({
    summary: 'Get pending follow-ups',
    description: 'Retrieve all properties with pending follow-ups (due today or overdue).',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of properties with pending follow-ups',
    type: [CustomerPropertyResponseDto],
  })
  async findPendingFollowUps(
    @OrganizationContext() organizationId: string,
  ): Promise<CustomerPropertyResponseDto[]> {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const properties = await this.propertyService.findPendingFollowUps(organizationId, today);
    return toDtoArray(CustomerPropertyResponseDto, properties);
  }

  /**
   * Get temperature statistics
   */
  @Get('statistics/temperature')
  @ApiOperation({
    summary: 'Get temperature statistics',
    description: 'Returns count of properties grouped by lead temperature.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Temperature statistics',
    schema: {
      type: 'object',
      properties: {
        hot: { type: 'number', example: 5 },
        warm: { type: 'number', example: 15 },
        cold: { type: 'number', example: 10 },
      },
    },
  })
  async getTemperatureStatistics(
    @OrganizationContext() organizationId: string,
  ): Promise<Record<string, number>> {
    return this.propertyService.getTemperatureStatistics(organizationId);
  }

  /**
   * Get property by ID
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Get property by ID',
    description: 'Retrieve a specific property by its ID.',
  })
  @ApiParam({ name: 'id', type: String, description: 'Property ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Property details',
    type: CustomerPropertyResponseDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Property not found' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @OrganizationContext() organizationId: string,
  ): Promise<CustomerPropertyResponseDto> {
    const property = await this.propertyService.findById(id, organizationId);
    return toDto(CustomerPropertyResponseDto, property);
  }

  /**
   * Update property
   */
  @Patch(':id')
  @ApiOperation({
    summary: 'Update property',
    description: 'Update property information. All fields are optional.',
  })
  @ApiParam({ name: 'id', type: String, description: 'Property ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Property updated successfully',
    type: CustomerPropertyResponseDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Property not found' })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Consumer number already exists' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateCustomerPropertyDto,
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
  ): Promise<CustomerPropertyResponseDto> {
    const property = await this.propertyService.update(
      id,
      organizationId,
      updateDto,
      currentUser.id,
    );
    return toDto(CustomerPropertyResponseDto, property);
  }

  /**
   * Update property temperature
   */
  @Patch(':id/temperature')
  @ApiOperation({
    summary: 'Update property lead temperature',
    description:
      'Update the lead temperature (hot/warm/cold) for a property. Automatically recalculates the next follow-up date.',
  })
  @ApiParam({ name: 'id', type: String, description: 'Property ID' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['temperature'],
      properties: {
        temperature: {
          type: 'string',
          enum: Object.values(LeadTemperature),
          example: 'hot',
          description: 'New lead temperature',
        },
        followUpNotes: {
          type: 'string',
          example: 'Customer interested, schedule site visit',
          description: 'Notes for follow-up',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Temperature updated successfully',
    type: CustomerPropertyResponseDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Property not found' })
  async updateTemperature(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('temperature') temperature: LeadTemperature,
    @Body('followUpNotes') followUpNotes: string | undefined,
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
  ): Promise<CustomerPropertyResponseDto> {
    const property = await this.propertyService.updateTemperature(
      id,
      organizationId,
      temperature,
      followUpNotes,
      currentUser.id,
    );
    return toDto(CustomerPropertyResponseDto, property);
  }

  /**
   * Set property as primary
   */
  @Patch(':id/set-primary')
  @ApiOperation({
    summary: 'Set property as primary',
    description: 'Set this property as the primary property for the customer. Unsets other properties.',
  })
  @ApiParam({ name: 'id', type: String, description: 'Property ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Property set as primary',
    type: CustomerPropertyResponseDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Property not found' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Property is already primary' })
  async setPrimary(
    @Param('id', ParseUUIDPipe) id: string,
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
  ): Promise<CustomerPropertyResponseDto> {
    const property = await this.propertyService.setPrimary(id, organizationId, currentUser.id);
    return toDto(CustomerPropertyResponseDto, property);
  }

  /**
   * Delete property
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete property',
    description: 'Soft delete a property.',
  })
  @ApiParam({ name: 'id', type: String, description: 'Property ID' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Property deleted successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Property not found' })
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
  ): Promise<void> {
    await this.propertyService.delete(id, organizationId, currentUser.id);
  }
}

