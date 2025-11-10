import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@oneohm-epc/shared-auth';
import { UserStatus } from '@oneohm-epc/shared-types';
import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class UserResponseDto {
  @Expose()
  @ApiProperty()
  id!: string;

  @Expose()
  @ApiProperty()
  organizationId!: string;

  @Expose()
  @ApiProperty()
  firstName!: string;

  @Expose()
  @ApiPropertyOptional()
  lastName?: string;

  @Expose()
  @ApiProperty()
  email!: string;

  @Expose()
  @ApiProperty()
  phone!: string;

  @Expose()
  @ApiPropertyOptional()
  alternatePhone?: string;

  @Expose()
  @ApiPropertyOptional()
  avatarUrl?: string;

  @Expose()
  @ApiPropertyOptional()
  dateOfBirth?: Date;

  @Expose()
  @ApiPropertyOptional()
  gender?: string;

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
  @ApiPropertyOptional()
  country?: string;

  @Expose()
  @ApiPropertyOptional()
  pincode?: string;

  @Expose()
  @ApiPropertyOptional()
  employeeId?: string;

  @Expose()
  @ApiPropertyOptional()
  designation?: string;

  @Expose()
  @ApiPropertyOptional()
  department?: string;

  @Expose()
  @ApiPropertyOptional()
  joiningDate?: Date;

  @Expose()
  @ApiProperty({ enum: UserStatus })
  status!: UserStatus;

  @Expose()
  @ApiProperty({ type: [String], enum: Role })
  roles!: Role[];

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
  @ApiProperty()
  createdAt!: Date;

  @Expose()
  @ApiProperty()
  updatedAt!: Date;
}
