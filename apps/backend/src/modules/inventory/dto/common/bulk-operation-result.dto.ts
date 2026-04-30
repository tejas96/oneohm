import { ApiProperty } from '@nestjs/swagger';

class BulkFailureDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id!: string;

  @ApiProperty({ example: 'Cannot cancel a delivered dispatch' })
  reason!: string;
}

export class BulkOperationResultDto {
  @ApiProperty({
    type: [String],
    example: ['123e4567-e89b-12d3-a456-426614174000'],
    description: 'IDs that completed successfully',
  })
  succeeded!: string[];

  @ApiProperty({
    type: [BulkFailureDto],
    description: 'IDs that failed, with the rejection reason',
  })
  failed!: BulkFailureDto[];
}
