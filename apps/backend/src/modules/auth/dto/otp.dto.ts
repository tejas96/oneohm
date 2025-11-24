import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsPhoneNumber, IsString, Length } from 'class-validator';

/**
 * Request OTP DTO
 * User can request OTP via phone or email
 */
export class RequestOtpDto {
  @ApiPropertyOptional({
    description: 'Phone number (with country code)',
    example: '+919876543210',
  })
  @IsOptional()
  @IsPhoneNumber('IN')
  phone?: string;

  @ApiPropertyOptional({ description: 'Email address', example: 'user@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;
}

/**
 * Verify OTP DTO
 * Verify OTP and login
 */
export class VerifyOtpDto {
  @ApiPropertyOptional({
    description: 'Phone number (with country code)',
    example: '+919876543210',
  })
  @IsOptional()
  @IsPhoneNumber('IN')
  phone?: string;

  @ApiPropertyOptional({ description: 'Email address', example: 'user@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ description: 'OTP code (6 digits)', example: '123456' })
  @IsNotEmpty()
  @IsString()
  @Length(6, 6)
  otp!: string;
}

/**
 * OTP Response DTO
 */
export class OtpResponseDto {
  @ApiProperty({ description: 'Success message' })
  message!: string;

  @ApiProperty({ description: 'Remaining time until next OTP can be requested (seconds)' })
  retryAfter?: number;
}
