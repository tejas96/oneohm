import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';

import { MilestoneAggregateDto } from '../../projects/dto/projects/milestone-aggregate.dto';

export class ConsumerProjectTimelineResponseDto {
  @ApiProperty({ type: [MilestoneAggregateDto] })
  @Expose()
  @Type(() => MilestoneAggregateDto)
  milestones!: MilestoneAggregateDto[];
}
