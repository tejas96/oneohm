import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

/**
 * DTO for updating commission information
 * All fields are optional for partial updates
 */
export class UpdateCommissionDto {
  @ApiPropertyOptional({
    example: 500000.0,
    description: 'Total project value in INR',
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsOptional()
  @Min(0)
  projectValue?: number;

  @ApiPropertyOptional({
    example: 4.0,
    description: 'Commission percentage',
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsOptional()
  @Min(0)
  commissionPercentage?: number;

  @ApiPropertyOptional({
    example: 20000.0,
    description: 'Calculated commission amount',
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsOptional()
  @Min(0)
  commissionAmount?: number;

  @ApiPropertyOptional({
    example: '2024-12-25',
    description: 'Payment date',
  })
  @IsDateString()
  @IsOptional()
  paidAt?: Date;

  @ApiPropertyOptional({
    example: 'bank_transfer',
    description: 'Payment mode',
  })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  paymentMode?: string;

  @ApiPropertyOptional({
    example: 'TXN123456789',
    description: 'Payment transaction reference',
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  paymentReference?: string;

  @ApiPropertyOptional({
    example: 'INV-2024-001',
    description: 'Invoice number',
  })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  invoiceNumber?: string;

  @ApiPropertyOptional({
    example: '2024-12-20',
    description: 'Invoice date',
  })
  @IsDateString()
  @IsOptional()
  invoiceDate?: Date;

  @ApiPropertyOptional({
    example: '/uploads/invoices/inv-001.pdf',
    description: 'Path to invoice file',
  })
  @IsString()
  @IsOptional()
  invoiceFilePath?: string;

  @ApiPropertyOptional({
    example: 'Commission for Project XYZ',
    description: 'Additional notes',
  })
  @IsString()
  @IsOptional()
  notes?: string;
}
