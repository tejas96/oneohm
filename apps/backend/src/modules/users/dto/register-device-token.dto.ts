import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class RegisterDeviceTokenDto {
  @ApiProperty({ description: 'Firebase Cloud Messaging registration token' })
  @IsString()
  @IsNotEmpty()
  token!: string;

  @ApiProperty({ enum: ['android', 'ios'], description: 'Mobile operating system' })
  @IsString()
  @IsIn(['android', 'ios'])
  os!: string;

  @ApiPropertyOptional({ description: 'Device model or OS version from the client' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  deviceModel?: string;
}
