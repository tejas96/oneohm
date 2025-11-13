import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

/**
 * BaseResponseDto
 *
 * Base DTO for all entity responses containing common audit fields.
 * All response DTOs should extend this to ensure consistency.
 *
 * @example
 * export class UserResponseDto extends BaseResponseDto {
 *   @Expose()
 *   @ApiProperty()
 *   email: string;
 * }
 */
export class BaseResponseDto {
  @Expose()
  @ApiProperty({
    description: 'Entity UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id!: string;

  @Expose()
  @ApiProperty({
    description: 'Created timestamp',
    example: '2023-11-15T10:30:00.000Z',
    type: String,
  })
  createdAt!: Date;

  @Expose()
  @ApiProperty({
    description: 'Last updated timestamp',
    example: '2023-11-15T10:30:00.000Z',
    type: String,
  })
  updatedAt!: Date;

  @Expose()
  @ApiPropertyOptional({
    description: 'Soft delete timestamp (null if active)',
    example: null,
    type: String,
    nullable: true,
  })
  deletedAt?: Date | null;
}

/**
 * BaseAuditResponseDto
 *
 * Extended base DTO including user audit fields (createdBy, updatedBy).
 * Use this for entities that track which user performed actions.
 */
export class BaseAuditResponseDto extends BaseResponseDto {
  @Expose()
  @ApiPropertyOptional({
    description: 'UUID of user who created this entity',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  createdBy?: string;

  @Expose()
  @ApiPropertyOptional({
    description: 'UUID of user who last updated this entity',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  updatedBy?: string;
}

/**
 * BaseOrganizationResponseDto
 *
 * Extended base DTO including organization scoping.
 * Use this for multi-tenant entities that belong to an organization.
 */
export class BaseOrganizationResponseDto extends BaseAuditResponseDto {
  @Expose()
  @ApiProperty({
    description: 'Organization UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  organizationId!: string;
}
