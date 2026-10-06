import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class LogoutDto {
  @ApiPropertyOptional({ description: "This phone's FCM token, to stop its pushes" })
  @IsOptional()
  @IsString()
  @MaxLength(4096)
  deviceToken?: string;
}
