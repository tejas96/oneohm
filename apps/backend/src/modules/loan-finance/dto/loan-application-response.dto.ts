import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LoanStatus } from '@oneohm-epc/shared-types';
import { Expose, Type } from 'class-transformer';

import { LoanDocumentResponseDto } from './loan-document-response.dto';
import { CustomerPropertyResponseDto } from '../../customers/dto/customer-property-response.dto';
import { CustomerResponseDto } from '../../customers/dto/customer-response.dto';
import { UserResponseDto } from '../../users/dto/user-response.dto';

/**
 * Response DTO for Loan Application
 * Simplified for tracking customer loan interest with external banks
 */
export class LoanApplicationResponseDto {
  @ApiProperty({ description: 'Loan application ID' })
  @Expose()
  id: string;

  @ApiPropertyOptional({ description: 'Property ID' })
  @Expose()
  propertyId?: string;

  @ApiProperty({ description: 'Customer ID' })
  @Expose()
  customerId: string;

  @ApiPropertyOptional({
    description: "Bank's loan reference number (entered by finance team)",
  })
  @Expose()
  bankReferenceNumber?: string;

  @ApiPropertyOptional({ description: 'Lender/Bank name' })
  @Expose()
  lenderName?: string;

  @ApiPropertyOptional({ description: 'Lender contact' })
  @Expose()
  lenderContact?: string;

  @ApiPropertyOptional({ description: 'Requested loan amount' })
  @Expose()
  loanAmount?: number;

  @ApiProperty({ description: 'Loan status', enum: LoanStatus })
  @Expose()
  status: LoanStatus;

  @ApiPropertyOptional({ description: 'Notes' })
  @Expose()
  notes?: string;

  @ApiProperty({ description: 'Created timestamp' })
  @Expose()
  createdAt: Date;

  @ApiProperty({ description: 'Updated timestamp' })
  @Expose()
  updatedAt: Date;

  @ApiPropertyOptional({ description: 'Deleted timestamp (soft delete)' })
  @Expose()
  deletedAt?: Date;

  @ApiPropertyOptional({ description: 'Created by user ID' })
  @Expose()
  createdBy?: string;

  @ApiPropertyOptional({ description: 'Updated by user ID' })
  @Expose()
  updatedBy?: string;

  @ApiPropertyOptional({ description: 'Property details', type: CustomerPropertyResponseDto })
  @Expose()
  @Type(() => CustomerPropertyResponseDto)
  property?: CustomerPropertyResponseDto;

  @ApiPropertyOptional({ description: 'Customer details', type: CustomerResponseDto })
  @Expose()
  @Type(() => CustomerResponseDto)
  customer?: CustomerResponseDto;

  @ApiPropertyOptional({ description: 'Created by user details', type: UserResponseDto })
  @Expose()
  @Type(() => UserResponseDto)
  createdByUser?: UserResponseDto;

  @ApiPropertyOptional({
    description: 'Loan documents (KYC)',
    type: [LoanDocumentResponseDto],
  })
  @Expose()
  @Type(() => LoanDocumentResponseDto)
  documents?: LoanDocumentResponseDto[];
}
