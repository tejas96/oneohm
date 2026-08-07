import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Profile Summary DTO
 * Light-weight profile information included in login response
 */
export class ProfileSummaryDto {
  @ApiProperty({
    description: 'Profile type',
    enum: ['customer', 'reseller', 'employee'],
    example: 'employee',
  })
  type!: 'customer' | 'reseller' | 'employee';

  @ApiProperty({
    description: 'Profile ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  profileId!: string;

  @ApiProperty({
    description: 'Whether this is the primary/default profile',
    example: true,
  })
  isPrimary!: boolean;

  @ApiProperty({
    description: 'Profile status',
    enum: ['active', 'inactive', 'suspended'],
    example: 'active',
  })
  status!: string;

  @ApiPropertyOptional({
    description: 'Avatar URL',
    example: 'https://example.com/avatar.jpg',
  })
  avatarUrl?: string;

  @ApiPropertyOptional({
    description: 'Designation (for employees)',
    example: 'Sales Manager',
  })
  designation?: string;

  @ApiPropertyOptional({
    description: 'Department (for employees)',
    example: 'Sales',
  })
  department?: string;

  @ApiPropertyOptional({
    description: 'Business name (for resellers)',
    example: 'ABC Solar Solutions',
  })
  businessName?: string;
}

/**
 * User info included in login response
 */
export class LoginUserDto {
  @ApiProperty({
    description: 'User ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id!: string;

  @ApiProperty({
    description: 'Email address',
    example: 'john.doe@example.com',
  })
  email!: string;

  @ApiProperty({
    description: 'First name',
    example: 'John',
  })
  firstName!: string;

  @ApiPropertyOptional({
    description: 'Last name',
    example: 'Doe',
  })
  lastName?: string;

  @ApiProperty({
    description: 'Phone number',
    example: '+919876543210',
  })
  phone!: string;

  @ApiProperty({
    description: 'Whether user has completed basic profile setup',
    example: true,
  })
  profileCompleted!: boolean;

  @ApiProperty({
    description: 'User roles',
    type: [String],
    example: ['admin', 'employee'],
  })
  roles!: string[];

  @ApiProperty({
    description: 'User permissions (from assigned roles)',
    type: [String],
    example: ['users:read', 'users:create', 'organizations:manage'],
  })
  permissions!: string[];

  @ApiProperty({
    description: 'User profiles across organizations',
    type: [ProfileSummaryDto],
    isArray: true,
  })
  profiles!: ProfileSummaryDto[];

  @ApiProperty({
    description: 'Whether email is verified',
    example: true,
  })
  emailVerified!: boolean;

  @ApiProperty({
    description: 'Whether phone is verified',
    example: true,
  })
  phoneVerified!: boolean;

  @ApiProperty({
    description: 'Full name (computed)',
    example: 'John Doe',
  })
  fullName!: string;
}
