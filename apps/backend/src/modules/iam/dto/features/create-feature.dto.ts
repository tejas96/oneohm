import { FeatureType } from '@oneohm-epc/shared-types';
import { IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateFeatureDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  code!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  icon?: string;

  @IsOptional()
  displayOrder?: number;

  @IsString()
  @IsOptional()
  parentFeatureId?: string;

  @IsEnum(['module', 'sub_feature', 'component', 'workflow'])
  @IsOptional()
  featureType?: FeatureType;

  @IsBoolean()
  @IsOptional()
  requiresLicense?: boolean;

  @IsString()
  @IsOptional()
  licenseTier?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsOptional()
  metadata?: Record<string, unknown>;
}
