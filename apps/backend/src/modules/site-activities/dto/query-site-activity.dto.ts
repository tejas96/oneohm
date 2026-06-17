import { ApiPropertyOptional } from '@nestjs/swagger';
import { SiteActivityStatus } from '@tejas96/shared/types';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class QuerySiteActivityDto {
  @ApiPropertyOptional({ enum: SiteActivityStatus })
  @IsEnum(SiteActivityStatus)
  @IsOptional()
  overallStatus?: SiteActivityStatus;

  @ApiPropertyOptional({ description: 'Filter by property ID' })
  @IsUUID()
  @IsOptional()
  propertyId?: string;

  @ApiPropertyOptional({ description: 'Filter by isSiteVisitDone' })
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  isSiteVisitDone?: boolean;

  @ApiPropertyOptional({ description: 'Filter by isSiteSurveyDone' })
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  isSiteSurveyDone?: boolean;

  @ApiPropertyOptional({ description: 'Filter by creator: "me" for current user' })
  @IsString()
  @IsOptional()
  createdBy?: string;

  @ApiPropertyOptional({ description: 'Filter by date: "today" or ISO date string' })
  @IsString()
  @IsOptional()
  date?: string;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsInt()
  @Min(1)
  @IsOptional()
  @Transform(({ value }) => (value ? parseInt(value, 10) : undefined))
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  @IsInt()
  @Min(1)
  @IsOptional()
  @Transform(({ value }) => (value ? parseInt(value, 10) : undefined))
  limit?: number;
}
