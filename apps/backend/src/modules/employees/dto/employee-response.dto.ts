import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserGender, UserStatus } from '@oneohm-epc/shared/types';
import { Exclude, Expose, Type } from 'class-transformer';

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

  @Expose()
  @ApiProperty({ description: 'Organization ID' })
  organizationId!: string;

  // ==================== Employment ====================
  @Expose()
  @ApiPropertyOptional({ description: 'Employee ID within organization' })
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
