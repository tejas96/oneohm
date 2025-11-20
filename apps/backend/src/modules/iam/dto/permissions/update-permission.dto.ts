import { IsBoolean, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdatePermissionDto {
  @IsString()
  @IsOptional()
  @MaxLength(255)
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  action?: string;

  @IsEnum(['all', 'own', 'department', 'assigned', 'custom'])
  @IsOptional()
  scope?: 'all' | 'own' | 'department' | 'assigned' | 'custom';

  @IsEnum(['basic', 'standard', 'advanced', 'admin'])
  @IsOptional()
  permissionLevel?: 'basic' | 'standard' | 'advanced' | 'admin';

  @IsBoolean()
  @IsOptional()
  showInMenu?: boolean;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  menuLabel?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
