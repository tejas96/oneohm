import { Body, Controller, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { type CurrentUserType, CurrentUser, JwtAuthGuard } from '@oneohm-epc/shared-auth';
import { CustomerStatus } from '@oneohm-epc/shared-types';
import {
  ApiAction,
  ApiCreate,
  ApiDelete,
  ApiReadAll,
  ApiReadOne,
  ApiUpdate,
  OrganizationContext,
} from '@oneohm-epc/shared-utils';

import { RequirePermission } from '../../iam/decorators/require-permission.decorator';
import { PermissionGuard } from '../../iam/guards/permission.guard';
import {
  CreateCustomerDto,
  CustomerResponseDto,
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
 * - Permissions are checked via JWT payload (fast, stateless)
 */
@ApiTags('Customers')
@ApiBearerAuth()
@Controller('customers')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  /**
   * Create a new customer
   */
  @RequirePermission('customers:create')
  @ApiCreate({
    summary: 'Create a new customer',
    description:
      'Creates a new customer/lead in the system. Requires: customers:create permission. Organization ID must be provided via query parameter (?organizationId=xxx) or header (X-Organization-Id).',
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
    // Note: Permission check is already done by @RequirePermission decorator
    // No need to verify org access - if user has permission, they can create

    const customer = await this.customerService.create(organizationId, createDto, currentUser.id);
    return customer as unknown as CustomerResponseDto;
  }

  /**
   * Get all customers
   */
  @RequirePermission('customers:read')
  @ApiReadAll({
    summary: 'Get all customers',
    description:
      'Retrieve all customers for the specified organization. Requires: customers:read permission. Organization ID must be provided via query parameter (?organizationId=xxx) or header (X-Organization-Id).',
    responseType: CustomerResponseDto,
  })
  async findAll(
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
  ): Promise<CustomerResponseDto[]> {
    // Verify user has access to this organization

    const customers = await this.customerService.findAll(organizationId);
    return customers as unknown as CustomerResponseDto[];
  }

  /**
   * Get customer by ID
   */
  @RequirePermission('customers:read')
  @ApiReadOne({
    summary: 'Get customer by ID',
    description:
      'Retrieve a specific customer by their ID. Requires: customers:read permission. Organization ID must be provided via query parameter (?organizationId=xxx) or header (X-Organization-Id).',
    responseType: CustomerResponseDto,
  })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
  ): Promise<CustomerResponseDto> {
    // Verify user has access to this organization

    const customer = await this.customerService.findById(id, organizationId);
    return customer as unknown as CustomerResponseDto;
  }

  /**
   * Update customer
   */
  @RequirePermission('customers:update')
  @ApiUpdate({
    summary: 'Update customer',
    description:
      'Update customer information. Requires: customers:update permission. Organization ID must be provided via query parameter (?organizationId=xxx) or header (X-Organization-Id).',
    responseType: CustomerResponseDto,
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
    // Verify user has access to this organization

    const customer = await this.customerService.update(
      id,
      organizationId,
      updateDto,
      currentUser.id,
    );
    return customer as unknown as CustomerResponseDto;
  }

  /**
   * Update customer status (generic)
   */
  @RequirePermission('customers:update-status')
  @ApiAction({
    path: 'status',
    summary: 'Update customer status',
    description: `Update customer status (${Object.values(CustomerStatus).join(', ')}). Requires: customers:update-status permission. Organization ID must be provided via query parameter (?organizationId=xxx) or header (X-Organization-Id).`,
    responseType: CustomerResponseDto,
  })
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() statusDto: UpdateCustomerStatusDto,
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
  ): Promise<CustomerResponseDto> {
    // Verify user has access to this organization

    const customer = await this.customerService.updateStatus(
      id,
      organizationId,
      statusDto.status,
      currentUser.id,
    );
    return customer as unknown as CustomerResponseDto;
  }

  /**
   * Delete customer
   */
  @RequirePermission('customers:delete')
  @ApiDelete({
    summary: 'Delete customer',
    description:
      'Soft delete a customer. Requires: customers:delete permission. Organization ID must be provided via query parameter (?organizationId=xxx) or header (X-Organization-Id).',
  })
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
  ): Promise<void> {
    // Verify user has access to this organization

    await this.customerService.delete(id, organizationId);
  }

  /**
   * Get customer statistics by status
   */
  @RequirePermission('customers:read')
  @ApiAction({
    path: 'statistics/status',
    summary: 'Get customer status statistics',
    description:
      'Returns count of customers grouped by status for the specified organization. Organization ID must be provided via query parameter (?organizationId=xxx) or header (X-Organization-Id).',
    responseType: Object,
  })
  async getStatusStatistics(
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
  ): Promise<Record<string, number>> {
    // Verify user has access to this organization

    return this.customerService.getStatusStatistics(organizationId);
  }
}
