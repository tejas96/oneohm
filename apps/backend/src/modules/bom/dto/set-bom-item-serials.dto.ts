import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, IsArray, IsString, Matches, MaxLength } from 'class-validator';

const SERIAL_NUMBER_PATTERN = /^[A-Za-z0-9_/-]+$/;

/**
 * The whole serial list for one BOM line.
 *
 * Replaces UpdateBomItemSerialDto (one serial, one row) and
 * BulkUpdateBomItemSerialsDto (many rows, one serial each). Both existed only
 * because a serialized line used to be exploded into one bom_items row per
 * unit; serials now live on their own table, so the caller states what the
 * line's serials ARE and the endpoint is idempotent. Sending `[]` clears them
 * — that is what "set null to clear" used to mean, without a nullable field.
 */
export class SetBomItemSerialsDto {
  @ApiProperty({
    description: 'Every serial number on this line. Send [] to clear them.',
    example: ['ADN-540-2026-001', 'ADN-540-2026-002'],
    type: [String],
  })
  @IsArray()
  // Bounded so a malformed client cannot make the service round-trip an
  // unbounded array before the quantity check rejects it. No real line has
  // 1000 units.
  @ArrayMaxSize(1000)
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  @Matches(SERIAL_NUMBER_PATTERN, {
    each: true,
    message: 'serialNumber can only contain letters, numbers, -, _, /',
  })
  serials!: string[];
}
