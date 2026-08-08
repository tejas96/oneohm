import { IsBoolean, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateRoleDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  code!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsOptional()
  level?: number;

  @IsBoolean()
  @IsOptional()
  isSystemRole?: boolean;
}
