import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@oneohm-epc/shared-auth';
import { UserStatus } from '@oneohm-epc/shared-types';
import {
  ArrayNotEmpty,
  IsArray,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * Create User DTO
 * Only includes core authentication fields
 * Profile-specific fields should be set via profile creation endpoints
 */
export class CreateUserDto {
  @ApiProperty({ example: 'John' })
  @IsString()
  @MaxLength(100)
  firstName!: string;

  @ApiPropertyOptional({ example: 'Doe' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastName?: string;

  @ApiPropertyOptional({ example: 'john.doe@example.com' })
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @ApiProperty({ example: '+919876543210' })
  @IsString()
  @MaxLength(20)
  @Matches(/^[\d\s\-+()]+$/, {
    message: 'Phone must contain only numbers and valid characters',
  })
  phone!: string;

  @ApiPropertyOptional({ example: 'SecurePassword123!', description: 'Optional for OTP-only users' })
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
    enum: Object.values(UserStatus),
    enumName: 'UserStatus',
    example: UserStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @ApiProperty({
    type: [String],
    enum: Role,
    example: [Role.SALES],
    description: 'User roles',
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(Role, { each: true })
  roles!: Role[];
}
