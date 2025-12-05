import {
  Body,
  Controller,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
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

import { CurrentUser } from '../../auth/decorators';
import { JwtAuthGuard } from '../../auth/guards';
import type { CurrentUserType } from '../../auth/types';
import {
  CreateProfileDto,
  CreateUserDto,
  UpdateUserDto,
  UpdateUserStatusDto,
  UserResponseDto,
} from '../dto';
import { ProfileService } from '../services/profile.service';
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
  constructor(
    private readonly userService: UserService,
    private readonly profileService: ProfileService,
  ) {}

  @ApiCreate({
    path: '',
    summary: 'Create a new user',
    description:
      'Creates a user with optional profile.\n\n' +
      '**User Only:** Provide basic fields (firstName, phone, email, password)\n\n' +
      '**With Profile (Org Onboarding):** Also provide organizationId, profileType, profileData.\n' +
      'Profile types: employee, reseller, customer. Role is auto-assigned based on profileType.',
    responseType: UserResponseDto,
  })
  async create(
    @Body() createDto: CreateUserDto,
    @CurrentUser() currentUser: CurrentUserType,
  ): Promise<UserResponseDto> {
    const user = await this.userService.create(createDto, currentUser.id);
    return plainToInstance(UserResponseDto, user, {
      excludeExtraneousValues: true,
    });
  }

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

  @ApiReadOne({
    path: ':id',
    summary: 'Get user by ID',
    responseType: UserResponseDto,
  })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<UserResponseDto> {
    const user = await this.userService.findById(id);
    return plainToInstance(UserResponseDto, user, {
      excludeExtraneousValues: true,
    });
  }

  @ApiUpdate({
    path: ':id',
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

  @ApiDelete({
    path: ':id',
    summary: 'Delete user',
  })
  async delete(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.userService.delete(id);
  }

  @ApiAction({
    path: ':id/status',
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

  @ApiCreate({
    path: ':id/profiles',
    summary: 'Create user profile',
    description:
      'Create a new profile (customer/employee/reseller) for a user in an organization. Automatically assigns the corresponding role.',
    responseType: Object,
    statusCode: 201,
    successMessage: 'Profile created successfully',
  })
  async createProfile(
    @Param('id', ParseUUIDPipe) userId: string,
    @Body() createProfileDto: CreateProfileDto,
    @CurrentUser() currentUser: CurrentUserType,
  ): Promise<any> {
    const createdBy = currentUser?.id;

    // Create profile with auto role assignment
    const profile = await this.profileService.createProfile({
      userId,
      organizationId: createProfileDto.organizationId,
      profileType: createProfileDto.profileType,
      profileData: createProfileDto.profileData,
      createdBy,
    });

    return profile;
  }
}
