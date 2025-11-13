import { DeepPartial, FindManyOptions, FindOptionsWhere } from 'typeorm';
import { BaseRepository } from './base.repository';
import { createPaginatedResponse } from '../helpers/pagination.helper';
import type { PaginatedResponse } from '@oneohm-epc/shared-types';
import type { ClassConstructor } from 'class-transformer';
import { plainToInstance } from 'class-transformer';

/**
 * BaseService
 * 
 * Generic service providing common business logic operations.
 * All services should extend this for standardized CRUD operations.
 * 
 * @example
 * @Injectable()
 * export class UserService extends BaseService<UserEntity, UserResponseDto> {
 *   constructor(
 *     private readonly userRepository: UserRepository,
 *   ) {
 *     super(userRepository, UserResponseDto);
 *   }
 * }
 */
export abstract class BaseService<
  TEntity extends { id: string; deletedAt?: Date | null },
  TResponseDto,
> {
  constructor(
    protected readonly repository: BaseRepository<TEntity>,
    protected readonly responseDto: ClassConstructor<TResponseDto>,
  ) {}

  /**
   * Transform entity to response DTO
   */
  protected toResponseDto(entity: TEntity): TResponseDto {
    return plainToInstance(this.responseDto, entity, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Transform multiple entities to response DTOs
   */
  protected toResponseDtos(entities: TEntity[]): TResponseDto[] {
    return plainToInstance(this.responseDto, entities, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Find entity by ID
   */
  async findById(id: string, relations?: string[]): Promise<TResponseDto> {
    const entity = await this.repository.findByIdOrFail(id, relations);
    return this.toResponseDto(entity);
  }

  /**
   * Find one entity by criteria
   */
  async findOne(where: FindOptionsWhere<TEntity>, relations?: string[]): Promise<TResponseDto> {
    const entity = await this.repository.findOneByWhereOrFail(where, relations);
    return this.toResponseDto(entity);
  }

  /**
   * Find all entities with pagination
   */
  async findAll(
    page: number = 1,
    limit: number = 20,
    options?: FindManyOptions<TEntity>,
  ): Promise<PaginatedResponse<TResponseDto>> {
    const { data, total } = await this.repository.findAllPaginated(page, limit, options);
    return createPaginatedResponse(data, total, page, limit, this.responseDto);
  }

  /**
   * Create new entity
   */
  async create(data: DeepPartial<TEntity>): Promise<TResponseDto> {
    const entity = await this.repository.createEntity(data);
    return this.toResponseDto(entity);
  }

  /**
   * Update entity
   */
  async update(id: string, data: DeepPartial<TEntity>): Promise<TResponseDto> {
    const entity = await this.repository.updateEntity(id, data);
    return this.toResponseDto(entity);
  }

  /**
   * Delete entity (soft delete)
   */
  async delete(id: string): Promise<void> {
    await this.repository.softDeleteEntity(id);
  }

  /**
   * Hard delete entity (permanent deletion)
   */
  async hardDelete(id: string): Promise<void> {
    await this.repository.hardDeleteEntity(id);
  }

  /**
   * Restore soft-deleted entity
   */
  async restore(id: string): Promise<TResponseDto> {
    const entity = await this.repository.restoreEntity(id);
    return this.toResponseDto(entity);
  }

  /**
   * Check if entity exists
   */
  async exists(id: string): Promise<boolean> {
    return await this.repository.existsById(id);
  }

  /**
   * Count entities
   */
  async count(where?: FindOptionsWhere<TEntity>): Promise<number> {
    if (where) {
      return await this.repository.countByWhere(where);
    }
    return await this.repository.count();
  }
}

