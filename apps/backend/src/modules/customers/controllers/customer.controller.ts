import { Body, Controller, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
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

import { toDto, toDtoArray } from '../../../common/utils';
import { CurrentUser } from '../../auth/decorators';
import { JwtAuthGuard } from '../../auth/guards';
import { type CurrentUserType } from '../../auth/types';
// TODO: Re-enable permissions when IAM is fully configured
// import { RequirePermission } from '../../iam/decorators/require-permission.decorator';
// import { PermissionGuard } from '../../iam/guards/permission.guard';
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
   * Get all customers
   */
  // @RequirePermission('customers:read') // TODO: Re-enable
  @ApiReadAll({
    summary: 'Get all customers',
    description:
      'Retrieve all customers for the specified organization. Organization ID must be provided via query parameter (?organizationId=xxx) or header (X-Organization-Id).',
    responseType: CustomerResponseDto,
  })
  async findAll(
    @OrganizationContext() organizationId: string,
    @CurrentUser() _currentUser: CurrentUserType,
  ): Promise<CustomerResponseDto[]> {
    const customers = await this.customerService.findAll(organizationId);
    return toDtoArray(CustomerResponseDto, customers);
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
   * Update customer
   */
  // @RequirePermission('customers:update') // TODO: Re-enable
  @ApiUpdate({
    summary: 'Update customer',
    description:
      'Update customer information. Organization ID must be provided via query parameter (?organizationId=xxx) or header (X-Organization-Id).',
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
    @CurrentUser() _currentUser: CurrentUserType,
  ): Promise<void> {
    await this.customerService.delete(id, organizationId);
  }

  /**
   * Get customer statistics by status
   */
  // @RequirePermission('customers:read') // TODO: Re-enable
  @ApiAction({
    path: 'statistics/status',
    summary: 'Get customer status statistics',
    description:
      'Returns count of customers grouped by status for the specified organization. Organization ID must be provided via query parameter (?organizationId=xxx) or header (X-Organization-Id).',
    responseType: Object,
  })
  async getStatusStatistics(
    @OrganizationContext() organizationId: string,
    @CurrentUser() _currentUser: CurrentUserType,
  ): Promise<Record<string, number>> {
    return this.customerService.getStatusStatistics(organizationId);
  }
}
