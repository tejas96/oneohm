import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';

import { CurrentUser } from '../../auth/decorators';
import { JwtAuthGuard } from '../../auth/guards';
import type { CurrentUserType } from '../../auth/types';
import { RequirePermission } from '../../iam/decorators/require-permission.decorator';
import { PermissionGuard } from '../../iam/guards/permission.guard';
import { CreateReturnRequestDto } from '../dto/return-requests/create-return-request.dto';
import { ReturnRequestResponseDto } from '../dto/return-requests/return-request-response.dto';
import type { ReturnRequestStatus } from '../entities/return-request.entity';
import { ReturnRequestService } from '../services/return-request.service';

@ApiTags('Return Requests')
@ApiBearerAuth()
@Controller('inventory/return-requests')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class ReturnRequestController {
  constructor(private readonly returnRequestService: ReturnRequestService) {}

  /**
   * Manually create a return request (also created automatically by BOM reconcile on over-dispatch).
   */
  @RequirePermission('inventory:write')
  @Post()
  @ApiOperation({ summary: 'Create a return request' })
  async create(
    @CurrentUser() currentUser: CurrentUserType,
    @Body() dto: CreateReturnRequestDto,
  ): Promise<ReturnRequestResponseDto> {
    const result = await this.returnRequestService.create(dto, currentUser.id);
    return plainToInstance(ReturnRequestResponseDto, result, { excludeExtraneousValues: true });
  }

  @RequirePermission('inventory:read')
  @Get()
  @ApiOperation({ summary: 'List return requests with optional filters' })
  async list(
    @Query('status') status?: ReturnRequestStatus,
    @Query('bomId') bomId?: string,
    @Query('allocationId') allocationId?: string,
  ): Promise<ReturnRequestResponseDto[]> {
    const results = await this.returnRequestService.list({
      status,
      bomId,
      allocationId,
    });
    return plainToInstance(ReturnRequestResponseDto, results, { excludeExtraneousValues: true });
  }

  @RequirePermission('inventory:read')
  @Get(':id')
  @ApiOperation({ summary: 'Get a single return request' })
  async findById(@Param('id', ParseUUIDPipe) id: string): Promise<ReturnRequestResponseDto> {
    const result = await this.returnRequestService.findById(id);
    return plainToInstance(ReturnRequestResponseDto, result, { excludeExtraneousValues: true });
  }

  /**
   * Complete — PM has physically received the units; releases them back to available stock.
   */
  @RequirePermission('inventory:write')
  @Patch(':id/complete')
  @ApiOperation({ summary: 'Complete a return request (PM confirms physical receipt)' })
  async complete(
    @CurrentUser() currentUser: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ReturnRequestResponseDto> {
    const result = await this.returnRequestService.complete(id, currentUser.id);
    return plainToInstance(ReturnRequestResponseDto, result, { excludeExtraneousValues: true });
  }

  /**
   * Cancel — PM accepts the over-dispatch as scope creep; no inventory change.
   */
  @RequirePermission('inventory:write')
  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancel a return request (accept over-dispatch as scope creep)' })
  async cancel(
    @CurrentUser() currentUser: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ReturnRequestResponseDto> {
    const result = await this.returnRequestService.cancel(id, currentUser.id);
    return plainToInstance(ReturnRequestResponseDto, result, { excludeExtraneousValues: true });
  }
}
