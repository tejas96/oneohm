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

import { CurrentUser, JwtAuthGuard, Role, RolesGuard } from '@oneohm-epc/shared-auth';
import { UserStatus } from '@oneohm-epc/shared-types';
import {
  ApiAction,
  ApiCreate,
  ApiDelete,
  ApiReadAll,
  ApiReadOne,
  ApiUpdate,
} from '@oneohm-epc/shared-utils';
import { plainToInstance } from 'class-transformer';

import { CreateUserDto, UpdateUserDto, UpdateUserStatusDto, UserResponseDto } from '../dto';
import { UserService } from '../services/user.service';

@ApiTags('Users')
@Controller('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @ApiCreate({
    summary: 'Create a new user',
    responseType: UserResponseDto,
    roles: [Role.SUPER_ADMIN, Role.ADMIN],
  })
  async create(
    @Body() createDto: CreateUserDto,
    @CurrentUser() currentUser: any,
  ): Promise<UserResponseDto> {
    const user = await this.userService.create(createDto, currentUser.id);
    return plainToInstance(UserResponseDto, user, {
      excludeExtraneousValues: true,
    });
  }

  @Get()
  @ApiReadAll({
    summary: 'Get all users',
    responseType: UserResponseDto,
    roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.SALES],
  })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: UserStatus,
    example: UserStatus.ACTIVE,
  })
  async findAll(
    @CurrentUser() currentUser: any,
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 20,
    @Query('status') status?: UserStatus,
  ): Promise<{
    items: UserResponseDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    const result = await this.userService.findAll(currentUser.organizationId, page, limit, status);

    return {
      ...result,
      items: result.items.map((user) =>
        plainToInstance(UserResponseDto, user, {
          excludeExtraneousValues: true,
        }),
      ),
    };
  }

  @Get(':id')
  @ApiReadOne({
    summary: 'Get user by ID',
    responseType: UserResponseDto,
    roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.SALES],
  })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<UserResponseDto> {
    const user = await this.userService.findById(id);
    return plainToInstance(UserResponseDto, user, {
      excludeExtraneousValues: true,
    });
  }

  @Put(':id')
  @ApiUpdate({
    summary: 'Update user',
    responseType: UserResponseDto,
    roles: [Role.SUPER_ADMIN, Role.ADMIN],
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateUserDto,
    @CurrentUser() currentUser: any,
  ): Promise<UserResponseDto> {
    const user = await this.userService.update(id, updateDto, currentUser.id);
    return plainToInstance(UserResponseDto, user, {
      excludeExtraneousValues: true,
    });
  }

  @Delete(':id')
  @ApiDelete({
    summary: 'Delete user',
    roles: [Role.SUPER_ADMIN, Role.ADMIN],
  })
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: any,
  ): Promise<void> {
    await this.userService.delete(id, currentUser.id);
  }

  @Post(':id/status')
  @ApiAction({
    path: 'status',
    summary: 'Update user status',
    description:
      'Update user status to active, inactive, or suspended. Generic endpoint for all status transitions.',
    responseType: UserResponseDto,
    roles: [Role.SUPER_ADMIN, Role.ADMIN],
  })
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() statusDto: UpdateUserStatusDto,
    @CurrentUser() currentUser: any,
  ): Promise<UserResponseDto> {
    const user = await this.userService.updateStatus(id, statusDto.status, currentUser.id);
    return plainToInstance(UserResponseDto, user, {
      excludeExtraneousValues: true,
    });
  }
}
