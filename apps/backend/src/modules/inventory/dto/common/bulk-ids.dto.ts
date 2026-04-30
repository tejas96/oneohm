import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsString,
  IsUUID,
} from 'class-validator';

/**
 * Hard cap on a single bulk batch. Larger than this and the request becomes a
 * point load on the DB (each id triggers a transactional cancel with row
 * locks). 100 is the same cap used elsewhere for bulk write paths.
 */
export const BULK_IDS_MAX = 100;

export class BulkIdsDto {
  @ApiProperty({
    description: 'Array of resource IDs (1-100, all UUIDs, must be unique)',
    example: ['123e4567-e89b-12d3-a456-426614174000'],
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(BULK_IDS_MAX)
  @ArrayUnique()
  @IsString({ each: true })
  @IsUUID('all', { each: true })
  ids!: string[];
}

export class BulkCancelDto extends BulkIdsDto {
  @ApiProperty({ example: 'Vendor cancelled the order', description: 'Cancellation reason' })
  @IsString()
  reason!: string;
}
