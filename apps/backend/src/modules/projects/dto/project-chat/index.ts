import { ApiProperty } from '@nestjs/swagger';
import { Expose, Transform, Type } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class SendChatMessageDto {
  @ApiProperty({ description: 'Message text content', example: 'Hello team!' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  messageText!: string;
}

class ChatSenderDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @Expose()
  id!: string;

  @ApiProperty({ example: 'Vikram' })
  @Expose()
  firstName!: string;

  @ApiProperty({ example: 'Singh' })
  @Expose()
  lastName?: string;

  @ApiProperty({ example: 'customer' })
  @Expose()
  @Transform(({ obj }) => {
    return obj.roles?.includes('customer') ? 'customer' : 'team';
  })
  roleType?: string;
}

export class ProjectChatMessageResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @Expose()
  id!: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @Expose()
  projectId!: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @Expose()
  senderId!: string;

  @ApiProperty({ example: 'Hello team!' })
  @Expose()
  messageText!: string;

  @ApiProperty({ type: ChatSenderDto })
  @Expose()
  @Type(() => ChatSenderDto)
  sender!: ChatSenderDto;

  @ApiProperty({ example: '2024-01-01T00:00:00Z' })
  @Expose()
  createdAt!: Date;
}
