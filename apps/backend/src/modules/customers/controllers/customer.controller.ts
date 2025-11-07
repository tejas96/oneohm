import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { CurrentUser, JwtAuthGuard, Role, Roles, RolesGuard } from '@oneohm-epc/shared-auth';
import { CustomerStatus } from '@oneohm-epc/shared-types';
import {
  ApiAction,
  ApiCreate,
  ApiDelete,
  ApiReadAll,
  ApiReadOne,
  ApiUpdate,
} from '@oneohm-epc/shared-utils';

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
 */
@ApiTags('Customers')
@ApiBearerAuth()
@Controller('api/v1/customers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  /**
   * Create a new customer
   */
  @ApiCreate({
    summary: 'Create a new customer',
    description: 'Creates a new customer/lead in the system.',
    responseType: CustomerResponseDto,
    roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.SALES],
    additionalErrors: [
      {
        status: 409,
        description: 'Customer with same email or consumer number already exists',
      },
    ],
  })
  async create(
    @Body() createDto: CreateCustomerDto,
    @CurrentUser() currentUser: any,
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
  @ApiReadAll({
    summary: 'Get all customers',
    description: 'Retrieve all customers for the current organization.',
    responseType: CustomerResponseDto,
    roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.SALES],
  })
  async findAll(@CurrentUser() currentUser: any): Promise<CustomerResponseDto[]> {
    const customers = await this.customerService.findAll(currentUser.organizationId);
    return customers as CustomerResponseDto[];
  }

  /**
   * Get customer by ID
   */
  @ApiReadOne({
    summary: 'Get customer by ID',
    description: 'Retrieve a specific customer by their ID.',
    responseType: CustomerResponseDto,
    roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.SALES],
  })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: any,
  ): Promise<CustomerResponseDto> {
    const customer = await this.customerService.findById(id, currentUser.organizationId);
    return customer as CustomerResponseDto;
  }

  /**
   * Update customer
   */
  @ApiUpdate({
    summary: 'Update customer',
    description: 'Update customer information.',
    responseType: CustomerResponseDto,
    roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.SALES],
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
    @CurrentUser() currentUser: any,
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
  @ApiAction({
    path: 'status',
    summary: 'Update customer status',
    description: `Update customer status (${Object.values(CustomerStatus).join(', ')}).`,
    responseType: CustomerResponseDto,
    roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER],
  })
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() statusDto: UpdateCustomerStatusDto,
    @CurrentUser() currentUser: any,
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
  @ApiDelete({
    summary: 'Delete customer',
    description: 'Soft delete a customer.',
    roles: [Role.SUPER_ADMIN, Role.ADMIN],
  })
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: any,
  ): Promise<void> {
    await this.customerService.delete(id, currentUser.organizationId);
  }

  /**
   * Get customer statistics by status
   */
  @Get('statistics/status')
  @ApiOperation({ summary: 'Get customer status statistics' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Customer statistics retrieved' })
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER)
  async getStatusStatistics(@CurrentUser() currentUser: any): Promise<Record<string, number>> {
    return this.customerService.getStatusStatistics(currentUser.organizationId);
  }
}
