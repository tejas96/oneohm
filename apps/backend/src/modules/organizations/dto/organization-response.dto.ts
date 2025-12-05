import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrganizationStatus } from '@oneohm-epc/shared-types';
import { Exclude, Expose, Type } from 'class-transformer';

/**
 * Organization Response DTO
 * Used for all organization API responses
 */
@Exclude()
export class OrganizationResponseDto {
  @ApiProperty({ description: 'Organization ID' })
  @Expose()
  id!: string;

  @ApiProperty({ description: 'Organization name' })
  @Expose()
  name!: string;

  @ApiProperty({ description: 'Organization code' })
  @Expose()
  code!: string;

  @ApiPropertyOptional({ description: 'Organization email' })
  @Expose()
  email?: string | null;

  @ApiPropertyOptional({ description: 'Organization phone' })
  @Expose()
  phone?: string | null;

  @ApiPropertyOptional({ description: 'Address' })
  @Expose()
  address?: string | null;

  @ApiPropertyOptional({ description: 'City' })
  @Expose()
  city?: string | null;

  @ApiPropertyOptional({ description: 'State' })
  @Expose()
  state?: string | null;

  @ApiProperty({ description: 'Country' })
  @Expose()
  country!: string;

  @ApiPropertyOptional({ description: 'Pincode' })
  @Expose()
  pincode?: string | null;

  @ApiPropertyOptional({ description: 'GSTIN' })
  @Expose()
  gstin?: string | null;

  @ApiPropertyOptional({ description: 'PAN' })
  @Expose()
  pan?: string | null;

  // ==================== Configuration ====================

  @ApiProperty({ description: 'Timezone' })
  @Expose()
  timezone!: string;

  @ApiProperty({ description: 'Currency' })
  @Expose()
  currency!: string;

  @ApiProperty({ description: 'Date format' })
  @Expose()
  dateFormat!: string;

  @ApiProperty({ description: 'Default project timeline in weeks' })
  @Expose()
  defaultProjectTimelineWeeks!: number;

  @ApiProperty({ description: 'Default quote validity in days' })
  @Expose()
  defaultQuoteValidityDays!: number;

  @ApiProperty({ description: 'Maximum quote versions' })
  @Expose()
  maxQuoteVersions!: number;

  // ==================== Status & Subscription ====================

  @ApiProperty({ description: 'Status', enum: OrganizationStatus })
  @Expose()
  status!: OrganizationStatus;

  @ApiPropertyOptional({ description: 'Subscription plan' })
  @Expose()
  subscriptionPlan?: string | null;

  @ApiPropertyOptional({ description: 'Subscription expiry date' })
  @Expose()
  subscriptionExpiresAt?: Date | null;

  // ==================== Audit ====================

  @ApiProperty({ description: 'Created at timestamp' })
  @Expose()
  @Type(() => Date)
  createdAt!: Date;

  @ApiProperty({ description: 'Updated at timestamp' })
  @Expose()
  @Type(() => Date)
  updatedAt!: Date;

  @ApiPropertyOptional({ description: 'Created by user ID' })
  @Expose()
  createdBy?: string | null;

  @ApiPropertyOptional({ description: 'Updated by user ID' })
  @Expose()
  updatedBy?: string | null;
}

/**
 * Alias for backward compatibility
 * @deprecated Use OrganizationResponseDto instead
 */
export class PlatformOrganizationResponseDto extends OrganizationResponseDto {}

/**
 * Organization Creation Response
 * Includes organization, super admin, and invitation details
 */
export class CreateOrganizationResponseDto {
  @ApiProperty({
    description: 'Created organization',
    type: OrganizationResponseDto,
  })
  organization!: OrganizationResponseDto;

  @ApiProperty({
    description: 'Super admin user ID',
  })
  superAdminUserId!: string;

  @ApiProperty({
    description: 'Invitation token',
  })
  invitationToken!: string;

  @ApiProperty({
    description: 'Invitation link (for email)',
  })
  invitationLink!: string;

  @ApiProperty({
    description: 'Default roles created',
    example: ['super_admin', 'admin', 'customer', 'reseller'],
  })
  rolesCreated!: string[];

  @ApiProperty({
    description: 'Invitation sent to email',
  })
  invitationSent!: boolean;
}

/**
 * Paginated organizations list response
 */
export class PaginatedOrganizationsResponseDto {
  @ApiProperty({
    description: 'List of organizations',
    type: [OrganizationResponseDto],
  })
  data!: OrganizationResponseDto[];

  @ApiProperty({ description: 'Total count' })
  total!: number;

  @ApiProperty({ description: 'Current page' })
  page!: number;

  @ApiProperty({ description: 'Page size' })
  limit!: number;

  @ApiProperty({ description: 'Total pages' })
  totalPages!: number;
}

/**
 * Organization with statistics
 */
export class OrganizationWithStatsDto extends OrganizationResponseDto {
  @ApiProperty({ description: 'Total users count' })
  @Expose()
  totalUsers!: number;

  @ApiProperty({ description: 'Total customers count' })
  @Expose()
  totalCustomers!: number;

  @ApiProperty({ description: 'Total resellers count' })
  @Expose()
  totalResellers!: number;

  @ApiProperty({ description: 'Total projects count' })
  @Expose()
  totalProjects!: number;

  @ApiProperty({ description: 'Active projects count' })
  @Expose()
  activeProjects!: number;
}
