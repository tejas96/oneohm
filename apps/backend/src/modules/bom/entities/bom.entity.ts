import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';

import { BomItemEntity } from './bom-item.entity';
import { BaseEntity } from '../../../common/entities/base.entity';
import { ProjectEntity } from '../../projects/entities/project.entity';
import { UserEntity } from '../../users/entities/user.entity';

/**
 * Bill of Materials (BOM) Entity
 *
 * One BOM per project.
 */
@Entity('bom')
@Index(['projectId'], { unique: true })
export class BomEntity extends BaseEntity {
  // ==================== Identity ====================
  @Column({ name: 'bom_number', type: 'varchar', length: 50, unique: true })
  bomNumber!: string;

  // ==================== Project ====================

  /**
   * One BOM per project. Replaces the (entity_type, entity_id) polymorphic
   * reference, which only ever held 'project' and 'quote_version' and carried
   * no foreign key in either direction.
   *
   * ON DELETE RESTRICT because stock_allocations.bom_id restricts too — a BOM
   * with reserved stock must be released deliberately, not cascaded away.
   */
  @Column({ name: 'project_id', type: 'uuid' })
  projectId!: string;

  @ManyToOne(() => ProjectEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'project_id' })
  project?: ProjectEntity;

  /**
   * The quote version this BOM was seeded from — what "originally quoted"
   * means for this project. Mirrors projects.contract_quote_version_id, whose
   * own comment records the bug this prevents: readers taking the LATEST quote
   * version silently re-priced a signed deal.
   */
  @Column({ name: 'baseline_quote_version_id', type: 'uuid', nullable: true })
  baselineQuoteVersionId?: string | null;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  // ==================== Line Items ====================
  @OneToMany(() => BomItemEntity, (item) => item.bom, { cascade: true, eager: false })
  items!: BomItemEntity[];

  // ==================== Audit ====================
  @Column({ name: 'created_by', type: 'uuid' })
  createdBy!: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'created_by' })
  creator!: UserEntity;
}
