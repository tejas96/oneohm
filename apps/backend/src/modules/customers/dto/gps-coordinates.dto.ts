import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsISO8601, IsNumber, IsOptional, IsUUID } from 'class-validator';

export class GpsCoordinatesDto {
  @ApiProperty({ example: 19.076 })
  @IsNumber()
  latitude!: number;

  @ApiProperty({ example: 72.8777 })
  @IsNumber()
  longitude!: number;

  @ApiPropertyOptional({ example: 12.5, description: 'Accuracy in meters' })
  @IsNumber()
  @IsOptional()
  accuracy?: number;

  @ApiPropertyOptional({ example: 14.2, description: 'Altitude in meters' })
  @IsNumber()
  @IsOptional()
  altitude?: number;

  /*
    Both fields have to be named here or the whole request is rejected: the
    global pipe runs with forbidNonWhitelisted, which throws on an unlisted
    property rather than quietly dropping it.
  */
  @ApiPropertyOptional({ description: 'User who pinned this while standing on the site' })
  @IsUUID()
  @IsOptional()
  verifiedBy?: string;

  @ApiPropertyOptional({ example: '2026-09-05T09:12:00.000Z' })
  @IsISO8601()
  @IsOptional()
  verifiedAt?: string;
}
