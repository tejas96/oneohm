import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ServiceTicketStatus } from '@tejas96/shared/types';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateTicketStatusDto {
  @ApiProperty({ enum: ServiceTicketStatus })
  @IsEnum(ServiceTicketStatus)
  status: ServiceTicketStatus;

  @ApiPropertyOptional({
    description:
      'Free-text note recorded against the transition. Required when moving to resolved.',
  })
  @IsOptional()
  @IsString()
  note?: string;
}
