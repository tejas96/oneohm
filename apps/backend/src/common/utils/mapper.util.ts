import { type PaginatedResponse } from '@oneohm-epc/shared/types';
import { ClassConstructor, plainToInstance } from 'class-transformer';

/**
 * Entity to DTO Mapper Utility
 *
 * Provides type-safe conversion from TypeORM entities to DTOs using class-transformer.
 * Respects @Expose() and @Exclude() decorators on DTOs.
 *
 * @example
 * // Single entity
 * const dto = toDto(CustomerResponseDto, entity);
 *
 * // Array of entities
 * const dtos = toDtoArray(CustomerResponseDto, entities);
 *
 * // Paginated response (proper format)
 * return toPaginatedResponse(DtoClass, result.data, result.total, page, limit);
 */

/**
 * Convert a single entity/object to a DTO instance
 * @param DtoClass The DTO class constructor
 * @param entity The entity or plain object to convert
 * @returns Instance of the DTO class with proper transformation applied
 */
export function toDto<T, V>(DtoClass: ClassConstructor<T>, entity: V): T {
  return plainToInstance(DtoClass, entity, {
    excludeExtraneousValues: true, // Only include @Expose() decorated properties
    enableImplicitConversion: true, // Auto-convert types
  });
}

/**
 * Convert an array of entities/objects to DTO instances
 * @param DtoClass The DTO class constructor
 * @param entities Array of entities or plain objects to convert
 * @returns Array of DTO instances
 */
export function toDtoArray<T, V>(DtoClass: ClassConstructor<T>, entities: V[]): T[] {
  return plainToInstance(DtoClass, entities, {
    excludeExtraneousValues: true,
    enableImplicitConversion: true,
  });
}

/**
 * Convert paginated result to proper PaginatedResponse format
 * This is the preferred method for returning paginated data from controllers.
 *
 * @param DtoClass The DTO class constructor
 * @param data Array of entities to transform
 * @param total Total count of items (for pagination meta)
 * @param page Current page number
 * @param limit Items per page
 * @returns PaginatedResponse with data and meta
 *
 * @example
 * // In controller
 * const { data, total } = await this.service.findAll(orgId, page, limit);
 * return toPaginatedResponse(ResponseDto, data, total, page, limit);
 */
export function toPaginatedResponse<T, V>(
  DtoClass: ClassConstructor<T>,
  data: V[],
  total: number,
  page: number,
  limit: number,
): PaginatedResponse<T> {
  return {
    data: toDtoArray(DtoClass, data),
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}
