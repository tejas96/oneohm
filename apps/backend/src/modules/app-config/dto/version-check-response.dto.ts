import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

/**
 * Response DTO for the version check endpoint.
 * Tells the mobile app whether it needs to update and provides store URLs.
 */
export class VersionCheckResponseDto {
  @ApiProperty({
    description: 'Whether an update is required, recommended, or not needed',
    enum: ['force', 'recommended', 'none'],
    example: 'none',
  })
  @Expose()
  updateStatus!: 'force' | 'recommended' | 'none';

  @ApiProperty({
    description: 'Minimum required version (app is blocked below this)',
    example: '1.8.0',
  })
  @Expose()
  minVersion!: string;

  @ApiProperty({
    description: 'Recommended version (optional update prompt below this)',
    example: '1.8.1',
  })
  @Expose()
  recommendedVersion!: string;

  @ApiProperty({
    description: 'Platform-specific store URL for the update button',
    example: 'https://play.google.com/store/apps/details?id=com.oneohm.epc',
  })
  @Expose()
  storeUrl!: string;

  @ApiProperty({
    description: 'Whether the app is in maintenance mode',
    example: false,
  })
  @Expose()
  maintenanceMode!: boolean;

  @ApiProperty({
    description: 'Maintenance message to display (null when not in maintenance)',
    example: null,
    nullable: true,
  })
  @Expose()
  maintenanceMessage!: string | null;
}
