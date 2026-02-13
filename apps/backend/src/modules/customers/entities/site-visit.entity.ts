import {
  SiteVisitStatus,
  type FileAttachment,
  type GpsCoordinates,
  type ShadingAnalysis,
} from '@oneohm-epc/shared-types';
import { Column, DeleteDateColumn, Entity, Index, JoinColumn, ManyToOne, OneToOne } from 'typeorm';

import { CustomerPropertyEntity } from './customer-property.entity';
import { BaseEntity } from '../../../common/entities/base.entity';
import { UserEntity } from '../../users/entities/user.entity';

/**
 * Site Visit Entity
 * Represents a field worker's site visit for lead qualification
 * One-to-one relationship with CustomerPropertyEntity
 */
@Entity('site_visits')
@Index(['customerPropertyId'], { unique: true, where: '"deleted_at" IS NULL' })
@Index(['visitNumber'], { unique: true, where: '"deleted_at" IS NULL' })
@Index(['status'], { where: '"deleted_at" IS NULL' })
export class SiteVisitEntity extends BaseEntity {
  // ==================== RELATIONSHIP ====================
  @Column({ name: 'customer_property_id', type: 'uuid' })
  customerPropertyId!: string;

  @OneToOne(() => CustomerPropertyEntity, (property) => property.siteVisit, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'customer_property_id' })
  customerProperty?: CustomerPropertyEntity;

  // ==================== VISIT INFO ====================
  @Column({ name: 'visit_number', type: 'varchar', length: 50 })
  visitNumber!: string;

  @Column({ type: 'varchar', length: 20, default: SiteVisitStatus.PENDING })
  status!: SiteVisitStatus;

  // ==================== GPS ====================
  @Column({ name: 'gps_coordinates', type: 'jsonb', nullable: true })
  gpsCoordinates?: GpsCoordinates;

  // ==================== SITE ASSESSMENT ====================
  @Column({
    name: 'available_roof_area_sqft',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  availableRoofAreaSqft?: number;

  @Column({ name: 'shading_analysis', type: 'jsonb', nullable: true })
  shadingAnalysis?: ShadingAnalysis;

  // ==================== PHOTOS & NOTES ====================
  @Column({ type: 'jsonb', nullable: true })
  photos?: FileAttachment[];

  @Column({ name: 'visit_notes', type: 'text', nullable: true })
  visitNotes?: string;

  // ==================== AUDIT FIELDS ====================
  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt?: Date;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy?: string;

  @ManyToOne(() => UserEntity, { createForeignKeyConstraints: false })
  @JoinColumn({ name: 'created_by' })
  creator?: UserEntity;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy?: string;

  @ManyToOne(() => UserEntity, { createForeignKeyConstraints: false })
  @JoinColumn({ name: 'updated_by' })
  updater?: UserEntity;
}
