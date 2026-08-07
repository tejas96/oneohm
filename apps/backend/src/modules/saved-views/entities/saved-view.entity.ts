import { Column, Entity, Index, Unique } from 'typeorm';

import { BaseEntity } from '../../../common/entities/base.entity';
import { type SavedViewResource } from '../types/saved-view-resource';

/**
 * SavedView entity — per-user saved filter set for a list view.
 *
 * Scoping: every saved view belongs to (organization, user, resource).
 * `(user_id, resource, name)` is unique so the same user
 * cannot have two views with the same name on the same list.
 *
 * `resource` is intentionally a VARCHAR with a CHECK constraint enforced
 * at the migration level (no Postgres ENUM), matching the project's
 * notification + numbering-sequences conventions.
 *
 * `filters` is a JSONB blob validated against a per-resource allow-list
 * before insertion (see validateSavedViewFilters). Unknown keys are
 * rejected at the API boundary so we never trust what's already in the DB.
 */
@Entity('saved_views')
@Index(['userId', 'resource'])
@Unique(['userId', 'resource', 'name'])
export class SavedViewEntity extends BaseEntity {

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ type: 'varchar', length: 50 })
  resource!: SavedViewResource;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  filters!: Record<string, unknown>;
}
