import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserProfileType, UserStatus } from '@oneohm-epc/shared-types';
import {
  IsArray,
  IsEmail,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

/**
 * Create User DTO
 * Creates a user with optional profile creation in one call.
 *
 * Use cases:
 * 1. Create user only (no profile): Provide basic fields only
 * 2. Onboard employee/reseller: Provide organizationId + profileType + profileData
 * 3. Register customer: Can be done via self-registration flow
 */
export class CreateUserDto {
  // ==================== REQUIRED: Basic User Info ====================

  @ApiProperty({ example: 'John', description: 'First name of the user' })
  @IsString()
  @MaxLength(100)
  firstName!: string;

  @ApiPropertyOptional({ example: 'Doe', description: 'Last name of the user' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastName?: string;

  @ApiProperty({
    example: '+919876543210',
    description: 'Phone number (primary identifier for OTP login)',
  })
  @IsString()
  @MaxLength(20)
  @Matches(/^[\d\s\-+()]+$/, {
    message: 'Phone must contain only numbers and valid characters',
  })
  phone!: string;

  @ApiPropertyOptional({
    example: 'john.doe@example.com',
    description: 'Email address (required for email/password login)',
  })
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional({
    example: 'SecurePassword123!',
    description: 'Password (optional for OTP-only users)',
  })
  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(50)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message:
      'Password must contain at least one uppercase letter, one lowercase letter, and one number',
  })
  password?: string;

  @ApiPropertyOptional({
    enum: UserStatus,
    enumName: 'UserStatus',
    example: UserStatus.ACTIVE,
    description: 'Initial user status (defaults to active)',
  })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  // ==================== OPTIONAL: Profile Creation ====================
  // When organization onboards employee/reseller, provide these fields

  @ApiPropertyOptional({
    example: '00000000-0000-0000-0000-000000000001',
    description: 'Organization ID for profile creation. Required if profileType is provided.',
  })
  @ValidateIf((o) => o.profileType !== undefined)
  @IsUUID('all')
  organizationId?: string;

  @ApiPropertyOptional({
    enum: UserProfileType,
    enumName: 'UserProfileType',
    example: UserProfileType.EMPLOYEE,
    description:
      'Type of profile to create. When provided, also requires organizationId.\n' +
      '- employee: Creates employee profile + assigns employee_basic role\n' +
      '- reseller: Creates reseller profile + assigns reseller role\n' +
      '- customer: Creates customer profile + assigns customer role',
  })
  @IsOptional()
  @IsEnum(UserProfileType)
  profileType?: UserProfileType;

  @ApiPropertyOptional({
    description:
      'Profile-specific data. Structure depends on profileType:\n' +
      '- employee: { employeeId?, designation?, department?, joiningDate? }\n' +
      '- reseller: { companyName?, gstNumber?, panNumber? }\n' +
      '- customer: { source?, referredBy? }',
    example: {
      employeeId: 'EMP001',
      designation: 'Sales Executive',
      department: 'Sales',
    },
  })
  @IsOptional()
  @IsObject()
  profileData?: Record<string, unknown>;

  // ==================== DEPRECATED: Use profileType instead ====================

  @ApiPropertyOptional({
    type: [String],
    example: ['employee_basic'],
    description:
      'DEPRECATED: Roles are auto-assigned based on profileType. ' +
      'Only use for special cases requiring manual role assignment.',
    deprecated: true,
  })
  @IsOptional()
  @IsArray()
  roles?: string[];
}
