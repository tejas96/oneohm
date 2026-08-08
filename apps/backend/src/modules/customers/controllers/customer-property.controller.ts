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
import { LeadTemperature, type PaginatedResponse } from '@tejas96/shared/types';

import { toDto, toDtoArray, toPaginatedResponse } from '../../../common/utils';
import { CurrentUser } from '../../auth/decorators';
import { JwtAuthGuard } from '../../auth/guards';
import { type CurrentUserType } from '../../auth/types';
import { RequireRole } from '../../iam/decorators/require-role.decorator';
import { RoleGuard } from '../../iam/guards/role.guard';
import {
  CreateCustomerPropertyDto,
  CustomerPropertyResponseDto,
  PropertyDocumentDto,
  PropertyQueryDto,
  UpdateCustomerPropertyDto,
} from '../dto';
import { CustomerPropertyService } from '../services/customer-property.service';

/**
 * Customer Property Controller
 * Handles HTTP requests for customer property (installation site) management
 *
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
    @CurrentUser() currentUser: CurrentUserType,
  ): Promise<CustomerPropertyResponseDto> {
    const property = await this.propertyService.create(createDto, currentUser.id);
    return toDto(CustomerPropertyResponseDto, property);
  }

  /**
   * Get all properties with filtering, sorting, and pagination
   * @deprecated Standalone property list UI removed; prefer GET /customers with property filters
   * or GET /customer-properties/customer/:customerId for nested views.
   */
  @Get()
  @ApiOperation({
    summary: 'Get all properties (deprecated)',
    description:
      '**Deprecated** — the standalone property list page was removed. Use GET /customers with ' +
      'property-level filters, or GET /customer-properties/customer/:customerId for per-customer lists. ' +
      'Retrieve properties with comprehensive filtering, sorting, and pagination.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Paginated list of properties',
    type: [CustomerPropertyResponseDto],
  })
  async findAll(
    @CurrentUser() currentUser: CurrentUserType,
    @Query() query: PropertyQueryDto,
  ): Promise<PaginatedResponse<CustomerPropertyResponseDto>> {
    // Substitute 'me' with actual user ID for createdBy filter
    if (query.createdBy === 'me') {
      query.createdBy = currentUser.id;
    }

    const result = await this.propertyService.findAll(query);
    return toPaginatedResponse(
      CustomerPropertyResponseDto,
      result.data,
      result.total,
      query.page,
      query.limit,
    );
  }

  /**
   * Get properties for the logged-in customer user
   */
  @Get('my-properties')
  @ApiOperation({
    summary: 'Get properties for the logged-in customer',
    description:
      'Retrieve all active properties, including quotes and project details, for the logged-in customer.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of customer properties',
    type: [CustomerPropertyResponseDto],
  })
  async findMyProperties(
    @CurrentUser() currentUser: CurrentUserType,
  ): Promise<CustomerPropertyResponseDto[]> {
    const properties = await this.propertyService.findMyProperties(currentUser.id);
    return toDtoArray(CustomerPropertyResponseDto, properties);
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
  ): Promise<CustomerPropertyResponseDto[]> {
    const properties = await this.propertyService.findByCustomer(customerId);
    return toDtoArray(CustomerPropertyResponseDto, properties);
  }

  /**
   * Get properties by temperature
   * @deprecated Prefer GET /customers?leadTemperature=... after property list merge.
   */
  @Get('temperature/:temperature')
  @ApiOperation({
    summary: 'Get properties by lead temperature (deprecated)',
    description:
      '**Deprecated** — use GET /customers?leadTemperature=hot|warm|cold instead. ' +
      'Retrieve properties with a specific lead temperature (hot/warm/cold) with pagination.',
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
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 20,
  ): Promise<PaginatedResponse<CustomerPropertyResponseDto>> {
    const result = await this.propertyService.findByTemperature(temperature, page, limit);
    return toPaginatedResponse(CustomerPropertyResponseDto, result.data, result.total, page, limit);
  }

  /**
   * Get temperature statistics
   * @deprecated No active frontend consumer after property list page removal.
   */
  @Get('statistics/temperature')
  @ApiOperation({
    summary: 'Get temperature statistics (deprecated)',
    description:
      '**Deprecated** — no active UI consumer. Returns count of properties grouped by lead temperature.',
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
  async getTemperatureStatistics(): Promise<Record<string, number>> {
    return this.propertyService.getTemperatureStatistics();
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
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<CustomerPropertyResponseDto> {
    const property = await this.propertyService.findById(id);
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
    @CurrentUser() currentUser: CurrentUserType,
  ): Promise<CustomerPropertyResponseDto> {
    const property = await this.propertyService.update(id, updateDto, currentUser.id);
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
    @CurrentUser() currentUser: CurrentUserType,
  ): Promise<CustomerPropertyResponseDto> {
    const property = await this.propertyService.updateTemperature(id, temperature, currentUser.id);
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
    @CurrentUser() currentUser: CurrentUserType,
  ): Promise<CustomerPropertyResponseDto> {
    const property = await this.propertyService.setPrimary(id, currentUser.id);
    return toDto(CustomerPropertyResponseDto, property);
  }

  /**
   * Delete property
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @RequireRole('admin', 'super_admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete property',
    description:
      'Permanently delete a property when it has no quotations, project, or active loan. Admin or super admin only.',
  })
  @ApiParam({ name: 'id', type: String, description: 'Property ID' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Property deleted successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Property not found' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Insufficient role' })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Property cannot be deleted' })
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: CurrentUserType,
  ): Promise<void> {
    await this.propertyService.delete(id, currentUser.id);
  }

  // ==================== DOCUMENT NESTED ROUTES ====================

  /**
   * Add document to property
   */
  @Post(':id/documents')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Add document to property',
    description: 'Atomically adds a document to the property documents JSONB array.',
  })
  @ApiParam({ name: 'id', type: String, description: 'Property ID' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Document added successfully',
    type: CustomerPropertyResponseDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Property not found' })
  async addDocument(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() document: PropertyDocumentDto,
    @CurrentUser() currentUser: CurrentUserType,
  ): Promise<CustomerPropertyResponseDto> {
    const property = await this.propertyService.addDocument(id, document, currentUser.id);
    return toDto(CustomerPropertyResponseDto, property);
  }

  /**
   * Remove document from property
   */
  @Delete(':id/documents/:encodedUrl')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Remove document from property',
    description:
      'Atomically removes a document from the property documents JSONB array. ' +
      'The encodedUrl parameter must be the base64-encoded document URL.',
  })
  @ApiParam({ name: 'id', type: String, description: 'Property ID' })
  @ApiParam({
    name: 'encodedUrl',
    type: String,
    description: 'Base64-encoded document URL',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Document removed successfully',
    type: CustomerPropertyResponseDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Property not found' })
  async removeDocument(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('encodedUrl') encodedUrl: string,
    @CurrentUser() currentUser: CurrentUserType,
  ): Promise<CustomerPropertyResponseDto> {
    const url = Buffer.from(encodedUrl, 'base64').toString('utf-8');
    const property = await this.propertyService.removeDocument(id, url, currentUser.id);
    return toDto(CustomerPropertyResponseDto, property);
  }

  // ==================== SITE VISIT / SURVEY ENDPOINTS ====================

  @Post(':id/complete-visit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Complete site visit for property' })
  @ApiParam({ name: 'id', description: 'Property ID', type: 'string', format: 'uuid' })
  @ApiResponse({ status: HttpStatus.OK, type: CustomerPropertyResponseDto })
  async completeVisit(
    @Param('id', ParseUUIDPipe) propertyId: string,
    @CurrentUser() currentUser: CurrentUserType,
  ): Promise<CustomerPropertyResponseDto> {
    const updated = await this.propertyService.completeVisit(propertyId, currentUser.id);
    return toDto(CustomerPropertyResponseDto, updated);
  }

  @Post(':id/complete-survey')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Complete site survey for property' })
  @ApiParam({ name: 'id', description: 'Property ID', type: 'string', format: 'uuid' })
  @ApiResponse({ status: HttpStatus.OK, type: CustomerPropertyResponseDto })
  async completeSurvey(
    @Param('id', ParseUUIDPipe) propertyId: string,
    @CurrentUser() currentUser: CurrentUserType,
  ): Promise<CustomerPropertyResponseDto> {
    const updated = await this.propertyService.completeSurvey(propertyId, currentUser.id);
    return toDto(CustomerPropertyResponseDto, updated);
  }

  @Post(':id/cancel-site-activity')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel site activity for property' })
  @ApiParam({ name: 'id', description: 'Property ID', type: 'string', format: 'uuid' })
  @ApiResponse({ status: HttpStatus.OK, type: CustomerPropertyResponseDto })
  async cancelSiteActivity(
    @Param('id', ParseUUIDPipe) propertyId: string,
    @CurrentUser() currentUser: CurrentUserType,
  ): Promise<CustomerPropertyResponseDto> {
    const updated = await this.propertyService.cancelSiteActivity(propertyId, currentUser.id);
    return toDto(CustomerPropertyResponseDto, updated);
  }
}
