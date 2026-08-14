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
} from '../../../common/decorators';
import { toDto, toPaginatedResponse } from '../../../common/utils';
import { CurrentUser } from '../../auth/decorators';
import { JwtAuthGuard } from '../../auth/guards';
import { type CurrentUserType } from '../../auth/types';
import {
  AvailabilityResponseDto,
  CheckAvailabilityQueryDto,
  CreateCustomerDto,
  CustomerOverviewStatsDto,
  CustomerQueryDto,
  CustomerResponseDto,
  UpdateAssigneeDto,
  UpdateCustomerDto,
  UpdateCustomerStatusDto,
} from '../dto';
import { MarkLostDto } from '../dto/mark-lost.dto';
import { CustomerService } from '../services/customer.service';

/**
 * Customer Controller
 * Handles HTTP requests for customer management
 *
 * Authentication only. Permission enforcement lives in the web app — see
 * `apps/web/lib/rbac/`. Backend enforcement is a separate, later task.
 */
@ApiTags('Customers')
@ApiBearerAuth()
@Controller('customers')
@UseGuards(JwtAuthGuard)
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  /**
   * Create a new customer
   */
  @ApiCreate({
    summary: 'Create a new customer',
    description: 'Creates a new customer/lead in the system.',
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
    @CurrentUser() currentUser: CurrentUserType,
  ): Promise<CustomerResponseDto> {
    const customer = await this.customerService.create(createDto, currentUser.id);
    return toDto(CustomerResponseDto, customer);
  }

  /**
   * Get all customers with filtering, sorting, and pagination
   * Unified endpoint supporting search, filters, and sorting via query parameters
   */
  @ApiReadAll({
    summary: 'Get all customers',
    description:
      'Retrieve customers with comprehensive filtering, sorting, and pagination. ' +
      'Supports search (name, phone, email, city), status filter, location filters (city, state), ' +
      'lead source filter, date range, creator filter (createdBy=me), and sorting. ' +
      '',
    responseType: CustomerResponseDto,
  })
  async findAll(
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
    const result = await this.customerService.findAll(query);
    return toPaginatedResponse(
      CustomerResponseDto,
      result.data,
      result.total,
      query.page,
      query.limit,
    );
  }

  /**
   * Get distinct customer groups
   * Returns all (groupCode, groupName) pairs used to populate the group selector.
   * NOTE: Must be defined BEFORE :id routes to avoid route conflicts.
   */
  @Get('groups')
  @ApiOperation({
    summary: 'Get customer groups',
    description:
      'Returns all distinct customer groups (code + name pairs) . ' +
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
  async getGroups(): Promise<{ groupCode: string; groupName: string }[]> {
    return this.customerService.getDistinctGroups();
  }

  /**
   * Check if phone/email is already registered
   * Used to prevent duplicate customer creation in the lead wizard
   * NOTE: This MUST be defined BEFORE :id routes to avoid route conflicts
   */
  @Get('check-availability')
  @ApiOperation({
    summary: 'Check phone/email availability',
    description:
      'Check if a phone number or email is already registered for a customer. Used to prevent duplicate customer creation.',
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
    @Query() queryDto: CheckAvailabilityQueryDto,
    @CurrentUser() _currentUser: CurrentUserType,
  ): Promise<AvailabilityResponseDto> {
    return this.customerService.checkAvailability(
      queryDto.phone,
      queryDto.email,
      queryDto.excludeCustomerId,
    );
  }

  /**
   * Get customer statistics by status
   * NOTE: This MUST be defined BEFORE :id routes to avoid route conflicts
   */
  @Get('statistics/status')
  @ApiOperation({
    summary: 'Get customer status statistics',
    description: 'Returns count of customers grouped by status.',
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
    @CurrentUser() _currentUser: CurrentUserType,
  ): Promise<Record<string, number>> {
    return this.customerService.getStatusStatistics();
  }

  /**
   * Get the CRM overview roll-up for the customer list's KPI cards.
   * NOTE: This MUST be defined BEFORE :id routes to avoid route conflicts.
   */
  @Get('statistics/overview')
  @ApiOperation({
    summary: 'Get CRM overview statistics',
    description:
      'Returns company-wide customer and site counts, open pipeline value and ' +
      'awaiting-reply counts, with current-month deltas. Backs the four KPI cards on ' +
      'the customer list.' +
      '',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'CRM overview statistics',
    type: CustomerOverviewStatsDto,
  })
  async getOverviewStatistics(
    @CurrentUser() _currentUser: CurrentUserType,
  ): Promise<CustomerOverviewStatsDto> {
    return this.customerService.getOverviewStats();
  }

  /**
   * Get customer by ID
   */
  @ApiReadOne({
    summary: 'Get customer by ID',
    description: 'Retrieve a specific customer by their ID.',
    responseType: CustomerResponseDto,
  })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() _currentUser: CurrentUserType,
  ): Promise<CustomerResponseDto> {
    const customer = await this.customerService.findById(id);
    return toDto(CustomerResponseDto, customer);
  }

  /**
   * Update customer (partial update)
   */
  @ApiUpdate({
    summary: 'Update customer',
    description: 'Update customer information.',
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
    @CurrentUser() currentUser: CurrentUserType,
  ): Promise<CustomerResponseDto> {
    const customer = await this.customerService.update(id, updateDto, currentUser.id);
    return toDto(CustomerResponseDto, customer);
  }

  /**
   * Update customer status (generic)
   */
  @ApiAction({
    path: 'status',
    summary: 'Update customer status',
    description: `Update customer status (${Object.values(CustomerStatus).join(', ')}).`,
    responseType: CustomerResponseDto,
  })
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() statusDto: UpdateCustomerStatusDto,
    @CurrentUser() currentUser: CurrentUserType,
  ): Promise<CustomerResponseDto> {
    const customer = await this.customerService.updateStatus(id, statusDto.status, currentUser.id);
    return toDto(CustomerResponseDto, customer);
  }

  /**
   * Assign or unassign a customer to a user
   * Send assigneeId as a valid UUID to assign, or null to unassign.
   */
  @Patch(':id/assignee')
  @ApiOperation({
    summary: 'Assign or unassign a customer',
    description:
      'Assign a customer to a user (field worker). Send assigneeId as a UUID to assign, or null to unassign. ' +
      'Assignee must be an active employee. ' +
      '',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Customer assignee updated',
    type: CustomerResponseDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Customer or assignee user not found' })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Assignee is not  or is inactive',
  })
  async assignCustomer(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() assigneeDto: UpdateAssigneeDto,
    @CurrentUser() currentUser: CurrentUserType,
  ): Promise<CustomerResponseDto> {
    const customer = await this.customerService.assignCustomer(
      id,
      assigneeDto.assigneeId,
      currentUser.id,
    );
    return toDto(CustomerResponseDto, customer);
  }

  /**
   * Delete customer
   */
  @UseGuards(JwtAuthGuard)
  @ApiDelete({
    summary: 'Delete customer',
    description:
      'Permanently delete a customer when it has no properties, quotations, or financial records. Admin or super admin only.',
    additionalErrors: [{ status: HttpStatus.CONFLICT, description: 'Customer cannot be deleted' }],
  })
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: CurrentUserType,
  ): Promise<void> {
    await this.customerService.delete(id, currentUser.id);
  }

  /**
   * Mark a property-less enquiry as lost
   */
  @ApiAction({
    path: 'lost',
    summary: 'Mark a customer lead as lost',
    description:
      'For an enquiry that never got a property. Sets status LOST with a reason and cancels the customer-level followups.',
    responseType: CustomerResponseDto,
  })
  async markLost(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MarkLostDto,
    @CurrentUser() currentUser: CurrentUserType,
  ): Promise<CustomerResponseDto> {
    const customer = await this.customerService.markLost(id, dto.reason, currentUser.id);
    return toDto(CustomerResponseDto, customer);
  }
}
