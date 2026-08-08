import { InspectionStatus } from '@tejas96/shared/types';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

/**
 * DTO for creating an inspection
 */
export class CreateInspectionDto {
  @IsUUID()
  @IsNotEmpty()
  projectId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  inspectionType: string;

  @IsDate()
  @IsNotEmpty()
  @Type(() => Date)
  scheduledDate: Date;

  @IsDate()
  @IsOptional()
  @Type(() => Date)
  actualDate?: Date;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  inspectorName?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  inspectorOrganization?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  inspectorContact?: string;

  @IsEnum(InspectionStatus)
  @IsOptional()
  status?: InspectionStatus;

  @IsString()
  @IsOptional()
  inspectionReport?: string;

  @IsString()
  @IsOptional()
  issuesFound?: string;

  @IsString()
  @IsOptional()
  correctiveActions?: string;

  @IsString()
  @IsOptional()
  reportFilePath?: string;

  @IsOptional()
  photos?: Record<string, unknown>;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsUUID()
  @IsOptional()
  createdBy?: string;
}
