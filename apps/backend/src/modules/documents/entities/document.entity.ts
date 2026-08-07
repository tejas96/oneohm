import { DocumentCategory, DocumentEntityType } from '@tejas96/shared/types';
import { Column, DeleteDateColumn, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';

import { BaseEntity } from '../../../common/entities/base.entity';
import { CustomerPropertyEntity } from '../../customers/entities/customer-property.entity';
import { UserEntity } from '../../users/entities/user.entity';

@Entity('documents')
@Index(['deletedAt'])
@Index(['entityType', 'entityId', 'deletedAt'])
@Index(['tag', 'deletedAt'])
@Index(['propertyId', 'deletedAt'])
export class DocumentEntity extends BaseEntity {


  @ManyToOne(() => CustomerPropertyEntity, { createForeignKeyConstraints: false })
  @JoinColumn({ name: 'property_id' })
  property?: CustomerPropertyEntity;

  @Column({ name: 'property_id', type: 'uuid' })
  propertyId!: string;

  @Column({ name: 'entity_type', type: 'varchar', length: 50 })
  entityType!: DocumentEntityType;

  @Column({ name: 'entity_id', type: 'uuid' })
  entityId!: string;

  @Column({ type: 'varchar', length: 50 })
  category!: DocumentCategory;

  @Column({ type: 'varchar', length: 100 })
  tag!: string;

  @Column({ name: 'file_name', type: 'varchar', length: 255 })
  fileName!: string;

  @Column({ name: 'file_url', type: 'text' })
  fileUrl!: string;

  @Column({ name: 'file_size_bytes', type: 'bigint', nullable: true })
  fileSizeBytes?: number;

  @Column({ name: 'mime_type', type: 'varchar', length: 100, nullable: true })
  mimeType?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown>;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz' })
  deletedAt?: Date;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy?: string;

  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  uploadedByUser?: UserEntity;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy?: string;
}
