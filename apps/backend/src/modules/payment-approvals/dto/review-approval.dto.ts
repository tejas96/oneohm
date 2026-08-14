import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RejectApprovalDto {
  @ApiProperty({
    description: 'Why this was rejected. Shown to the submitter, who must resubmit a new record.',
    example: 'UPI reference does not match the bank statement',
  })
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason!: string;
}

export class BulkApproveDto {
  @ApiProperty({
    type: [String],
    description: 'Pending ids to approve. Capped at 100 so one call cannot run unbounded.',
  })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(100)
  @IsUUID('4', { each: true })
  ids!: string[];
}
