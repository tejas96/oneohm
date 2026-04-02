import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Transform } from 'class-transformer';

/**
 * Lightweight DTO returned by GET /lookups/by-type/:typeCode
 * Used to populate dropdowns and select inputs in the frontend.
 * Keeps payload minimal — only UI-relevant fields.
 */
export class LookupByTypeCodeResponseDto {
  @ApiProperty()
  @Expose()
  id!: string;

  @ApiProperty({ example: 'referral' })
  @Expose()
  code!: string;

  @ApiProperty({ example: 'Referral' })
  @Expose()
  label!: string;

  @ApiPropertyOptional({ example: 'referral' })
  @Expose()
  value?: string;

  @ApiPropertyOptional({ example: '#4CAF50' })
  @Expose()
  color?: string;

  @ApiPropertyOptional({ example: 'TrendingUp' })
  @Expose()
  icon?: string;

  @ApiProperty({ example: 0 })
  @Expose()
  orderIndex!: number;

  @ApiPropertyOptional({ example: { region: 'north' } })
  @Expose()
  @Transform(({ key, obj }) => (obj as Record<string, unknown>)[key])
  metadata?: Record<string, unknown>;
}
