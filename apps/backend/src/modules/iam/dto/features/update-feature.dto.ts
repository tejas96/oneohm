import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class UpdateFeatureDto {
  @IsString()
  @IsOptional()
  @MaxLength(255)
  name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  code?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  icon?: string;

  @IsInt()
  @IsOptional()
  displayOrder?: number;

  @IsUUID()
  @IsOptional()
  parentFeatureId?: string;

  @IsEnum(['module', 'sub_feature', 'component', 'workflow'])
  @IsOptional()
  featureType?: 'module' | 'sub_feature' | 'component' | 'workflow';

  @IsBoolean()
  @IsOptional()
  requiresLicense?: boolean;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  licenseTier?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

