import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserGender, UserStatus } from '@oneohm-epc/shared/types';
import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

/**
 * DTO for creating a new employee profile
 */
export class CreateEmployeeDto {
  // ==================== Required Fields ====================
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'User ID to create employee profile for',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, {
    message: 'userId must be a valid UUID',
  })
  userId!: string;

  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Organization ID',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, {
    message: 'organizationId must be a valid UUID',
  })
  organizationId!: string;

  // ==================== Employment Info ====================
  @ApiPropertyOptional({
    example: 'EMP-2024-001',
    description: 'Unique employee ID within organization',
  })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  employeeId?: string;

  @ApiPropertyOptional({
    example: 'Sales Executive',
    description: 'Job designation/title',
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  designation?: string;

  @ApiPropertyOptional({
    example: 'Sales',
    description: 'Department name',
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  department?: string;

  @ApiPropertyOptional({
    example: '2024-01-15',
    description: 'Date of joining (YYYY-MM-DD)',
  })
  @IsDateString()
  @IsOptional()
  joiningDate?: string;

  // ==================== Contact Info ====================
  @ApiPropertyOptional({
    example: 'amit.patel@company.com',
    description: 'Work email address',
  })
  @IsEmail()
  @IsOptional()
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional({
    example: '+91-9876543210',
    description: 'Work phone number',
  })
  @IsString()
  @IsOptional()
  @Matches(/^[\d\s\-+()]+$/, {
    message: 'Phone must contain only digits, spaces, and +-() characters',
  })
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional({
    example: '+91-9876543211',
    description: 'Alternate phone number',
  })
  @IsString()
  @IsOptional()
  @Matches(/^[\d\s\-+()]+$/, {
    message: 'Phone must contain only digits, spaces, and +-() characters',
  })
  @MaxLength(20)
  alternatePhone?: string;

  // ==================== Personal Info ====================
  @ApiPropertyOptional({
    example: '1990-05-15',
    description: 'Date of birth (YYYY-MM-DD)',
  })
  @IsDateString()
  @IsOptional()
  dateOfBirth?: string;

  @ApiPropertyOptional({
    enum: Object.values(UserGender),
    enumName: 'UserGender',
    example: 'male',
    description: 'Gender',
  })
  @IsEnum(UserGender)
  @IsOptional()
  gender?: UserGender;

  @ApiPropertyOptional({
    example: 'https://example.com/avatar.jpg',
    description: 'Avatar URL',
  })
  @IsString()
  @IsOptional()
  avatarUrl?: string;

  // ==================== Address ====================
  @ApiPropertyOptional({
    example: '123, MG Road, Koramangala',
    description: 'Complete address',
  })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({ example: 'Bangalore', description: 'City' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({ example: 'Karnataka', description: 'State' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  state?: string;

  @ApiPropertyOptional({ example: 'India', description: 'Country' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  country?: string;

  @ApiPropertyOptional({ example: '560095', description: 'PIN code' })
  @IsString()
  @IsOptional()
  @MaxLength(10)
  pincode?: string;

  // ==================== Status ====================
  @ApiPropertyOptional({
    enum: Object.values(UserStatus),
    enumName: 'UserStatus',
    example: UserStatus.ACTIVE,
    description: 'Employee status',
  })
  @IsEnum(UserStatus)
  @IsOptional()
  status?: UserStatus;
}
