import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LoanStatus } from '@tejas96/shared/types';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

/**
 * DTO for Creating Loan Application
 * Simplified for tracking customer loan interest with external banks
 */
export class CreateLoanApplicationDto {
  @ApiProperty({ description: 'Property ID', example: '123e4567-e89b-12d3-a456-426614174001' })
  @IsUUID()
  @IsNotEmpty()
  propertyId: string;

  @ApiProperty({ description: 'Customer ID', example: '123e4567-e89b-12d3-a456-426614174002' })
  @IsUUID()
  @IsNotEmpty()
  customerId: string;

  @ApiPropertyOptional({
    description: "Bank's loan reference number (entered by finance team after customer applies)",
    example: 'HDFC-LN-2024-12345',
  })
  @IsString()
  @IsOptional()
  bankReferenceNumber?: string;

  @ApiPropertyOptional({ description: 'Lender/Bank name', example: 'HDFC Bank' })
  @IsString()
  @IsOptional()
  lenderName?: string;

  @ApiPropertyOptional({ description: 'Lender contact', example: '+91-9876543210' })
  @IsString()
  @IsOptional()
  lenderContact?: string;

  @ApiPropertyOptional({
    description: 'Requested loan amount for reference',
    example: 500000,
    minimum: 0.01,
  })
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Loan amount must have at most 2 decimal places' })
  @IsOptional()
  @Min(0.01, { message: 'Loan amount must be greater than 0' })
  @Max(999999999999.99, { message: 'Loan amount exceeds maximum allowed value' })
  loanAmount?: number;

  @ApiPropertyOptional({ description: 'Status', enum: LoanStatus, example: LoanStatus.INITIATED })
  @IsEnum(LoanStatus)
  @IsOptional()
  status?: LoanStatus;

  @ApiPropertyOptional({ description: 'Notes', example: 'Customer prefers HDFC Bank' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({
    description: 'Created by user ID',
    example: '123e4567-e89b-12d3-a456-426614174003',
  })
  @IsUUID()
  @IsOptional()
  createdBy?: string;

  @ApiPropertyOptional({
    description: 'Updated by user ID',
    example: '123e4567-e89b-12d3-a456-426614174003',
  })
  @IsUUID()
  @IsOptional()
  updatedBy?: string;
}
