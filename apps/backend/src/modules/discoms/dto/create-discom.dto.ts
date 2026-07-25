import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

import { GpsCoordinatesDto } from '../../customers/dto/gps-coordinates.dto';

export class CreateDiscomDto {
  @ApiProperty({ example: 'Sangli', description: 'DISCOM circle name' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  circleName!: string;

  @ApiProperty({ example: 'Amit Bokil', description: 'Circle in-charge (SE)' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  circleInchargeName!: string;

  @ApiProperty({ example: 'Sangli Urban', description: 'Division name' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  divisionName!: string;

  @ApiProperty({ example: 'Ashish Mehta', description: 'Division in-charge (EE)' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  divisionInchargeName!: string;

  @ApiPropertyOptional({ example: 'Sangli Testing Unit' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  testingUnitName?: string;

  @ApiPropertyOptional({ example: 'Sangli Subdivision' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  subdivisionName?: string;

  @ApiPropertyOptional({ example: 'SDO Name' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  subdivisionInchargeName?: string;

  @ApiPropertyOptional({ example: 'AEQC Engineer Name' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  aeqcEngineerName?: string;

  @ApiPropertyOptional({ example: 'Section A' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  sectionName?: string;

  @ApiPropertyOptional({ example: 'Section Engineer Name' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  sectionEngineerName?: string;

  @ApiPropertyOptional({ example: '123 Main Road, Sangli' })
  @IsString()
  @IsOptional()
  officeAddress?: string;

  @ApiPropertyOptional({ example: '9876543210' })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  mobileNo?: string;

  @ApiPropertyOptional({ example: 'office@example.com' })
  @IsEmail()
  @IsOptional()
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional({ description: 'Office geo location' })
  @IsOptional()
  @ValidateNested()
  @Type(() => GpsCoordinatesDto)
  geoLocation?: GpsCoordinatesDto;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
