import { Body, Controller, Get, HttpStatus, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { type CurrentUserType, CurrentUser, JwtAuthGuard } from '@oneohm-epc/shared-auth';
import { CustomerStatus } from '@oneohm-epc/shared-types';
import {
  ApiAction,
  ApiCreate,
  ApiDelete,
  ApiReadAll,
  ApiReadOne,
  ApiUpdate,
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
 * NEW IAM: Now using @RequirePermission() instead of hardcoded @Roles()
 * Permissions are checked via JWT payload (fast, stateless)
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
      'Creates a new customer/lead in the system. Requires: customers:create permission.',
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
    const customer = await this.customerService.create(
      currentUser.organizationId,
      createDto,
      currentUser.id,
    );
    return customer as CustomerResponseDto;
  }

  /**
   * Get all customers
   */
  @RequirePermission('customers:read')
  @ApiReadAll({
    summary: 'Get all customers',
    description:
      'Retrieve all customers for the current organization. Requires: customers:read permission.',
    responseType: CustomerResponseDto,
  })
  async findAll(@CurrentUser() currentUser: CurrentUserType): Promise<CustomerResponseDto[]> {
    const customers = await this.customerService.findAll(currentUser.organizationId);
    return customers as CustomerResponseDto[];
  }

  /**
   * Get customer by ID
   */
  @RequirePermission('customers:read')
  @ApiReadOne({
    summary: 'Get customer by ID',
    description: 'Retrieve a specific customer by their ID. Requires: customers:read permission.',
    responseType: CustomerResponseDto,
  })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: CurrentUserType,
  ): Promise<CustomerResponseDto> {
    const customer = await this.customerService.findById(id, currentUser.organizationId);
    return customer as CustomerResponseDto;
  }

  /**
   * Update customer
   */
  @RequirePermission('customers:update')
  @ApiUpdate({
    summary: 'Update customer',
    description: 'Update customer information. Requires: customers:update permission.',
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
    @CurrentUser() currentUser: CurrentUserType,
  ): Promise<CustomerResponseDto> {
    const customer = await this.customerService.update(
      id,
      currentUser.organizationId,
      updateDto,
      currentUser.id,
    );
    return customer as CustomerResponseDto;
  }

  /**
   * Update customer status (generic)
   */
  @RequirePermission('customers:update-status')
  @ApiAction({
    path: 'status',
    summary: 'Update customer status',
    description: `Update customer status (${Object.values(CustomerStatus).join(', ')}). Requires: customers:update-status permission.`,
    responseType: CustomerResponseDto,
  })
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() statusDto: UpdateCustomerStatusDto,
    @CurrentUser() currentUser: CurrentUserType,
  ): Promise<CustomerResponseDto> {
    const customer = await this.customerService.updateStatus(
      id,
      currentUser.organizationId,
      statusDto.status,
      currentUser.id,
    );
    return customer as CustomerResponseDto;
  }

  /**
   * Delete customer
   */
  @RequirePermission('customers:delete')
  @ApiDelete({
    summary: 'Delete customer',
    description: 'Soft delete a customer. Requires: customers:delete permission.',
  })
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: CurrentUserType,
  ): Promise<void> {
    await this.customerService.delete(id, currentUser.organizationId);
  }

  /**
   * Get customer statistics by status
   */
  @Get('statistics/status')
  @RequirePermission('customers:read')
  @ApiOperation({
    summary: 'Get customer status statistics',
    description: 'Get customer statistics grouped by status. Requires: customers:read permission.',
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'Customer statistics retrieved' })
  async getStatusStatistics(
    @CurrentUser() currentUser: CurrentUserType,
  ): Promise<Record<string, number>> {
    return this.customerService.getStatusStatistics(currentUser.organizationId);
  }
}
