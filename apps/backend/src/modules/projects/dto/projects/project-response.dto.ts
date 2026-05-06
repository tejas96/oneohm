import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ProjectPriority,
  ProjectStatus,
  type ProjectMetadata,
  type QuoteSnapshot,
  type TaskStatusConfig,
} from '@oneohm-epc/shared/types';
import { Expose, Transform, Type } from 'class-transformer';

import { toNum } from '../../../../common/utils';
import { CustomerPropertyResponseDto } from '../../../customers/dto/customer-property-response.dto';
import { MaterialResponseDto } from '../materials/material-response.dto';

const latestQuoteVersion = (obj: Record<string, unknown>) =>
  (obj.quote as { versions?: Array<Record<string, unknown>> } | undefined)?.versions?.[0];

function getSnapshot(obj: Record<string, unknown>): QuoteSnapshot | undefined {
  return latestQuoteVersion(obj)?.quoteSnapshot as QuoteSnapshot | undefined;
}

/**
 * Project Response DTO
 *
 * Fields systemSizeKw, projectType, estimatedCost, quoteNumber are derived
 * from the joined quote relation via @Transform.
 * actualCost is derived from metadata.actualCost.
 */
export class ProjectResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @Expose()
  id!: string;

  @ApiProperty({ description: 'Property ID (customer/org/address derived from property)' })
  @Expose()
  propertyId!: string;

  @ApiProperty({ type: () => CustomerPropertyResponseDto })
  @Expose()
  @Type(() => CustomerPropertyResponseDto)
  property!: CustomerPropertyResponseDto;

  @ApiProperty({ description: 'FK to the source quote' })
  @Expose()
  quoteId!: string;

  @ApiProperty({ example: 'Q-ONEOHM-2025-0001', description: 'Derived from quote relation' })
  @Expose()
  @Transform(({ obj }) => obj.quote?.quoteNumber)
  quoteNumber?: string;

  @ApiProperty()
  @Expose()
  createdBy!: string;

  @ApiPropertyOptional()
  @Expose()
  updatedBy?: string;

  @ApiProperty({ example: 'PRJ-ONEOHM-2025-0001' })
  @Expose()
  projectNumber!: string;

  @ApiProperty({ example: 'Solar Installation - Smith Residence' })
  @Expose()
  name!: string;

  @ApiPropertyOptional({ example: '5kW rooftop solar installation' })
  @Expose()
  description?: string;

  @ApiProperty({ example: 5.5, description: 'Derived from latest quote version' })
  @Expose()
  @Transform(({ obj }) => toNum(latestQuoteVersion(obj)?.systemSizeKw))
  systemSizeKw!: number;

  @ApiPropertyOptional({
    example: 5.52,
    description: 'Actual system size from quote snapshot calculation',
  })
  @Expose()
  @Transform(({ obj }) => {
    const snapshot = latestQuoteVersion(obj)?.quoteSnapshot as QuoteSnapshot | undefined;
    const val = toNum(snapshot?.calculation?.actualSystemSizeKw);
    return val != null && val > 0 ? val : undefined;
  })
  actualSystemSizeKw?: number;

  @ApiProperty({ example: 'residential', description: 'Derived from latest quote version' })
  @Expose()
  @Transform(({ obj }) => latestQuoteVersion(obj)?.projectType)
  projectType!: string;

  @ApiProperty({ enum: Object.values(ProjectStatus), example: ProjectStatus.IN_PROGRESS })
  @Expose()
  status!: ProjectStatus;

  @ApiProperty({ enum: Object.values(ProjectPriority), example: ProjectPriority.NORMAL })
  @Expose()
  priority!: ProjectPriority;

  @ApiProperty({ example: 45 })
  @Expose()
  progressPercentage!: number;

  @ApiPropertyOptional({ example: '2025-02-01' })
  @Expose()
  startDate?: Date;

  @ApiPropertyOptional({ example: '2025-03-15' })
  @Expose()
  endDate?: Date;

  @ApiPropertyOptional({ example: 350000, description: 'Derived from latest quote version' })
  @Expose()
  @Transform(({ obj }) => toNum(latestQuoteVersion(obj)?.finalPrice) ?? null)
  estimatedCost?: number;

  @ApiPropertyOptional({ example: 325000, description: 'Derived from metadata.actualCost' })
  @Expose()
  @Transform(({ obj }) => toNum(obj.metadata?.actualCost) ?? null)
  actualCost?: number;

  // ==================== Derived Spec Fields (from quote snapshot) ====================

  @ApiPropertyOptional({
    description: 'Panel configurations from quote snapshot (supports DCR + Non-DCR split)',
  })
  @Expose()
  @Transform(({ obj }) => {
    const panels = getSnapshot(obj)?.calculation?.panels;
    if (!panels?.length) return undefined;
    return panels.map((p) => ({
      name: p.name,
      brand: p.brand,
      isDcr: p.isDcr,
      wattagePerPanel: p.wattagePerPanel,
      quantity: p.quantity,
      technology: p.technology ?? undefined,
      productWarrantyYears: p.productWarrantyYears ?? undefined,
      performanceWarrantyYears: p.performanceWarrantyYears ?? undefined,
    }));
  })
  panelConfigs?: Array<{
    name: string;
    brand: string;
    isDcr: boolean;
    wattagePerPanel: number;
    quantity: number;
    technology?: string;
    productWarrantyYears?: number;
    performanceWarrantyYears?: number;
  }>;

  @ApiPropertyOptional({ description: 'Total panel count across all configs' })
  @Expose()
  @Transform(({ obj }) => {
    const panels = getSnapshot(obj)?.calculation?.panels;
    if (!panels?.length) return undefined;
    return panels.reduce((sum, p) => sum + (p.quantity ?? 0), 0);
  })
  panelCount?: number;

  @ApiPropertyOptional({ description: 'Inverter configurations from quote snapshot' })
  @Expose()
  @Transform(({ obj }) => {
    const inverters = getSnapshot(obj)?.calculation?.inverters?.inverters;
    if (!inverters?.length) return undefined;
    return inverters.map((i) => ({
      name: i.name,
      brand: i.brand,
      capacityKw: i.capacityKw,
      quantity: i.quantity,
      productWarrantyYears: i.productWarrantyYears ?? undefined,
    }));
  })
  inverterConfigs?: Array<{
    name: string;
    brand: string;
    capacityKw: number;
    quantity: number;
    productWarrantyYears?: number;
  }>;

  @ApiPropertyOptional({ description: 'Total inverter count across all configs' })
  @Expose()
  @Transform(({ obj }) => {
    const inverters = getSnapshot(obj)?.calculation?.inverters?.inverters;
    if (!inverters?.length) return undefined;
    return inverters.reduce((sum, i) => sum + (i.quantity ?? 0), 0);
  })
  inverterCount?: number;

  @ApiPropertyOptional({ description: 'Structure / mounting type from quote snapshot' })
  @Expose()
  @Transform(({ obj }) => {
    const structure = getSnapshot(obj)?.calculation?.structure;
    return structure?.structureType ?? structure?.name ?? undefined;
  })
  structureType?: string;

  @ApiPropertyOptional({ description: 'Phase type from quote snapshot inputs' })
  @Expose()
  @Transform(({ obj }) => getSnapshot(obj)?.inputs?.phaseType ?? undefined)
  phaseType?: string;

  // ==================== Metadata ====================

  @ApiPropertyOptional({ example: { tags: ['priority', 'referral'] } })
  @Expose()
  @Transform(({ key, obj }) => (obj as Record<string, unknown>)[key])
  metadata?: ProjectMetadata;

  @ApiPropertyOptional({ description: 'Configured task statuses for this project' })
  @Expose()
  taskStatuses?: TaskStatusConfig[];

  // ==================== Related Entities ====================

  @ApiPropertyOptional({ type: [MaterialResponseDto] })
  @Expose()
  @Type(() => MaterialResponseDto)
  materials?: MaterialResponseDto[];

  // ==================== Timestamps ====================
  @ApiProperty({ example: '2025-01-15T10:30:00Z' })
  @Expose()
  createdAt!: Date;

  @ApiProperty({ example: '2025-02-15T14:20:00Z' })
  @Expose()
  updatedAt!: Date;

  @ApiPropertyOptional({ example: null })
  @Expose()
  deletedAt?: Date;
}
