import { Repository, DataSource } from 'typeorm';
import type { FindOptionsWhere, DeepPartial, FindManyOptions } from 'typeorm';

import { EntityNotFoundException } from '../exceptions';
import { calculateSkip } from '../helpers/pagination.helper';

/**
 * BaseRepository
 * 
 * Generic repository providing common CRUD operations with consistent error handling.
 * All custom repositories should extend this for standardized behavior.
 * 
 * @example
 * @Injectable()
 * export class UserRepository extends BaseRepository<UserEntity> {
 *   constructor(dataSource: DataSource) {
 *     super(UserEntity, dataSource);
 *   }
 * }
 */
export class BaseRepository<T extends { id: string; deletedAt?: Date | null }> extends Repository<T> {
  protected readonly entityName: string;

  constructor(
    entity: new () => T,
    dataSource: DataSource,
  ) {
    super(entity, dataSource.createEntityManager());
    this.entityName = entity.name;
  }

  /**
   * Find entity by ID or throw EntityNotFoundException
   */
  async findByIdOrFail(id: string, relations?: string[]): Promise<T> {
    const entity = await this.findOne({
      where: { id } as FindOptionsWhere<T>,
      relations,
    });

    if (!entity) {
      throw new EntityNotFoundException(this.entityName, id);
    }

    return entity;
  }

  /**
   * Find one entity by criteria or throw EntityNotFoundException
   */
  async findOneByWhereOrFail(where: FindOptionsWhere<T>, relations?: string[]): Promise<T> {
    const entity = await this.findOne({ where, relations });

    if (!entity) {
      throw new EntityNotFoundException(this.entityName, where);
    }

    return entity;
  }

  /**
   * Find all entities with pagination support
   */
  async findAllPaginated(
    page: number = 1,
    limit: number = 20,
    options?: FindManyOptions<T>,
  ): Promise<{ data: T[]; total: number }> {
    const skip = calculateSkip(page, limit);

    const [data, total] = await this.findAndCount({
      ...options,
      skip,
      take: limit,
    });

    return { data, total };
  }

  /**
   * Create and save a new entity
   */
  async createEntity(data: DeepPartial<T>): Promise<T> {
    const entity = this.create(data);
    return this.save(entity);
  }

  /**
   * Update entity by ID
   */
  async updateEntity(id: string, data: DeepPartial<T>): Promise<T> {
    await this.findByIdOrFail(id); // Ensure entity exists
    await this.update(id, data as DeepPartial<T>);
    return this.findByIdOrFail(id);
  }

  /**
   * Soft delete entity by ID
   */
  async softDeleteEntity(id: string): Promise<void> {
    await this.findByIdOrFail(id); // Ensure entity exists
    await this.softDelete(id);
  }

  /**
   * Hard delete entity by ID
   */
  async hardDeleteEntity(id: string): Promise<void> {
    const result = await this.delete(id);
    if ((result.affected ?? 0) === 0) {
      throw new EntityNotFoundException(this.entityName, id);
    }
  }

  /**
   * Restore soft-deleted entity
   */
  async restoreEntity(id: string): Promise<T> {
    await this.restore(id);
    return this.findByIdOrFail(id);
  }

  /**
   * Check if entity exists by ID
   */
  async existsById(id: string): Promise<boolean> {
    const count = await this.count({
      where: { id } as FindOptionsWhere<T>,
    });
    return count > 0;
  }

  /**
   * Check if entity exists by criteria
   */
  async existsByWhere(where: FindOptionsWhere<T>): Promise<boolean> {
    const count = await this.count({ where });
    return count > 0;
  }

  /**
   * Count entities matching criteria
   */
  async countByWhere(where: FindOptionsWhere<T>): Promise<number> {
    return this.count({ where });
  }

  /**
   * Find entities by multiple IDs
   */
  async findByMultipleIds(ids: string[], relations?: string[]): Promise<T[]> {
    if (ids.length === 0) {
      return [];
    }

    // Use In operator from TypeORM
    return this.find({
      where: ids.map((id) => ({ id } as FindOptionsWhere<T>)) as FindOptionsWhere<T>[],
      relations,
    });
  }
}

