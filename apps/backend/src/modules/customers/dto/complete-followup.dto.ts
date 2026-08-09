import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FollowupOutcome, FollowupPriority, FollowupType } from '@tejas96/shared/types';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';

/**
 * The followup that replaces the one being completed.
 *
 * Required only when the completing followup is the last pending one on the
 * lead unit — that is exactly when omitting it would leave the lead with nobody
 * owing it an action. The server decides this, not the client.
 */
export class NextFollowupDto {
  @ApiProperty({ example: '2026-08-11T10:00:00.000Z' })
  @IsDateString()
  scheduledAt!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  assignedToUserId!: string;

  @ApiProperty({ example: 'Follow up on discount request' })
  @IsString()
  @MaxLength(255)
  subject!: string;

  @ApiPropertyOptional({ enum: FollowupType, default: FollowupType.TASK })
  @IsOptional()
  @IsEnum(FollowupType)
  type?: FollowupType;

  @ApiPropertyOptional({ enum: FollowupPriority, default: FollowupPriority.NORMAL })
  @IsOptional()
  @IsEnum(FollowupPriority)
  priority?: FollowupPriority;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CompleteFollowupDto {
  @ApiProperty({ enum: FollowupOutcome })
  @IsEnum(FollowupOutcome)
  outcome!: FollowupOutcome;

  @ApiPropertyOptional({ description: 'Required when outcome is "other".' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    type: NextFollowupDto,
    description:
      'Required when this is the last pending followup on the lead unit, unless terminal is set.',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => NextFollowupDto)
  next?: NextFollowupDto;

  @ApiPropertyOptional({
    enum: ['accepted', 'lost'],
    description: 'Closes the chain instead of scheduling a next followup.',
  })
  @IsOptional()
  @IsIn(['accepted', 'lost'])
  terminal?: 'accepted' | 'lost';

  @ApiPropertyOptional({ description: 'Required when terminal is "lost".' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  lostReason?: string;
}
