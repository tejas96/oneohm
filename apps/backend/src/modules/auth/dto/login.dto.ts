import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserProfileType } from '@tejas96/shared/types';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsPhoneNumber,
  IsString,
  Length,
  Matches,
  MinLength,
  ValidateIf,
} from 'class-validator';

import { LoginUserDto } from './profile-summary.dto';

/**
 * Email/Password Login DTO
 * Traditional authentication method for admin and employee users
 */
export class LoginDto {
  @ApiProperty({ example: 'john.doe@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'SecurePassword123!' })
  @IsString()
  @MinLength(8)
  password!: string;
}

/**
 * Request OTP DTO
 * Either phone OR email must be provided (at least one)
 */
export class RequestOtpDto {
  @ApiPropertyOptional({
    description: 'Phone number in E.164 format (with country code)',
    example: '+919876543210',
  })
  @IsOptional()
  @ValidateIf((o: RequestOtpDto) => !o.email) // Validate phone if email not provided
  @IsNotEmpty({ message: 'Either phone or email must be provided' })
  @IsPhoneNumber(undefined, {
    message: 'Phone number must be in E.164 format (e.g., +919876543210)',
  })
  phone?: string;

  @ApiPropertyOptional({
    description: 'Email address',
    example: 'user@example.com',
  })
  @IsOptional()
  @ValidateIf((o: RequestOtpDto) => !o.phone) // Validate email if phone not provided
  @IsNotEmpty({ message: 'Either phone or email must be provided' })
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({
    description: 'Login User Type (customer, reseller, or employee)',
    enum: UserProfileType,
    example: UserProfileType.CUSTOMER,
  })
  @IsOptional()
  @IsEnum(UserProfileType, { message: 'loginUserType must be a valid UserProfileType' })
  loginUserType?: UserProfileType;
}

/**
 * Verify OTP DTO
 * Used to verify OTP and login
 */
export class VerifyOtpDto {
  @ApiPropertyOptional({
    description: 'Phone number in E.164 format (with country code)',
    example: '+919876543210',
  })
  @IsOptional()
  @ValidateIf((o: VerifyOtpDto) => !o.email)
  @IsNotEmpty({ message: 'Either phone or email must be provided' })
  @IsPhoneNumber(undefined, {
    message: 'Phone number must be in E.164 format (e.g., +919876543210)',
  })
  phone?: string;

  @ApiPropertyOptional({
    description: 'Email address',
    example: 'user@example.com',
  })
  @IsOptional()
  @ValidateIf((o: VerifyOtpDto) => !o.phone)
  @IsNotEmpty({ message: 'Either phone or email must be provided' })
  @IsEmail()
  email?: string;

  @ApiProperty({ description: 'OTP code (6 digits)', example: '123456' })
  @IsNotEmpty()
  @IsString()
  @Length(6, 6, { message: 'OTP must be exactly 6 digits' })
  @Matches(/^\d{6}$/, { message: 'OTP must contain only digits' })
  otp!: string;

  @ApiProperty({
    description: 'Login User Type (customer or employee)',
    enum: UserProfileType,
    example: UserProfileType.CUSTOMER,
  })
  @IsNotEmpty({ message: 'loginUserType is required' })
  @IsEnum(UserProfileType, { message: 'loginUserType must be a valid UserProfileType' })
  loginUserType!: UserProfileType;
}

/**
 * Login Response DTO
 * Returned after successful authentication
 */
export class LoginResponseDto {
  @ApiProperty({
    description: 'JWT access token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken!: string;

  @ApiProperty({
    description: 'JWT refresh token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  refreshToken!: string;

  @ApiProperty({
    description: 'User information with profiles',
    type: LoginUserDto,
  })
  user!: LoginUserDto;
}

/**
 * OTP Request Response DTO
 */
export class OtpRequestResponseDto {
  @ApiProperty({ example: 'OTP sent successfully' })
  message!: string;

  @ApiProperty({
    example: 60,
    description: 'Seconds to wait before requesting another OTP',
  })
  retryAfter?: number;
}
