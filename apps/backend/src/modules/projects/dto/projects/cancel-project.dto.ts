import { ApiProperty } from '@nestjs/swagger';
import { LossReason } from '@tejas96/shared/types';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class CancelProjectSettlementDto {
  @ApiProperty({ enum: ['customer', 'lender'] })
  @IsIn(['customer', 'lender'])
  payerType!: 'customer' | 'lender';

  @ApiProperty({ example: 200000, description: 'Paise we keep. The rest is refunded.' })
  @IsInt()
  @Min(0)
  @Type(() => Number)
  keptPaise!: number;
}

export class CancelProjectDto {
  @ApiProperty({ enum: LossReason })
  @IsEnum(LossReason)
  lossReason!: LossReason;

  @ApiProperty({ example: 'Customer stopped paying after the second milestone' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  cancelReason!: string;

  @ApiProperty({
    enum: ['close', 'requote'],
    description: '"close" loses the roof; "requote" hands it back to the pipeline.',
  })
  @IsIn(['close', 'requote'])
  propertyOutcome!: 'close' | 'requote';

  @ApiProperty({
    type: [CancelProjectSettlementDto],
    required: false,
    description: 'One line per payer that has paid. Omit a payer to keep everything.',
  })
  @IsOptional()
  // `@IsArray` + `@ValidateNested({ each: true })` are what make the decorators
  // on CancelProjectSettlementDto actually run. Without them class-validator
  // accepts any element shape, and a negative `keptPaise` would refund MORE
  // than was ever collected — the service's "cannot keep more than was
  // collected" guard only catches the other direction.
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CancelProjectSettlementDto)
  settlements?: CancelProjectSettlementDto[];
}
