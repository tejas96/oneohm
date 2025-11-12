import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LoanDocumentType } from '@oneohm-epc/shared-types';
import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateLoanDocumentDto {
  @ApiProperty() @IsUUID() @IsNotEmpty() loanApplicationId: string;
  @ApiProperty({ enum: LoanDocumentType }) @IsEnum(LoanDocumentType) documentType: LoanDocumentType;
  @ApiProperty() @IsString() @IsNotEmpty() documentName: string;
  @ApiProperty() @IsString() @IsNotEmpty() filePath: string;
  @ApiPropertyOptional() @IsUUID() @IsOptional() createdBy?: string;
}
