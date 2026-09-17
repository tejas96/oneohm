import { ApiPropertyOptional } from '@nestjs/swagger';
import { type MaintenanceChecklistAnswer } from '@tejas96/shared/types';
import { IsObject, IsOptional } from 'class-validator';

/**
 * A partial checklist. `items` merges by key; each reading present replaces the
 * stored one (send `null` to clear it). The service checks keys and values,
 * because class-validator cannot describe a keyed map.
 */
export class UpdateMaintenanceChecklistDto {
  @ApiPropertyOptional({
    example: {
      'panels.cleaned': { result: 'ok' },
      'dc.cables': { result: 'issue', note: 'Rat bite' },
    },
  })
  @IsOptional()
  @IsObject()
  items?: Record<string, MaintenanceChecklistAnswer>;

  @ApiPropertyOptional({ example: { generationKwh: 4210.5, netMeterReading: 1033 } })
  @IsOptional()
  @IsObject()
  readings?: { generationKwh?: number | null; netMeterReading?: number | null };
}
