import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

import type { ReturnRequestStatus } from '../../entities/return-request.entity';

export class ReturnRequestResponseDto {
  @Expose()
  @ApiProperty()
  id!: string;

  @Expose()
  @ApiProperty()
  organizationId!: string;

  @Expose()
  @ApiProperty()
  allocationId!: string;

  @Expose()
  @ApiProperty()
  bomId!: string;

  @Expose()
  @ApiProperty()
  quantity!: number;

  @Expose()
  @ApiProperty()
  reason!: string;

  @Expose()
  @ApiProperty({ enum: ['pending', 'completed', 'cancelled'] })
  status!: ReturnRequestStatus;

  @Expose()
  @ApiProperty({ nullable: true })
  completedAt?: Date;

  @Expose()
  @ApiProperty({ nullable: true })
  completedBy?: string;

  @Expose()
  @ApiProperty()
  createdBy!: string;

  @Expose()
  @ApiProperty()
  createdAt!: Date;

  @Expose()
  @ApiProperty()
  updatedAt!: Date;
}
