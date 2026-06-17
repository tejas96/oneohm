import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CustomerStatus, type PaginatedResponse } from '@tejas96/shared/types';

import {
  ApiAction,
  ApiCreate,
  ApiDelete,
  ApiReadAll,
  ApiReadOne,
  ApiUpdate,
  OrganizationContext,
} from '../../../common/decorators';
import { toDto, toPaginatedResponse } from '../../../common/utils';
import { CurrentUser } from '../../auth/decorators';
import { JwtAuthGuard } from '../../auth/guards';
import { type CurrentUserType } from '../../auth/types';
// TODO: Re-enable permissions when IAM is fully configured
// import { RequirePermission } from '../../iam/decorators/require-permission.decorator';
// import { PermissionGuard } from '../../iam/guards/permission.guard';
import {
  AvailabilityResponseDto,
  CheckAvailabilityQueryDto,
  CreateCustomerDto,
  CustomerQueryDto,
  CustomerResponseDto,
  UpdateAssigneeDto,
  UpdateCustomerDto,
  UpdateCustomerStatusDto,
} from '../dto';
import { CustomerService } from '../services/customer.service';

/**
 * Customer Controller
 * Handles HTTP requests for customer management
 *
 * Multi-Organization Support:
 * - organizationId is required as query parameter or header (X-Organization-Id)
 * - Automatically verifies user has access to the specified organization
 *
 * TODO: Re-enable permission checks when IAM is fully configured
 * - Currently only JwtAuthGuard is active
 * - Add PermissionGuard and @RequirePermission decorators back
 */
