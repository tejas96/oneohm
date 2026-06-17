import { SubsidyStatus } from '@tejas96/shared/types';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

/**
 * DTO for creating a subsidy application
 */
export class CreateSubsidyApplicationDto {
  @IsUUID()
  @IsNotEmpty()
  organizationId: string;

  @IsUUID()
  @IsNotEmpty()
  projectId: string;

  @IsUUID()
  @IsNotEmpty()
  customerId: string;

  @IsDate()
  @IsOptional()
  @Type(() => Date)
  applicationDate?: Date;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  subsidyScheme?: string;

  @IsNumber()
  @IsPositive()
  @IsNotEmpty()
  appliedAmount: number;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  portalName?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  portalApplicationId?: string;

  @IsEnum(SubsidyStatus)
  @IsOptional()
  status?: SubsidyStatus;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsUUID()
  @IsOptional()
  createdBy?: string;
}
