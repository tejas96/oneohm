import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString, Matches } from 'class-validator';

/**
 * Query parameters for the version check endpoint.
 * Validates app type, platform, and semantic version format.
 */
export class VersionCheckQueryDto {
  @ApiProperty({
    description: 'Which app is checking: consumer or business',
    enum: ['consumer', 'business'],
    example: 'business',
  })
  @IsString()
  @IsIn(['consumer', 'business'])
  appType!: 'consumer' | 'business';

  @ApiProperty({
    description: 'Mobile platform',
    enum: ['android', 'ios'],
    example: 'android',
  })
  @IsString()
  @IsIn(['android', 'ios'])
  platform!: 'android' | 'ios';

  @ApiProperty({
    description: 'Current app version in semver format (major.minor.patch)',
    example: '1.8.0',
  })
  @IsString()
  @Matches(/^\d+\.\d+\.\d+$/, {
    message: 'currentVersion must be in semver format (e.g., 1.8.0)',
  })
  currentVersion!: string;
}
