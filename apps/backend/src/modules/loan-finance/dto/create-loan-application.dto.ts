import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LoanStatus } from '@oneohm-epc/shared-types';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsDecimal,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

/**
 * DTO for Creating Loan Application
 */
export class CreateLoanApplicationDto {
  @ApiProperty({ description: 'Organization ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  @IsNotEmpty()
  organizationId: string;

  @ApiProperty({ description: 'Project ID', example: '123e4567-e89b-12d3-a456-426614174001' })
  @IsUUID()
  @IsNotEmpty()
  projectId: string;

  @ApiProperty({ description: 'Customer ID', example: '123e4567-e89b-12d3-a456-426614174002' })
  @IsUUID()
  @IsNotEmpty()
  customerId: string;

  @ApiPropertyOptional({ description: 'Application date', example: '2024-01-15' })
  @IsDate()
  @IsOptional()
  @Type(() => Date)
  applicationDate?: Date;

  @ApiProperty({ description: 'Loan amount', example: 500000, minimum: 1 })
  @IsDecimal({ decimal_digits: '0,2' })
  @Min(0.01)
  loanAmount: number;

  @ApiProperty({ description: 'Loan tenure in months', example: 60, minimum: 1 })
  @IsInt()
  @Min(1)
  loanTenureMonths: number;

  @ApiPropertyOptional({ description: 'Interest rate %', example: 8.5 })
  @IsDecimal({ decimal_digits: '0,2' })
  @IsOptional()
  interestRate?: number;

  @ApiPropertyOptional({ description: 'Lender name', example: 'HDFC Bank' })
  @IsString()
  @IsOptional()
  lenderName?: string;

  @ApiPropertyOptional({ description: 'Lender contact', example: '+91-9876543210' })
  @IsString()
  @IsOptional()
  lenderContact?: string;

  @ApiPropertyOptional({ description: 'Jan Samarth application ID', example: 'JS2024001234' })
  @IsString()
  @IsOptional()
  janSamarthApplicationId?: string;

  @ApiPropertyOptional({ description: 'Status', enum: LoanStatus, example: LoanStatus.INITIATED })
  @IsEnum(LoanStatus)
  @IsOptional()
  status?: LoanStatus;

  @ApiPropertyOptional({ description: 'Notes', example: 'Customer prefers 5-year tenure' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ description: 'Created by user ID', example: '123e4567-e89b-12d3-a456-426614174003' })
  @IsUUID()
  @IsOptional()
  createdBy?: string;
}

