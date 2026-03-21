import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsPositive } from 'class-validator';

export class InstallationPricingQueryDto {
  @ApiProperty({
    description: 'System size in kW',
    example: 5.5,
    type: Number,
  })
  @Type(() => Number)
  @IsNumber({}, { message: 'System size must be a valid number' })
  @IsPositive({ message: 'System size must be positive' })
  systemSizeKw!: number;
}
