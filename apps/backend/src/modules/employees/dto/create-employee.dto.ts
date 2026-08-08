import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EmployeeProfileKind, UserGender, UserStatus } from '@tejas96/shared/types';
import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
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
    message: 'userId must be a valid UUID',
  })

  // ==================== Employment Info ====================
  @ApiPropertyOptional({
    example: 'EMP-2024-001',
    description: 'Unique employee ID',
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

  // ==================== Profile Kind ====================
  @ApiPropertyOptional({
    enum: Object.values(EmployeeProfileKind),
    enumName: 'EmployeeProfileKind',
    example: EmployeeProfileKind.STAFF,
    description: 'Sub-type of employee profile (staff or reseller). Defaults to staff.',
  })
  @IsEnum(EmployeeProfileKind)
  @IsOptional()
  profileKind?: EmployeeProfileKind;

  // ==================== Reseller: Company Details ====================
  @ApiPropertyOptional({
    example: 'SolarTech Partners',
    description: 'Company/firm name (reseller profiles only)',
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  companyName?: string;

  @ApiPropertyOptional({
    example: 'RESELLER-2024-001',
    description: 'Unique company code (reseller profiles only)',
  })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  companyCode?: string;

  @ApiPropertyOptional({
    example: 'Amit Sharma',
    description: 'Primary contact person name (reseller profiles only)',
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  contactPersonName?: string;

  // ==================== Reseller: Business Details ====================
  @ApiPropertyOptional({
    example: '29ABCDE1234F1Z5',
    description: 'GST identification number (reseller profiles only)',
  })
  @IsString()
  @IsOptional()
  @MaxLength(15)
  gstin?: string;

  @ApiPropertyOptional({
    example: 'ABCDE1234F',
    description: 'PAN card number (reseller profiles only)',
  })
  @IsString()
  @IsOptional()
  @MaxLength(10)
  pan?: string;

  // ==================== Reseller: Commission Structure ====================
  @ApiPropertyOptional({
    example: 4.0,
    description: 'Default commission percentage (reseller profiles only)',
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsOptional()
  @Min(0)
  commissionPercentage?: number;

  // ==================== Reseller: Bank Details ====================
  @ApiPropertyOptional({
    example: 'HDFC Bank',
    description: 'Bank name (reseller profiles only)',
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  bankName?: string;

  @ApiPropertyOptional({
    example: '12345678901234',
    description: 'Bank account number (reseller profiles only)',
  })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  accountNumber?: string;

  @ApiPropertyOptional({
    example: 'HDFC0001234',
    description: 'IFSC code (reseller profiles only)',
  })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  ifscCode?: string;

  @ApiPropertyOptional({
    example: 'SolarTech Partners',
    description: 'Name as per bank account (reseller profiles only)',
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  accountHolderName?: string;
}
