import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

/**
 * Re-baseline a project's BOM onto a named quote version.
 *
 * One body for both halves of the operation: without `apply` it previews and
 * writes nothing, with `apply: true` it applies. Preview and apply share a
 * body so a client cannot preview one version and apply another by accident.
 *
 * `reason` is optional HERE and mandatory in the service when applying —
 * class-validator cannot express "required only when another field is true"
 * without a custom validator, and BomBaselineService.applyRebaseline already
 * rejects a reason under 3 characters. Previewing needs no reason because it
 * changes nothing.
 */
export class RebaselineBomDto {
  @ApiProperty({ description: 'The quote version to re-baseline onto' })
  @IsUUID()
  quoteVersionId!: string;

  @ApiPropertyOptional({
    description: 'Why. Required when apply is true.',
    example: 'Customer signed revision C — two extra panels',
  })
  @IsOptional()
  @IsString()
  @MinLength(3, { message: 'Give a reason of at least 3 characters' })
  @MaxLength(500)
  reason?: string;

  @ApiPropertyOptional({
    description: 'Apply the re-baseline. Omit or false to preview only.',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  apply?: boolean;
}
