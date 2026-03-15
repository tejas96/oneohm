import { ApiProperty } from '@nestjs/swagger';
import { SiteSurveyStatus } from '@oneohm-epc/shared/types';
import { IsEnum, IsNotEmpty } from 'class-validator';

/**
 * DTO for updating survey status via dedicated FSM endpoint
 */
export class UpdateSurveyStatusDto {
  @ApiProperty({
    enum: Object.values(SiteSurveyStatus),
    enumName: 'SiteSurveyStatus',
    example: SiteSurveyStatus.IN_PROGRESS,
    description: 'New survey status',
  })
  @IsEnum(SiteSurveyStatus)
  @IsNotEmpty()
  status!: SiteSurveyStatus;
}
