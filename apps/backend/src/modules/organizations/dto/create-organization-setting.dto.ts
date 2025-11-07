import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { SettingDataType } from '@oneohm-epc/shared-types';
import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

/**
 * DTO for creating an organization setting
 */
export class CreateOrganizationSettingDto {
  @ApiProperty({ description: 'Organization ID' })
  @IsUUID()
  organizationId: string;

  @ApiProperty({ description: 'Setting key', example: 'enable_notifications' })
  @IsString()
  @MaxLength(100)
  key: string;

  @ApiPropertyOptional({ description: 'Setting value', example: 'true' })
  @IsOptional()
  @IsString()
  value?: string;

  @ApiPropertyOptional({
    description: 'Data type of the value',
    enum: SettingDataType,
    default: SettingDataType.STRING,
  })
  @IsOptional()
  @IsEnum(SettingDataType)
  dataType?: SettingDataType;

  @ApiPropertyOptional({ description: 'Setting category', example: 'notifications' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  category?: string;

  @ApiPropertyOptional({ description: 'Setting description' })
  @IsOptional()
  @IsString()
  description?: string;
}
