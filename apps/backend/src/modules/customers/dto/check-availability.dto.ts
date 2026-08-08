import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';
import { IsEmail, IsOptional, IsString, IsUUID } from 'class-validator';

/**
 * Query DTO for checking customer availability by phone/email
 * Used to validate if a phone number or email is already registered
 */
export class CheckAvailabilityQueryDto {
  // but needs to be in DTO to pass validation when sent as query param
  @ApiPropertyOptional({
    example: '7e5ce9c8-9c17-4a86-8fcd-da9ce182467b',
  })
  @ApiPropertyOptional({
    description: 'Phone number to check (10 digits or with country code)',
    example: '+919876543210',
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({
    description: 'Email address to check',
    example: 'customer@example.com',
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({
    description: 'Customer ID to exclude from check (for edit mode)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  excludeCustomerId?: string;
}

/**
 * Response DTO for availability check
 */
@Exclude()
export class AvailabilityResponseDto {
  @Expose()
  @ApiProperty({
    description: 'Whether the phone number is already registered',
    example: true,
  })
  phoneExists!: boolean;

  @Expose()
  @ApiProperty({
    description: 'Whether the email is already registered',
    example: false,
  })
  emailExists!: boolean;

  @Expose()
  @ApiPropertyOptional({
    description: 'Error message for phone if it exists',
    example: 'This phone number is already registered',
  })
  phoneError?: string;

  @Expose()
  @ApiPropertyOptional({
    description: 'Error message for email if it exists',
    example: 'This email is already registered',
  })
  emailError?: string;
}
