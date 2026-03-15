import { PermissionScope, PermissionLevel } from '@oneohm-epc/shared/types';
import { IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreatePermissionDto {
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
  @IsNotEmpty()
  action!: string;

  @IsEnum(['all', 'own', 'department', 'assigned', 'custom'])
  @IsOptional()
  scope?: PermissionScope;

  @IsOptional()
  conditions?: Record<string, unknown>;

  @IsEnum(['basic', 'standard', 'advanced', 'admin'])
  @IsOptional()
  permissionLevel?: PermissionLevel;

  @IsBoolean()
  @IsOptional()
  showInMenu?: boolean;

  @IsString()
  @IsOptional()
  menuLabel?: string;

  @IsOptional()
  dependsOnPermissionIds?: string[];

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
