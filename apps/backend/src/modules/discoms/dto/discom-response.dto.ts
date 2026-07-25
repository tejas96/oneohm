import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { type GpsCoordinates } from '@tejas96/shared/types';
import { Exclude, Expose, Transform } from 'class-transformer';

import { buildDiscomLabel } from '../utils/discom-label.util';

@Exclude()
export class DiscomResponseDto {
  @ApiProperty()
  @Expose()
  id!: string;

  @ApiProperty()
  @Expose()
  circleName!: string;

  @ApiProperty()
  @Expose()
  circleInchargeName!: string;

  @ApiProperty()
  @Expose()
  divisionName!: string;

  @ApiProperty()
  @Expose()
  divisionInchargeName!: string;

  @ApiPropertyOptional()
  @Expose()
  testingUnitName?: string;

  @ApiPropertyOptional()
  @Expose()
  subdivisionName?: string;

  @ApiPropertyOptional()
  @Expose()
  subdivisionInchargeName?: string;

  @ApiPropertyOptional()
  @Expose()
  aeqcEngineerName?: string;

  @ApiPropertyOptional()
  @Expose()
  sectionName?: string;

  @ApiPropertyOptional()
  @Expose()
  sectionEngineerName?: string;

  @ApiPropertyOptional()
  @Expose()
  officeAddress?: string;

  @ApiPropertyOptional()
  @Expose()
  mobileNo?: string;

  @ApiPropertyOptional()
  @Expose()
  email?: string;

  @ApiPropertyOptional()
  @Expose()
  @Transform(({ key, obj }) => (obj as Record<string, unknown>)[key])
  geoLocation?: GpsCoordinates;

  @ApiProperty()
  @Expose()
  isActive!: boolean;

  @ApiProperty({
    description: 'Human-readable label for pickers and display',
    example: 'Sangli Urban – Section A',
  })
  @Expose()
  @Transform(({ obj }) =>
    buildDiscomLabel({
      circleName: obj.circleName,
      divisionName: obj.divisionName,
      subdivisionName: obj.subdivisionName,
      sectionName: obj.sectionName,
    }),
  )
  label!: string;

  @ApiProperty()
  @Expose()
  createdAt!: Date;

  @ApiProperty()
  @Expose()
  updatedAt!: Date;

  @ApiProperty({ description: 'Count of active customer properties linked to this DISCOM' })
  @Expose()
  @Transform(({ obj }) => Number((obj as Record<string, unknown>).linkedPropertiesCount ?? 0))
  linkedPropertiesCount!: number;
}
