import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { DocumentResponseDto } from '../../documents/dto/document-response.dto';

export class MissingFieldDto {
  @ApiProperty()
  key!: string;

  @ApiProperty()
  label!: string;
}

export class ReportCompletenessItemDto {
  @ApiProperty()
  reportId!: string;

  @ApiProperty()
  reportName!: string;

  @ApiProperty()
  totalRequired!: number;

  @ApiProperty()
  filledRequired!: number;

  @ApiProperty()
  missingRequired!: number;

  @ApiProperty({ type: [MissingFieldDto] })
  missingFields!: MissingFieldDto[];

  @ApiProperty()
  isComplete!: boolean;

  @ApiProperty()
  isSaved!: boolean;

  @ApiPropertyOptional()
  savedDocumentId?: string;
}

export class ReportsPendingSummaryDto {
  @ApiProperty()
  totalReports!: number;

  @ApiProperty()
  savedReports!: number;

  @ApiProperty()
  incompleteReports!: number;

  @ApiProperty()
  unsavedReports!: number;

  @ApiProperty()
  pendingCount!: number;

  @ApiProperty({ type: [ReportCompletenessItemDto] })
  reports!: ReportCompletenessItemDto[];

  @ApiProperty({ type: [DocumentResponseDto] })
  saved!: DocumentResponseDto[];
}
