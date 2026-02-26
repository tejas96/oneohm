import { ApiProperty } from '@nestjs/swagger';
import { ProjectVendorStatus } from '@oneohm-epc/shared-types';
import { Expose, Transform, Type } from 'class-transformer';

import { toNum } from '../../../../common/utils';

/**
 * Project Vendor Response DTO
 * Represents project-vendor association data returned from API
 */
export class ProjectVendorResponseDto {
  // ==================== IDs ====================

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @Expose()
  id!: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @Expose()
  projectId!: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @Expose()
  vendorId!: string;

  // ==================== Vendor Role ====================

  @ApiProperty({ example: 'Installation Contractor', required: false })
  @Expose()
  vendorRole?: string;

  // ==================== Contract Details ====================

  @ApiProperty({ example: 250000.0, required: false })
  @Expose()
  @Transform(({ value }) => toNum(value))
  contractValue?: number;

  @ApiProperty({ example: '2024-01-15', required: false })
  @Expose()
  @Type(() => Date)
  contractStartDate?: Date;

  @ApiProperty({ example: '2024-06-15', required: false })
  @Expose()
  @Type(() => Date)
  contractEndDate?: Date;

  // ==================== Status ====================

  @ApiProperty({
    enum: Object.values(ProjectVendorStatus),
    enumName: 'ProjectVendorStatus',
    example: ProjectVendorStatus.ACTIVE,
  })
  @Expose()
  status!: ProjectVendorStatus;

  // ==================== Notes ====================

  @ApiProperty({ example: 'Specialized in residential solar installations', required: false })
  @Expose()
  notes?: string;

  // ==================== Audit ====================

  @ApiProperty({ example: '2024-01-01T00:00:00Z' })
  @Expose()
  @Type(() => Date)
  createdAt!: Date;

  @ApiProperty({ example: '2024-01-01T00:00:00Z' })
  @Expose()
  @Type(() => Date)
  updatedAt!: Date;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', required: false })
  @Expose()
  createdBy?: string;
}
