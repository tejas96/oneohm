import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
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
import { LeadTemperature, type PaginatedResponse } from '@oneohm-epc/shared-types';
import { OrganizationContext } from '@oneohm-epc/shared-utils';

import { toDto, toDtoArray, toPaginatedResponse } from '../../../common/utils';
import { CurrentUser } from '../../auth/decorators';
import { JwtAuthGuard } from '../../auth/guards';
import { type CurrentUserType } from '../../auth/types';
import {
  CreateCustomerPropertyDto,
  CreateSiteVisitDto,
  CustomerPropertyResponseDto,
  PropertyQueryDto,
  SiteVisitResponseDto,
  UpdateCustomerPropertyDto,
  UpdateSiteVisitDto,
} from '../dto';
import { CustomerPropertyService } from '../services/customer-property.service';
import { SiteVisitService } from '../services/site-visit.service';

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
  constructor(
    private readonly propertyService: CustomerPropertyService,
    private readonly siteVisitService: SiteVisitService,
  ) {}

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
   * Get all properties with filtering, sorting, and pagination
   * Unified endpoint supporting search, filters, and sorting via query parameters
   */
  @Get()
  @ApiOperation({
    summary: 'Get all properties',
    description:
      'Retrieve properties with comprehensive filtering, sorting, and pagination. ' +
      'Supports search (property name, address, city, consumer number, customer name), ' +
      'lead temperature filter, property type filter, status filter, location filters (city, state), ' +
      'date range, creator filter (createdBy=me), and sorting. ' +
      'Organization ID must be provided via query parameter (?organizationId=xxx) or header (X-Organization-Id).',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Paginated list of properties',
    type: [CustomerPropertyResponseDto],
  })
  async findAll(
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Query() query: PropertyQueryDto,
  ): Promise<PaginatedResponse<CustomerPropertyResponseDto>> {
    // Substitute 'me' with actual user ID for createdBy filter
    if (query.createdBy === 'me') {
      query.createdBy = currentUser.id;
    }

    const result = await this.propertyService.findAll(organizationId, query);
    return toPaginatedResponse(
      CustomerPropertyResponseDto,
      result.data,
      result.total,
      query.page,
      query.limit,
    );
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
    description: 'Retrieve properties with a specific lead temperature (hot/warm/cold) with pagination.',
  })
  @ApiParam({
    name: 'temperature',
    enum: LeadTemperature,
    description: 'Lead temperature filter',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 20)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Paginated list of properties',
  })
  async findByTemperature(
    @Param('temperature') temperature: LeadTemperature,
    @OrganizationContext() organizationId: string,
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 20,
  ): Promise<PaginatedResponse<CustomerPropertyResponseDto>> {
    const result = await this.propertyService.findByTemperature(organizationId, temperature, page, limit);
    return toPaginatedResponse(CustomerPropertyResponseDto, result.data, result.total, page, limit);
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
    description: 'Update the lead temperature (hot/warm/cold) for a property.',
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
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
  ): Promise<CustomerPropertyResponseDto> {
    const property = await this.propertyService.updateTemperature(
      id,
      organizationId,
      temperature,
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
    description:
      'Set this property as the primary property for the customer. Unsets other properties.',
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

  // ==================== SITE VISIT NESTED ROUTES ====================

  /**
   * Create site visit for property
   */
  @Post(':id/site-visit')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create site visit for property',
    description:
      'Creates a new site visit for the specified property. Only one visit per property is allowed.',
  })
  @ApiParam({ name: 'id', type: String, description: 'Property ID' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Site visit created successfully',
    type: SiteVisitResponseDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Property not found' })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Site visit already exists for this property',
  })
  async createSiteVisit(
    @Param('id', ParseUUIDPipe) propertyId: string,
    @Body() createDto: CreateSiteVisitDto,
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
  ): Promise<SiteVisitResponseDto> {
    const siteVisit = await this.siteVisitService.create(
      propertyId,
      organizationId,
      createDto,
      currentUser.id,
    );
    return toDto(SiteVisitResponseDto, siteVisit);
  }

  /**
   * Get site visit for property
   */
  @Get(':id/site-visit')
  @ApiOperation({
    summary: 'Get site visit for property',
    description: 'Retrieve the site visit for a specific property.',
  })
  @ApiParam({ name: 'id', type: String, description: 'Property ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Site visit details',
    type: SiteVisitResponseDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Site visit not found' })
  async getSiteVisit(
    @Param('id', ParseUUIDPipe) propertyId: string,
    @OrganizationContext() organizationId: string,
  ): Promise<SiteVisitResponseDto> {
    const siteVisit = await this.siteVisitService.findByPropertyId(propertyId, organizationId);
    return toDto(SiteVisitResponseDto, siteVisit);
  }

  /**
   * Update site visit for property
   */
  @Patch(':id/site-visit')
  @ApiOperation({
    summary: 'Update site visit for property',
    description: 'Update the site visit for a specific property.',
  })
  @ApiParam({ name: 'id', type: String, description: 'Property ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Site visit updated successfully',
    type: SiteVisitResponseDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Site visit not found' })
  async updateSiteVisit(
    @Param('id', ParseUUIDPipe) propertyId: string,
    @Body() updateDto: UpdateSiteVisitDto,
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
  ): Promise<SiteVisitResponseDto> {
    const siteVisit = await this.siteVisitService.update(
      propertyId,
      organizationId,
      updateDto,
      currentUser.id,
    );
    return toDto(SiteVisitResponseDto, siteVisit);
  }

  /**
   * Complete site visit for property
   */
  @Post(':id/site-visit/complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Mark site visit as completed',
    description: 'Mark the site visit for a property as completed.',
  })
  @ApiParam({ name: 'id', type: String, description: 'Property ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Site visit marked as completed',
    type: SiteVisitResponseDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Site visit not found' })
  async completeSiteVisit(
    @Param('id', ParseUUIDPipe) propertyId: string,
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
  ): Promise<SiteVisitResponseDto> {
    const siteVisit = await this.siteVisitService.complete(
      propertyId,
      organizationId,
      currentUser.id,
    );
    return toDto(SiteVisitResponseDto, siteVisit);
  }

  /**
   * Delete site visit for property
   */
  @Delete(':id/site-visit')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete site visit for property',
    description: 'Soft delete the site visit for a property.',
  })
  @ApiParam({ name: 'id', type: String, description: 'Property ID' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Site visit deleted successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Site visit not found' })
  async deleteSiteVisit(
    @Param('id', ParseUUIDPipe) propertyId: string,
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
  ): Promise<void> {
    await this.siteVisitService.delete(propertyId, organizationId, currentUser.id);
  }
}
