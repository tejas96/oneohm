// ============================================
// IMPORTS
// ============================================
// Shared types
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod, PaymentTransactionStatus } from '@oneohm-epc/shared-types';
import { Type } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

/**
 * DTO for creating a payment
 */
export class CreatePaymentDto {
  // ============================================
  // REQUIRED FIELDS
  // ============================================
  @ApiProperty({
    description: 'Organization ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  @IsNotEmpty()
  organizationId!: string;

  @ApiProperty({
    description: 'Project ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  @IsNotEmpty()
  projectId!: string;

  @ApiProperty({
    description: 'Customer ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  @IsNotEmpty()
  customerId!: string;

  @ApiProperty({
    description: 'Expected payment amount',
    example: 50000.0,
    minimum: 0.01,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @IsNotEmpty()
  @Type(() => Number)
  expectedAmount!: number;

  @ApiProperty({
    description: 'Actual paid amount',
    example: 50000.0,
    minimum: 0.01,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @IsNotEmpty()
  @Type(() => Number)
  paidAmount!: number;

  @ApiProperty({
    description: 'Payment method',
    enum: PaymentMethod,
    enumName: 'PaymentMethod',
    example: PaymentMethod.ONLINE,
  })
  @IsEnum(PaymentMethod)
  @IsNotEmpty()
  paymentMethod!: PaymentMethod;

  // ============================================
  // OPTIONAL FIELDS
  // ============================================
  @ApiPropertyOptional({
    description: 'Payment reference number',
    example: 'TXN123456789',
  })
  @IsString()
  @IsOptional()
  paymentReference?: string;

  @ApiPropertyOptional({
    description: 'Bank name',
    example: 'HDFC Bank',
  })
  @IsString()
  @IsOptional()
  bankName?: string;

  @ApiPropertyOptional({
    description: 'Bank account number',
    example: '1234567890',
  })
  @IsString()
  @IsOptional()
  accountNumber?: string;

  @ApiPropertyOptional({
    description: 'IFSC code',
    example: 'HDFC0001234',
  })
  @IsString()
  @IsOptional()
  ifscCode?: string;

  @ApiPropertyOptional({
    description: 'Transaction ID',
    example: 'TXN987654321',
  })
  @IsString()
  @IsOptional()
  transactionId?: string;

  @ApiPropertyOptional({
    description: 'Payment status',
    enum: PaymentTransactionStatus,
    enumName: 'PaymentTransactionStatus',
    example: PaymentTransactionStatus.RECEIVED,
    default: PaymentTransactionStatus.PENDING,
  })
  @IsEnum(PaymentTransactionStatus)
  @IsOptional()
  status?: PaymentTransactionStatus;

  @ApiPropertyOptional({
    description: 'Additional notes',
    example: 'Advance payment for project initiation',
  })
  @IsString()
  @IsOptional()
  notes?: string;
}
