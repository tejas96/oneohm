import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty } from 'class-validator';

export class ToggleActiveLookupDto {
  @ApiProperty({ example: true, description: 'New active state for the lookup' })
  @IsBoolean()
  @IsNotEmpty()
  isActive!: boolean;
}
