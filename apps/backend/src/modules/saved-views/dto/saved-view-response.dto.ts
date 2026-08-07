import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

import { SAVED_VIEW_RESOURCES, type SavedViewResource } from '../types/saved-view-resource';

export class SavedViewResponseDto {
  @ApiProperty()
  @Expose()
  id!: string;


  @ApiProperty()
  @Expose()
  userId!: string;

  @ApiProperty({ enum: SAVED_VIEW_RESOURCES })
  @Expose()
  resource!: SavedViewResource;

  @ApiProperty()
  @Expose()
  name!: string;

  @ApiProperty({ type: 'object', additionalProperties: true })
  @Expose()
  filters!: Record<string, unknown>;

  @ApiProperty()
  @Expose()
  createdAt!: Date;

  @ApiProperty()
  @Expose()
  updatedAt!: Date;
}
