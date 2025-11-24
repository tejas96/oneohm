import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrganizationStatus } from '@oneohm-epc/shared-types';
import { Expose } from 'class-transformer';

/**
 * Organization Response DTO for Platform Admin
 */
export class PlatformOrganizationResponseDto {
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

  @ApiProperty({ description: 'Status', enum: OrganizationStatus })
  @Expose()
  status!: OrganizationStatus;

  @ApiPropertyOptional({ description: 'Subscription plan' })
  @Expose()
  subscriptionPlan?: string | null;

  @ApiPropertyOptional({ description: 'Subscription expiry date' })
  @Expose()
  subscriptionExpiresAt?: Date | null;

  @ApiProperty({ description: 'Created at' })
  @Expose()
  createdAt!: Date;

  @ApiProperty({ description: 'Updated at' })
  @Expose()
  updatedAt!: Date;
}

/**
 * Organization Creation Response
 * Includes organization, super admin, and invitation details
 */
export class CreateOrganizationResponseDto {
  @ApiProperty({
    description: 'Created organization',
    type: PlatformOrganizationResponseDto,
  })
  organization!: PlatformOrganizationResponseDto;

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
    type: [PlatformOrganizationResponseDto],
  })
  data!: PlatformOrganizationResponseDto[];

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
export class OrganizationWithStatsDto extends PlatformOrganizationResponseDto {
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
