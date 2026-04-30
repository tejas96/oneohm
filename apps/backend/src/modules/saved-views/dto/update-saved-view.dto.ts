import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateSavedViewDto {
  @ApiPropertyOptional({ minLength: 1, maxLength: 100 })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: true,
    description: 'New filter values; replaces the existing filters object entirely when provided',
  })
  @IsOptional()
  @IsObject()
  filters?: Record<string, unknown>;
}
