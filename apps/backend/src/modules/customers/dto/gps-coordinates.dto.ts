import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional } from 'class-validator';

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
}
