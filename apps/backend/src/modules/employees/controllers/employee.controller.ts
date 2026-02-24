import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { UserStatus } from '@oneohm-epc/shared-types';
import {
  ApiCreate,
  ApiDelete,
  ApiReadAll,
  ApiReadOne,
  ApiUpdate,
  ApiAction,
  OrganizationContext,
} from '@oneohm-epc/shared-utils';

import { CurrentUser } from '../../auth/decorators';
import { JwtAuthGuard } from '../../auth/guards';
import type { CurrentUserType } from '../../auth/types';
import {
  CreateEmployeeDto,
  EmployeeResponseDto,
  UpdateEmployeeDto,
  UpdateEmployeeStatusDto,
} from '../dto';
import { EmployeeService } from '../services/employee.service';

/**
 * Employee Controller
 * Handles employee profile CRUD operations
 */
@ApiTags('Employees')
@Controller('employees')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class EmployeeController {
  constructor(private readonly employeeService: EmployeeService) {}

  @Post()
  @ApiCreate({
    summary: 'Create a new employee profile',
    description:
      'Creates an employee profile for a user in an organization. ' +
      'The user must already exist. Auto-assigns employee_basic role via ProfileService.',
    responseType: EmployeeResponseDto,
  })
  async create(
    @Body() createDto: CreateEmployeeDto,
    @CurrentUser() currentUser: CurrentUserType,
  ): Promise<EmployeeResponseDto> {
    return this.employeeService.create(createDto, currentUser?.id);
  }

  @Get()
  @ApiReadAll({
    summary: 'Get all employees in organization',
    description: 'Returns paginated list of employees. Requires x-organization-id header.',
    responseType: EmployeeResponseDto,
  })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: UserStatus,
    example: UserStatus.ACTIVE,
  })
  @ApiQuery({
    name: 'department',
    required: false,
    description: 'Filter by department',
  })
  async findAll(
    @OrganizationContext() organizationId: string,
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 20,
    @Query('status') status?: UserStatus,
    @Query('department') department?: string,
  ): Promise<{
    items: EmployeeResponseDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    if (department) {
      const employees = await this.employeeService.findByDepartment(organizationId, department);
      const paged = employees.slice((page - 1) * limit, page * limit);
      return {
        items: paged,
        total: employees.length,
        page,
        limit,
      };
    }

    return this.employeeService.findByOrganization(organizationId, page, limit, status);
  }

  @Get(':id')
  @ApiReadOne({
    summary: 'Get employee by ID',
    responseType: EmployeeResponseDto,
  })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<EmployeeResponseDto> {
    return this.employeeService.findById(id);
  }

  @Get('user/:userId')
  @ApiReadAll({
    summary: 'Get all employee profiles for a user',
    description: 'Returns all employee profiles across all organizations for a user',
    responseType: EmployeeResponseDto,
  })
  async findByUser(@Param('userId', ParseUUIDPipe) userId: string): Promise<EmployeeResponseDto[]> {
    return this.employeeService.findByUserId(userId);
  }

  @Put(':id')
  @ApiUpdate({
    summary: 'Update employee profile',
    responseType: EmployeeResponseDto,
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateEmployeeDto,
    @CurrentUser() currentUser: CurrentUserType,
  ): Promise<EmployeeResponseDto> {
    return this.employeeService.update(id, updateDto, currentUser?.id);
  }

  @Post(':id/status')
  @ApiAction({
    path: 'status',
    summary: 'Update employee status',
    description: 'Update employee status to active, inactive, or suspended',
    responseType: EmployeeResponseDto,
  })
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() statusDto: UpdateEmployeeStatusDto,
    @CurrentUser() currentUser: CurrentUserType,
  ): Promise<EmployeeResponseDto> {
    return this.employeeService.updateStatus(id, statusDto.status, currentUser.id);
  }

  @Delete(':id')
  @ApiDelete({
    summary: 'Delete employee profile',
    description: 'Soft deletes an employee profile',
  })
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: CurrentUserType,
  ): Promise<void> {
    return this.employeeService.delete(id, currentUser.id);
  }
}
