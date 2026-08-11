import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EmployeeProfileKind, UserGender, UserStatus } from '@tejas96/shared/types';
import { maskAadhaar } from '@tejas96/shared/utils';
import { Exclude, Expose, Transform, Type } from 'class-transformer';

import { toNum } from '../../../common/utils';

/**
 * Nested User Response for Employee
 */
@Exclude()
class EmployeeUserDto {
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
  @ApiProperty()
  phone!: string;

  @Expose()
  @ApiPropertyOptional()
  email?: string;
}

/**
 * Nested Organization Response for Employee
 */
@Exclude()
class EmployeeOrganizationDto {
  @Expose()
  @ApiProperty()
  id!: string;

  @Expose()
  @ApiProperty()
  name!: string;
}

/**
 * Employee Profile Response DTO
 */
@Exclude()
export class EmployeeResponseDto {
  @Expose()
  @ApiProperty({ description: 'Employee profile ID' })
  id!: string;

  @Expose()
  @ApiProperty({ description: 'User ID' })
  userId!: string;

  // ==================== Employment ====================
  @Expose()
  @ApiPropertyOptional({ description: 'Employee ID' })
  employeeId?: string;

  @Expose()
  @ApiPropertyOptional({ description: 'Job designation' })
  designation?: string;

  @Expose()
  @ApiPropertyOptional({ description: 'Department' })
  department?: string;

  @Expose()
  @ApiPropertyOptional({ description: 'Date of joining' })
  joiningDate?: Date;

  // ==================== Contact ====================
  @Expose()
  @ApiPropertyOptional({ description: 'Work email' })
  email?: string;

  @Expose()
  @ApiPropertyOptional({ description: 'Work phone' })
  phone?: string;

  @Expose()
  @ApiPropertyOptional({ description: 'Alternate phone' })
  alternatePhone?: string;

  // ==================== Personal ====================
  @Expose()
  @ApiPropertyOptional({ description: 'Avatar URL' })
  avatarUrl?: string;

  @Expose()
  @ApiPropertyOptional({ description: 'Date of birth' })
  dateOfBirth?: Date;

  @Expose()
  @ApiPropertyOptional({ enum: UserGender })
  gender?: UserGender;

  // ==================== Address ====================
  @Expose()
  @ApiPropertyOptional()
  address?: string;

  @Expose()
  @ApiPropertyOptional()
  city?: string;

  @Expose()
  @ApiPropertyOptional()
  state?: string;

  @Expose()
  @ApiProperty()
  country!: string;

  @Expose()
  @ApiPropertyOptional()
  pincode?: string;

  // ==================== Status ====================
  @Expose()
  @ApiProperty({ enum: UserStatus })
  status!: UserStatus;

  // ==================== Profile Kind ====================
  @Expose()
  @ApiProperty({ enum: EmployeeProfileKind })
  profileKind!: EmployeeProfileKind;

  // ==================== Reseller: Personal Details ====================
  @Expose()
  @ApiPropertyOptional({
    description: 'Masked Aadhaar number (last 4 digits only). Full value is never returned.',
    example: 'XXXX-XXXX-0123',
  })
  @Transform(({ obj }: { obj: { aadhaarNumber?: string } }) => maskAadhaar(obj.aadhaarNumber))
  aadhaarNumberMasked?: string;

  @Expose()
  @ApiPropertyOptional()
  currentProfession?: string;

  @Expose()
  @ApiPropertyOptional()
  yearsOfExperience?: number;

  // ==================== Reseller: Company Details ====================
  @Expose()
  @ApiPropertyOptional()
  companyName?: string;

  @Expose()
  @ApiPropertyOptional()
  companyCode?: string;

  @Expose()
  @ApiPropertyOptional()
  contactPersonName?: string;

  // ==================== Reseller: Business Details ====================
  @Expose()
  @ApiPropertyOptional()
  gstin?: string;

  @Expose()
  @ApiPropertyOptional()
  pan?: string;

  // ==================== Reseller: Commission Structure ====================
  @Expose()
  @ApiPropertyOptional()
  @Transform(({ value }) => toNum(value))
  commissionPercentage?: number;

  // ==================== Reseller: Bank Details ====================
  @Expose()
  @ApiPropertyOptional()
  bankName?: string;

  @Expose()
  @ApiPropertyOptional()
  accountNumber?: string;

  @Expose()
  @ApiPropertyOptional()
  ifscCode?: string;

  @Expose()
  @ApiPropertyOptional()
  accountHolderName?: string;

  // ==================== Reseller: Performance Tracking ====================
  @Expose()
  @ApiPropertyOptional()
  totalLeadsGenerated?: number;

  @Expose()
  @ApiPropertyOptional()
  totalProjectsConverted?: number;

  @Expose()
  @ApiPropertyOptional()
  @Transform(({ value }) => toNum(value))
  totalRevenueGenerated?: number;

  @Expose()
  @ApiPropertyOptional()
  @Transform(({ value }) => toNum(value))
  totalCommissionEarned?: number;

  // ==================== Relations ====================
  @Expose()
  @Type(() => EmployeeUserDto)
  @ApiPropertyOptional({ type: EmployeeUserDto })
  user?: EmployeeUserDto;

  @Expose()
  @Type(() => EmployeeOrganizationDto)
  @ApiPropertyOptional({ type: EmployeeOrganizationDto })
  organization?: EmployeeOrganizationDto;

  // ==================== Roles ====================
  @Expose()
  @ApiPropertyOptional({ type: [String], description: 'Role codes assigned to this employee' })
  roles?: string[];

  // ==================== Audit ====================
  @Expose()
  @ApiProperty()
  createdAt!: Date;

  @Expose()
  @ApiProperty()
  updatedAt!: Date;

  @Expose()
  @ApiPropertyOptional()
  createdBy?: string;

  @Expose()
  @ApiPropertyOptional()
  updatedBy?: string;
}
