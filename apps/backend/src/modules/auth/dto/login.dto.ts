import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, Matches, MinLength } from 'class-validator';

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
 * OTP Request DTO
 * Used to request OTP for phone number
 */
export class OtpRequestDto {
  @ApiProperty({ example: '+919876543210', description: 'Phone number with country code' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+?[1-9]\d{1,14}$/, {
    message: 'Phone number must be in international format (e.g., +919876543210)',
  })
  phone!: string;

  @ApiProperty({
    example: 'customer',
    enum: ['customer', 'reseller', 'employee'],
    required: false,
    description: 'User type hint for new users (optional)',
  })
  @IsOptional()
  @IsString()
  userType?: 'customer' | 'reseller' | 'employee';
}

/**
 * OTP Login DTO
 * Used to login with phone and OTP
 */
export class OtpLoginDto {
  @ApiProperty({ example: '+919876543210', description: 'Phone number with country code' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+?[1-9]\d{1,14}$/, {
    message: 'Phone number must be in international format (e.g., +919876543210)',
  })
  phone!: string;

  @ApiProperty({ example: '123456', description: '6-digit OTP' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{6}$/, {
    message: 'OTP must be a 6-digit number',
  })
  otp!: string;
}

export class LoginResponseDto {
  @ApiProperty()
  accessToken!: string;

  @ApiProperty()
  refreshToken!: string;

  @ApiProperty()
  user!: {
    id: string;
    email: string;
    firstName: string;
    lastName?: string;
    phone: string;
    profileCompleted: boolean;
    roles: string[];
  };
}

export class OtpRequestResponseDto {
  @ApiProperty({ example: 'OTP sent successfully' })
  message!: string;

  @ApiProperty({ example: false, description: 'True if this is a new user' })
  isNewUser!: boolean;
}
