import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ChangeRequestType, ConnectionType, PropertyType } from '@tejas96/shared/types';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class ChangeRequestItemDto {
  @ApiProperty({ enum: ChangeRequestType })
  @IsEnum(ChangeRequestType)
  type!: ChangeRequestType;

  @ApiPropertyOptional({ example: 'Shreya Patil' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  newName?: string;

  @ApiPropertyOptional({ example: 'Shreya Patil' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  correctedName?: string;

  @ApiPropertyOptional({ enum: PropertyType })
  @IsOptional()
  @IsEnum(PropertyType)
  newPropertyType?: PropertyType;

  @ApiPropertyOptional({ enum: ConnectionType })
  @IsOptional()
  @IsEnum(ConnectionType)
  phase?: ConnectionType;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  newSanctionedLoad?: number;

  @ApiPropertyOptional({ example: 'EV meter for parking slot' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
