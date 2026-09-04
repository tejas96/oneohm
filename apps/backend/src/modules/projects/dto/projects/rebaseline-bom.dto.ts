import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

/**
 * Which quote version to re-baseline the project BOM onto.
 *
 * Always explicit, never "the latest". syncBomFromSnapshot picked the newest
 * version by itself, which silently re-priced signed deals — the same drift
 * projects.contract_quote_version_id exists to stop.
 */
export class PreviewBomRebaselineDto {
  @ApiProperty({ description: 'The quote version to diff the BOM against' })
  @IsUUID()
  quoteVersionId!: string;
}

export class ApplyBomRebaselineDto extends PreviewBomRebaselineDto {
  /** Recorded on every change row this produces. bom_changes is append-only. */
  @ApiProperty({ example: 'Customer approved the revised panel count' })
  @IsString()
  @MinLength(3, { message: 'Give a reason of at least 3 characters' })
  @MaxLength(500)
  reason!: string;
}
