import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class NotificationResponseDto {
  @ApiProperty() @Expose() id!: string;
  @ApiProperty() @Expose() organizationId!: string;
  @ApiProperty() @Expose() userId!: string;
  @ApiProperty() @Expose() type!: string;
  @ApiProperty() @Expose() title!: string;
  @ApiProperty({ required: false }) @Expose() body?: string;
  @ApiProperty() @Expose() severity!: string;
  @ApiProperty({ required: false }) @Expose() link?: string;
  @ApiProperty({ required: false }) @Expose() metadata?: Record<string, unknown>;
  @ApiProperty({ required: false }) @Expose() readAt?: Date;
  @ApiProperty() @Expose() createdAt!: Date;
}
