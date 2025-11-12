import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LoanStatus } from '@oneohm-epc/shared-types';
import { Expose, Type } from 'class-transformer';

import { CustomerResponseDto } from '../../customers/dto/customer-response.dto';
import { OrganizationResponseDto } from '../../organizations/dto/organization-response.dto';
import { UserResponseDto } from '../../users/dto/user-response.dto';

export class LoanApplicationResponseDto {
  @ApiProperty() @Expose() id: string;
  @ApiProperty() @Expose() organizationId: string;
  @ApiProperty() @Expose() projectId: string;
  @ApiProperty() @Expose() customerId: string;
  @ApiProperty() @Expose() applicationNumber: string;
  @ApiProperty() @Expose() applicationDate: Date;
  @ApiProperty() @Expose() loanAmount: number;
  @ApiProperty() @Expose() loanTenureMonths: number;
  @ApiPropertyOptional() @Expose() interestRate?: number;
  @ApiPropertyOptional() @Expose() lenderName?: string;
  @ApiPropertyOptional() @Expose() lenderContact?: string;
  @ApiPropertyOptional() @Expose() janSamarthApplicationId?: string;
  @ApiPropertyOptional() @Expose() janSamarthSubmittedAt?: Date;
  @ApiProperty({ enum: LoanStatus }) @Expose() status: LoanStatus;
  @ApiPropertyOptional() @Expose() siteVisitScheduledDate?: Date;
  @ApiPropertyOptional() @Expose() siteVisitCompletedDate?: Date;
  @ApiPropertyOptional() @Expose() siteVisitReport?: string;
  @ApiPropertyOptional() @Expose() approvedAmount?: number;
  @ApiPropertyOptional() @Expose() approvedAt?: Date;
  @ApiPropertyOptional() @Expose() approvedByLender?: string;
  @ApiPropertyOptional() @Expose() disbursementDate?: Date;
  @ApiPropertyOptional() @Expose() disbursementAmount?: number;
  @ApiPropertyOptional() @Expose() disbursementReference?: string;
  @ApiPropertyOptional() @Expose() rejectionReason?: string;
  @ApiPropertyOptional() @Expose() rejectedAt?: Date;
  @ApiPropertyOptional() @Expose() notes?: string;
  @ApiProperty() @Expose() createdAt: Date;
  @ApiProperty() @Expose() updatedAt: Date;
  @ApiPropertyOptional() @Expose() deletedAt?: Date;
  @ApiPropertyOptional() @Expose() createdBy?: string;
  @ApiPropertyOptional() @Expose() updatedBy?: string;

  @ApiPropertyOptional({ type: OrganizationResponseDto })
  @Expose()
  @Type(() => OrganizationResponseDto)
  organization?: OrganizationResponseDto;

  @ApiPropertyOptional({ type: CustomerResponseDto })
  @Expose()
  @Type(() => CustomerResponseDto)
  customer?: CustomerResponseDto;

  @ApiPropertyOptional({ type: UserResponseDto })
  @Expose()
  @Type(() => UserResponseDto)
  createdByUser?: UserResponseDto;
}
