import { ApiProperty } from '@nestjs/swagger';

/**
 * States API Response DTOs
 * Defines request/response structures for states endpoints
 *
 * @module master-data/dto/states
 */

export class GetStatesResponseDto {
  @ApiProperty({
    description: 'Request success status',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Array of Indian states',
    type: [String],
    example: ['Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', '... 24 more states'],
  })
  data: string[];

  @ApiProperty({
    description: 'Total number of states',
    example: 28,
  })
  count: number;
}
