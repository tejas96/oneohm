import { ApiProperty } from '@nestjs/swagger';
import { UserProfileType } from '@oneohm-epc/shared-types';
import { IsNotEmpty, IsString, IsUUID, IsEnum, IsOptional } from 'class-validator';

/**
 * Create Profile DTO
 * Used to create a new profile for a user in an organization
 */
export class CreateProfileDto {
  @ApiProperty({ example: 'uuid', description: 'User ID' })
  @IsUUID()
  @IsNotEmpty()
  userId!: string;

  @ApiProperty({ example: 'uuid', description: 'Organization ID' })
  @IsUUID()
  @IsNotEmpty()
  organizationId!: string;

  @ApiProperty({
    example: 'customer',
    enum: UserProfileType,
    description: 'Profile type to create',
  })
  @IsEnum(UserProfileType)
  @IsNotEmpty()
  profileType!: UserProfileType;

  @ApiProperty({ description: 'Profile-specific data' })
  @IsNotEmpty()
  profileData!: any;

  @ApiProperty({ example: 'uuid', description: 'User who created this profile', required: false })
  @IsOptional()
  @IsUUID()
  createdBy?: string;
}

/**
 * Update User Basic Info DTO
 */
export class UpdateUserBasicInfoDto {
  @ApiProperty({ example: 'John', required: false })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiProperty({ example: 'Doe', required: false })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiProperty({ example: 'john@example.com', required: false })
  @IsOptional()
  @IsString()
  email?: string;
}

/**
 * Profile Summary Response DTO
 */
export class ProfileSummaryResponseDto {
  @ApiProperty()
  userId!: string;

  @ApiProperty()
  phone!: string;

  @ApiProperty({ required: false })
  email?: string;

  @ApiProperty()
  firstName!: string;

  @ApiProperty({ required: false })
  lastName?: string;

  @ApiProperty()
  profileCompleted!: boolean;

  @ApiProperty({
    type: 'array',
    items: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: Object.values(UserProfileType) },
        organizationId: { type: 'string' },
        organizationName: { type: 'string' },
        profileId: { type: 'string' },
      },
    },
  })
  profiles!: {
    type: UserProfileType;
    organizationId: string;
    organizationName?: string;
    profileId: string;
  }[];
}