@ApiTags('Customers')
@ApiBearerAuth()
@Controller('customers')
@UseGuards(JwtAuthGuard) // TODO: Add PermissionGuard back when IAM is ready
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  /**
   * Create a new customer
   */
  // @RequirePermission('customers:create') // TODO: Re-enable
  @ApiCreate({
    summary: 'Create a new customer',
    description:
      'Creates a new customer/lead in the system. Organization ID must be provided via query parameter (?organizationId=xxx) or header (X-Organization-Id).',
    responseType: CustomerResponseDto,
    additionalErrors: [
      {
        status: 409,
        description: 'Customer with same email or consumer number already exists',
      },
    ],
  })
  async create(
    @Body() createDto: CreateCustomerDto,
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
  ): Promise<CustomerResponseDto> {
    const customer = await this.customerService.create(organizationId, createDto, currentUser.id);
    return toDto(CustomerResponseDto, customer);
  }

  /**
   * Get all customers with filtering, sorting, and pagination
   * Unified endpoint supporting search, filters, and sorting via query parameters
   */
  // @RequirePermission('customers:read') // TODO: Re-enable
  @ApiReadAll({
    summary: 'Get all customers',
    description:
      'Retrieve customers with comprehensive filtering, sorting, and pagination. ' +
      'Supports search (name, phone, email, city), status filter, location filters (city, state), ' +
      'lead source filter, date range, creator filter (createdBy=me), and sorting. ' +
      'Organization ID must be provided via query parameter (?organizationId=xxx) or header (X-Organization-Id).',
    responseType: CustomerResponseDto,
  })
  async findAll(
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Query() query: CustomerQueryDto,
  ): Promise<PaginatedResponse<CustomerResponseDto>> {
    // Substitute 'me' with actual user ID for createdBy filter
    if (query.createdBy === 'me') {
      query.createdBy = currentUser.id;
    }

    // Substitute 'me' with actual user ID for assigneeId filter
    if (query.assigneeId === 'me') {
      query.assigneeId = currentUser.id;
    }

    // Use unified findAll with query DTO
    const result = await this.customerService.findAll(organizationId, query);
    return toPaginatedResponse(
      CustomerResponseDto,
      result.data,
      result.total,
      query.page,
      query.limit,
    );
  }

  /**
   * Get distinct customer groups for the organization
   * Returns all (groupCode, groupName) pairs used to populate the group selector.
   * NOTE: Must be defined BEFORE :id routes to avoid route conflicts.
   */
  @Get('groups')
  @ApiOperation({
    summary: 'Get customer groups',
    description:
      'Returns all distinct customer groups (code + name pairs) for the organization. ' +
      'Used to populate the group selector when creating or editing a customer.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of distinct customer groups',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          groupCode: { type: 'string', example: 'GRP-0001' },
          groupName: { type: 'string', example: 'Sunshine Apartments' },
        },
      },
    },
  })
  async getGroups(
    @OrganizationContext() organizationId: string,
  ): Promise<{ groupCode: string; groupName: string }[]> {
    return this.customerService.getDistinctGroups(organizationId);
  }

  /**
   * Check if phone/email is already registered
   * Used to prevent duplicate customer creation in the lead wizard
   * NOTE: This MUST be defined BEFORE :id routes to avoid route conflicts
   */
  // @RequirePermission('customers:read') // TODO: Re-enable
  @Get('check-availability')
  @ApiOperation({
    summary: 'Check phone/email availability',
    description:
      'Check if a phone number or email is already registered for a customer in this organization. Used to prevent duplicate customer creation. Organization ID must be provided via query parameter (?organizationId=xxx) or header (X-Organization-Id).',
  })
  @ApiQuery({
    name: 'phone',
    required: false,
    type: String,
    description: 'Phone number to check (with country code, e.g., +919876543210)',
  })
  @ApiQuery({
    name: 'email',
    required: false,
    type: String,
    description: 'Email address to check',
  })
  @ApiQuery({
    name: 'excludeCustomerId',
    required: false,
    type: String,
    description: 'Customer ID to exclude from check (for edit mode)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Availability check result',
    type: AvailabilityResponseDto,
  })
  async checkAvailability(
    @OrganizationContext() organizationId: string,
    @Query() queryDto: CheckAvailabilityQueryDto,
    @CurrentUser() _currentUser: CurrentUserType,
  ): Promise<AvailabilityResponseDto> {
    return this.customerService.checkAvailability(
      organizationId,
      queryDto.phone,
      queryDto.email,
      queryDto.excludeCustomerId,
    );
  }

  /**
   * Get customer statistics by status
   * NOTE: This MUST be defined BEFORE :id routes to avoid route conflicts
   */
  // @RequirePermission('customers:read') // TODO: Re-enable
  @Get('statistics/status')
  @ApiOperation({
    summary: 'Get customer status statistics',
    description:
      'Returns count of customers grouped by status for the specified organization. Organization ID must be provided via query parameter (?organizationId=xxx) or header (X-Organization-Id).',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Status statistics',
    schema: {
      type: 'object',
      properties: {
        lead: { type: 'number', example: 5 },
        prospect: { type: 'number', example: 10 },
        active: { type: 'number', example: 25 },
        inactive: { type: 'number', example: 3 },
      },
    },
  })
  async getStatusStatistics(
    @OrganizationContext() organizationId: string,
    @CurrentUser() _currentUser: CurrentUserType,
  ): Promise<Record<string, number>> {
    return this.customerService.getStatusStatistics(organizationId);
  }

  /**
   * Get customer by ID
   */
  // @RequirePermission('customers:read') // TODO: Re-enable
  @ApiReadOne({
    summary: 'Get customer by ID',
    description:
      'Retrieve a specific customer by their ID. Organization ID must be provided via query parameter (?organizationId=xxx) or header (X-Organization-Id).',
    responseType: CustomerResponseDto,
  })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @OrganizationContext() organizationId: string,
    @CurrentUser() _currentUser: CurrentUserType,
  ): Promise<CustomerResponseDto> {
    const customer = await this.customerService.findById(id, organizationId);
    return toDto(CustomerResponseDto, customer);
  }

  /**
   * Update customer (partial update)
   */
  // @RequirePermission('customers:update') // TODO: Re-enable
  @ApiUpdate({
    summary: 'Update customer',
    description:
      'Update customer information. Organization ID must be provided via query parameter (?organizationId=xxx) or header (X-Organization-Id).',
    responseType: CustomerResponseDto,
    method: 'PATCH', // Use PATCH for partial updates
    additionalErrors: [
      {
        status: 409,
        description: 'Customer with same email or consumer number already exists',
      },
    ],
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateCustomerDto,
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
  ): Promise<CustomerResponseDto> {
    const customer = await this.customerService.update(
      id,
      organizationId,
      updateDto,
      currentUser.id,
    );
    return toDto(CustomerResponseDto, customer);
  }

  /**
   * Update customer status (generic)
   */
  // @RequirePermission('customers:update-status') // TODO: Re-enable
  @ApiAction({
    path: 'status',
    summary: 'Update customer status',
    description: `Update customer status (${Object.values(CustomerStatus).join(', ')}). Organization ID must be provided via query parameter (?organizationId=xxx) or header (X-Organization-Id).`,
    responseType: CustomerResponseDto,
  })
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() statusDto: UpdateCustomerStatusDto,
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
  ): Promise<CustomerResponseDto> {
    const customer = await this.customerService.updateStatus(
      id,
      organizationId,
      statusDto.status,
      currentUser.id,
    );
    return toDto(CustomerResponseDto, customer);
  }

  /**
   * Assign or unassign a customer to a user
   * Send assigneeId as a valid UUID to assign, or null to unassign.
   */
  // @RequirePermission('customers:update') // TODO: Re-enable
  @Patch(':id/assignee')
  @ApiOperation({
    summary: 'Assign or unassign a customer',
    description:
      'Assign a customer to a user (field worker). Send assigneeId as a UUID to assign, or null to unassign. ' +
      'Assignee must be an active employee in the same organization. ' +
      'Organization ID must be provided via query parameter (?organizationId=xxx) or header (X-Organization-Id).',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Customer assignee updated',
    type: CustomerResponseDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Customer or assignee user not found' })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Assignee is not in this org or is inactive',
  })
  async assignCustomer(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() assigneeDto: UpdateAssigneeDto,
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
  ): Promise<CustomerResponseDto> {
    const customer = await this.customerService.assignCustomer(
      id,
      organizationId,
      assigneeDto.assigneeId,
      currentUser.id,
    );
    return toDto(CustomerResponseDto, customer);
  }

  /**
   * Delete customer
   */
  // @RequirePermission('customers:delete') // TODO: Re-enable
  @ApiDelete({
    summary: 'Delete customer',
    description:
      'Soft delete a customer. Organization ID must be provided via query parameter (?organizationId=xxx) or header (X-Organization-Id).',
  })
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
  ): Promise<void> {
    await this.customerService.delete(id, organizationId, currentUser.id);
  }
}
