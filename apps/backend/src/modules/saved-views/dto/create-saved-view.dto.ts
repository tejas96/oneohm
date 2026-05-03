import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsObject, IsString, MaxLength, MinLength } from 'class-validator';

import { SAVED_VIEW_RESOURCES, type SavedViewResource } from '../types/saved-view-resource';

export class CreateSavedViewDto {
  @ApiProperty({
    enum: SAVED_VIEW_RESOURCES,
    description: 'List page this view applies to',
  })
  @IsIn(SAVED_VIEW_RESOURCES as readonly string[])
  resource!: SavedViewResource;

  @ApiProperty({ minLength: 1, maxLength: 100, example: 'My pending POs' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;

  @ApiProperty({
    type: 'object',
    additionalProperties: true,
    example: { status: 'draft', vendorId: '00000000-0000-0000-0000-000000000000' },
    description: 'Filter values keyed by the same names accepted by the corresponding list API',
  })
  @IsObject()
  filters!: Record<string, unknown>;
}
