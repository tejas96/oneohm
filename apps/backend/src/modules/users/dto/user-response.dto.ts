import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserStatus } from '@tejas96/shared/types';
import { Exclude, Expose } from 'class-transformer';

/**
 * User Response DTO
 * Only includes core authentication fields from UserEntity
 * Profile-specific fields are in separate profile DTOs
 */
@Exclude()
export class UserResponseDto {
  @Expose()
  @ApiProperty()
  id!: string;

  @Expose()
  @ApiProperty()
  firstName!: string;

  @Expose()
  @ApiPropertyOptional()
  lastName?: string;

  @Expose()
  @ApiPropertyOptional()
  email?: string;

  @Expose()
  @ApiProperty()
  phone!: string;

  @Expose()
  @ApiProperty({ description: 'Whether user has completed profile setup' })
  profileCompleted!: boolean;

  @Expose()
  @ApiProperty({ enum: UserStatus })
  status!: UserStatus;

  @Expose()
  @ApiProperty({ type: [String] })
  roles!: string[];

  /**
   * Flattened permission codes, unioned across every role the user holds.
   *
   * The web app gates on this, so it must be present on /auth/me — not only
   * in the JWT. Empty for `super_admin` and `admin`: they bypass rather than
   * hold grants, and the web app checks their role first.
   */
  @Expose()
  @ApiProperty({ type: [String] })
  permissions!: string[];

  @Expose()
  @ApiPropertyOptional()
  emailVerifiedAt?: Date;

  @Expose()
  @ApiPropertyOptional()
  phoneVerifiedAt?: Date;

  @Expose()
  @ApiPropertyOptional()
  lastLoginAt?: Date;

  @Expose()
  @ApiProperty()
  fullName!: string;

  @Expose()
  @ApiPropertyOptional()
  deletedAt?: Date;

  @Expose()
  @ApiProperty()
  createdAt!: Date;

  @Expose()
  @ApiProperty()
  updatedAt!: Date;
}
