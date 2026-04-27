import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, Length, Matches, MinLength } from 'class-validator';

/**
 * Forgot Password DTO
 * Request a password reset link via email
 */
export class ForgotPasswordDto {
  @ApiProperty({
    description: 'Email address associated with the account',
    example: 'user@example.com',
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email!: string;
}

/**
 * Forgot Password by Phone DTO
 * Request OTP for password reset via mobile number
 */
export class ForgotPasswordByPhoneDto {
  @ApiProperty({
    description: '10-digit Indian mobile number',
    example: '9876543210',
  })
  @IsString()
  @Matches(/^[6-9]\d{9}$/, {
    message: 'Please provide a valid 10-digit Indian mobile number',
  })
  phone!: string;
}

/**
 * Verify Password Reset OTP DTO
 * Verifies OTP and returns reset token
 */
export class VerifyPasswordResetOtpDto {
  @ApiProperty({
    description: '10-digit Indian mobile number',
    example: '9876543210',
  })
  @IsString()
  @Matches(/^[6-9]\d{9}$/, {
    message: 'Please provide a valid 10-digit Indian mobile number',
  })
  phone!: string;

  @ApiProperty({
    description: '6-digit OTP',
    example: '123456',
  })
  @IsString()
  @Length(6, 6, { message: 'OTP must be 6 digits' })
  @Matches(/^\d{6}$/, { message: 'OTP must be 6 digits' })
  otp!: string;
}

/**
 * Reset Password DTO
 * Set a new password using the reset token
 */
export class ResetPasswordDto {
  @ApiProperty({
    description: 'Password reset token received via email',
    example: 'a1b2c3d4e5f6...',
  })
  @IsString()
  @IsNotEmpty({ message: 'Reset token is required' })
  token!: string;

  @ApiProperty({
    description: 'New password (minimum 8 characters)',
    example: 'NewSecurePassword123!',
  })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @IsNotEmpty({ message: 'New password is required' })
  newPassword!: string;
}

/**
 * Password Reset Response DTO
 * Generic response for password reset operations
 */
export class PasswordResetResponseDto {
  @ApiProperty({
    description: 'Response message',
    example: 'If an account exists, a reset link has been sent',
  })
  message!: string;
}

/**
 * Password Reset OTP Verify Response DTO
 * Returns temporary reset token and masked email
 */
export class PasswordResetOtpVerifyResponseDto {
  @ApiProperty({
    description: 'Password reset token used by reset-password endpoint',
    example: 'a1b2c3d4e5f6...',
  })
  resetToken!: string;

  @ApiProperty({
    description: 'Masked account email for display',
    example: 'te***@example.com',
  })
  maskedEmail!: string;
}
