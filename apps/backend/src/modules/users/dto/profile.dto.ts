import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserProfileType } from '@oneohm-epc/shared-types';
import { IsNotEmpty, IsString, IsEnum, IsOptional, IsObject } from 'class-validator';

/**
 * Create Profile DTO
 * Used to create a new profile for a user in an organization
 * Note: userId comes from URL parameter, not body
 *
 * Profile data structure depends on profileType:
 * - customer: See CreateCustomerDto in modules/customers/dto
 * - reseller: See CreateResellerDto in modules/resellers/dto
 * - employee: See CreateEmployeeDto in modules/employees/dto
 */
export class CreateProfileDto {
  @ApiProperty({
    example: '00000000-0000-0000-0000-000000000001',
    description: 'Organization ID where profile will be created',
  })
  @IsString()
  @IsNotEmpty()
  organizationId!: string;

  @ApiProperty({
    enum: UserProfileType,
    example: 'employee',
    description:
      'Type of profile to create. Auto-assigns corresponding role:\n' +
      '- customer → customer role\n' +
      '- employee → employee_basic role\n' +
      '- reseller → reseller role',
    enumName: 'UserProfileType',
  })
  @IsEnum(UserProfileType)
  @IsNotEmpty()
  profileType!: UserProfileType;

  @ApiProperty({
    description:
      'Profile-specific data. Structure depends on profileType:\n' +
      '- employee: { employeeId, designation, department, joiningDate, email, phone, address, city, state, pincode }\n' +
      '- customer: See CreateCustomerDto\n' +
      '- reseller: See CreateResellerDto',
    example: {
      employeeId: 'EMP001',
      designation: 'Sales Executive',
      department: 'Sales',
      joiningDate: '2024-01-15',
    },
  })
  @IsObject()
  @IsNotEmpty()
  profileData!: Record<string, unknown>;
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
