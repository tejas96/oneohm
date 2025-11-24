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
  ApiAction,
  ApiCreate,
  ApiDelete,
  ApiReadAll,
  ApiReadOne,
  ApiUpdate,
} from '@oneohm-epc/shared-utils';
import { plainToInstance } from 'class-transformer';

import { JwtAuthGuard } from '../../auth/guards';
import { CreateUserDto, UpdateUserDto, UpdateUserStatusDto, UserResponseDto } from '../dto';
import { UserService } from '../services/user.service';

/**
 * User Controller
 * Handles core user authentication operations
 * Note: Users are no longer organization-specific
 */
@ApiTags('Users')
@Controller('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @ApiCreate({
    summary: 'Create a new user',
    responseType: UserResponseDto,
  })
  async create(@Body() createDto: CreateUserDto): Promise<UserResponseDto> {
    const user = await this.userService.create(createDto);
    return plainToInstance(UserResponseDto, user, {
      excludeExtraneousValues: true,
    });
  }

  @Get()
  @ApiReadAll({
    summary: 'Get all users',
    description:
      'Returns all users across all organizations. Use profile endpoints to filter by organization.',
    responseType: UserResponseDto,
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
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 20,
    @Query('status') status?: UserStatus,
  ): Promise<{
    items: UserResponseDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    const result = await this.userService.findAll(page, limit, status);

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
    description:
      'Updates core user authentication fields only. Use profile endpoints for profile-specific fields.',
    responseType: UserResponseDto,
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    const user = await this.userService.update(id, updateDto);
    return plainToInstance(UserResponseDto, user, {
      excludeExtraneousValues: true,
    });
  }

  @Delete(':id')
  @ApiDelete({
    summary: 'Delete user',
  })
  async delete(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.userService.delete(id);
  }

  @Post(':id/status')
  @ApiAction({
    path: 'status',
    summary: 'Update user status',
    description:
      'Update user status to active, inactive, or suspended. Generic endpoint for all status transitions.',
    responseType: UserResponseDto,
  })
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() statusDto: UpdateUserStatusDto,
  ): Promise<UserResponseDto> {
    const user = await this.userService.updateStatus(id, statusDto.status);
    return plainToInstance(UserResponseDto, user, {
      excludeExtraneousValues: true,
    });
  }
}
