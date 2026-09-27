import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayMinSize, ArrayUnique, IsArray, IsUUID } from 'class-validator';

import { MAX_PRINT_DOCUMENTS } from '../services/document-print.service';

export class PrintDocumentsDto {
  @ApiProperty({
    description: 'Documents to print, in print order',
    type: [String],
    maxItems: MAX_PRINT_DOCUMENTS,
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_PRINT_DOCUMENTS)
  @ArrayUnique()
  @IsUUID('4', { each: true })
  ids!: string[];
}
