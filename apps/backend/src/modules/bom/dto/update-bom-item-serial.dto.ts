import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDefined,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

const SERIAL_NUMBER_PATTERN = /^[A-Za-z0-9_/-]+$/;

export class UpdateBomItemSerialDto {
  @ApiProperty({
    description: 'Serialized unit number (set null to clear)',
    example: 'ADN-540-2026-001',
    nullable: true,
  })
  @IsDefined()
  @ValidateIf((_, value: unknown) => value !== null)
  @IsString()
  @MaxLength(100)
  @Matches(SERIAL_NUMBER_PATTERN, {
    message: 'serialNumber can only contain letters, numbers, -, _, /',
  })
  serialNumber!: string | null;
}

export class BulkBomItemSerialUpdateDto {
  @ApiProperty({ description: 'BOM item ID' })
  @IsUUID()
  id!: string;

  @ApiProperty({
    description: 'Serialized unit number (set null to clear)',
    example: 'INV-SNG-5K-0102',
    nullable: true,
  })
  @IsDefined()
  @ValidateIf((_, value: unknown) => value !== null)
  @IsString()
  @MaxLength(100)
  @Matches(SERIAL_NUMBER_PATTERN, {
    message: 'serialNumber can only contain letters, numbers, -, _, /',
  })
  serialNumber!: string | null;
}

export class BulkUpdateBomItemSerialsDto {
  @ApiProperty({ type: [BulkBomItemSerialUpdateDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkBomItemSerialUpdateDto)
  items!: BulkBomItemSerialUpdateDto[];
}
