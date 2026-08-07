import { FeedbackMethod, NPSCategory } from '@tejas96/shared/types';
import { Column, DeleteDateColumn, Entity, JoinColumn, ManyToOne } from 'typeorm';

import { BaseEntity } from '../../../common/entities/base.entity';
import { CustomerProfileEntity } from '../../customers/entities/customer-profile.entity';
import { ProjectEntity } from '../../projects/entities/project.entity';
import { UserEntity } from '../../users/entities/user.entity';

/**
 * Customer Feedback Entity
 * Schema: Lines 1730-1774
 */
@Entity('customer_feedback')
export class CustomerFeedbackEntity extends BaseEntity {
  // ============================================
  // RELATIONS
  // ============================================



  @ManyToOne(() => ProjectEntity)
  @JoinColumn({ name: 'project_id' })
  project: ProjectEntity;

  @Column({ name: 'project_id', type: 'uuid' })
  projectId: string;

  @ManyToOne(() => CustomerProfileEntity)
  @JoinColumn({ name: 'customer_id' })
  customer: CustomerProfileEntity;

  @Column({ name: 'customer_id', type: 'uuid' })
  customerId: string;

  // ============================================
  // RATING FIELDS
  // ============================================

  @Column({ name: 'overall_rating', type: 'integer', nullable: true })
  overallRating: number | null;

  @Column({ name: 'nps_score', type: 'integer', nullable: true })
  npsScore: number | null;

  @Column({ name: 'nps_category', type: 'varchar', length: 20, nullable: true })
  npsCategory: NPSCategory | null;

  // ============================================
  // DEPARTMENT RATINGS (JSONB)
  // ============================================

  /**
   * Department Ratings (JSONB)
   * Example: {
   *   "sales": 5,
   *   "installation": 4,
   *   "service": 5,
   *   "documentation": 3
   * }
   */
  @Column({ name: 'department_ratings', type: 'jsonb', default: '{}' })
  departmentRatings: Record<string, number>;

  // ============================================
  // FEEDBACK CONTENT
  // ============================================

  @Column({ name: 'general_comments', type: 'text', nullable: true })
  generalComments: string | null;

  @Column({ name: 'improvement_suggestions', type: 'text', nullable: true })
  improvementSuggestions: string | null;

  // ============================================
  // RECOMMENDATION
  // ============================================

  @Column({ name: 'would_recommend', type: 'boolean', nullable: true })
  wouldRecommend: boolean | null;

  // ============================================
  // FEEDBACK METHOD
  // ============================================

  @Column({ name: 'feedback_method', type: 'varchar', length: 50, nullable: true })
  feedbackMethod: FeedbackMethod | null;

  // ============================================
  // PUBLISHING
  // ============================================

  @Column({ name: 'is_published', type: 'boolean', default: false })
  isPublished: boolean;

  // ============================================
  // COMPANY RESPONSE
  // ============================================

  @Column({ name: 'company_response', type: 'text', nullable: true })
  companyResponse: string | null;

  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'responded_by' })
  respondedByUser: UserEntity;

  @Column({ name: 'responded_by', type: 'uuid', nullable: true })
  respondedBy: string | null;

  @Column({ name: 'responded_at', type: 'timestamptz', nullable: true })
  respondedAt: Date | null;

  // ============================================
  // SOFT DELETE
  // ============================================

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz' })
  deletedAt: Date | null;

  // ============================================
  // AUDIT
  // ============================================

  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  createdByUser: UserEntity;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string | null;

  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'updated_by' })
  updatedByUser: UserEntity;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy: string | null;
}
