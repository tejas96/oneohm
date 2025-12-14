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
 * // In service layer
 * return toDto(CustomerPropertyResponseDto, property);
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
 * Convert paginated result to DTO format
 * @param DtoClass The DTO class constructor
 * @param data Object with data array and metadata
 * @returns Object with transformed data array and preserved metadata
 */
export function toDtoPaginated<T, V>(
  DtoClass: ClassConstructor<T>,
  result: { data: V[]; total: number },
): { data: T[]; total: number } {
  return {
    data: toDtoArray(DtoClass, result.data),
    total: result.total,
  };
}

