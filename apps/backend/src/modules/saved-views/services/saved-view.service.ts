import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';

import { type CreateSavedViewDto, type UpdateSavedViewDto } from '../dto';
import { SavedViewEntity } from '../entities/saved-view.entity';
import { SavedViewRepository } from '../repositories/saved-view.repository';
import { validateSavedViewFilters } from '../types/saved-view-filter-schemas';
import { type SavedViewResource } from '../types/saved-view-resource';

/**
 * SavedViewService — business rules for per-user saved list filters.
 *
 * Invariants enforced here (NOT at the controller):
 *   1. Every read is scoped by both organizationId AND userId.
 *      Even an admin cannot see another user's saved views.
 *   2. Maximum 25 saved views per (org, user, resource) — 409 over the
 *      cap. The cap is small on purpose: a saved-views chip strip with
 *      hundreds of entries is unusable.
 *   3. Names are unique per (org, user, resource) — the DB unique index
 *      is the source of truth; we additionally pre-check to return a
 *      friendly 409 instead of a raw constraint violation.
 *   4. Filter payloads are validated against a per-resource allow-list
 *      (see saved-view-filter-schemas). Unknown keys raise 400 BadRequest
 *      so we never silently store fields the list APIs cannot apply.
 *   5. We strip null/undefined/'' filter values during validation so
 *      saved views stay tidy; replaying a saved view always produces the
 *      same query string.
 */
@Injectable()
export class SavedViewService {
  private readonly logger = new Logger(SavedViewService.name);
  private static readonly MAX_VIEWS_PER_TRIPLET = 25;

  constructor(private readonly repository: SavedViewRepository) {}

  async list(
    userId: string,
    resource: SavedViewResource,
  ): Promise<SavedViewEntity[]> {
    return this.repository.findForUser(userId, resource);
  }

  async findOne(id: string, userId: string): Promise<SavedViewEntity> {
    const view = await this.repository.findOneScoped(id, userId);
    if (!view) {
      throw new NotFoundException(`Saved view ${id} not found`);
    }
    return view;
  }

  async create(
    dto: CreateSavedViewDto,
    userId: string,
  ): Promise<SavedViewEntity> {
    const cleanedFilters = validateSavedViewFilters(dto.resource, dto.filters);
    const trimmedName = dto.name.trim();
    if (trimmedName.length === 0) {
      throw new ConflictException('Saved view name cannot be empty');
    }

    const existingByName = await this.repository.findByName(
      userId,
      dto.resource,
      trimmedName,
    );
    if (existingByName) {
      throw new ConflictException(
        `A saved view named "${trimmedName}" already exists for this list`,
      );
    }

    const count = await this.repository.countForUser(userId, dto.resource);
    if (count >= SavedViewService.MAX_VIEWS_PER_TRIPLET) {
      throw new ConflictException(
        `Cannot create more than ${SavedViewService.MAX_VIEWS_PER_TRIPLET} saved views per list. Delete an existing view first.`,
      );
    }

    return this.repository.create({
      userId,
      resource: dto.resource,
      name: trimmedName,
      filters: cleanedFilters,
    });
  }

  async update(
    id: string,
    dto: UpdateSavedViewDto,
    userId: string,
  ): Promise<SavedViewEntity> {
    const view = await this.findOne(id, userId);

    if (dto.name !== undefined) {
      const trimmed = dto.name.trim();
      if (trimmed.length === 0) {
        throw new ConflictException('Saved view name cannot be empty');
      }
      if (trimmed !== view.name) {
        const existing = await this.repository.findByName(
          userId,
          view.resource,
          trimmed,
        );
        if (existing && existing.id !== id) {
          throw new ConflictException(
            `A saved view named "${trimmed}" already exists for this list`,
          );
        }
        view.name = trimmed;
      }
    }

    if (dto.filters !== undefined) {
      view.filters = validateSavedViewFilters(view.resource, dto.filters);
    }

    return this.repository.save(view);
  }

  async delete(id: string, userId: string): Promise<void> {
    const deleted = await this.repository.deleteScoped(id, userId);
    if (!deleted) {
      throw new NotFoundException(`Saved view ${id} not found`);
    }
  }
}
