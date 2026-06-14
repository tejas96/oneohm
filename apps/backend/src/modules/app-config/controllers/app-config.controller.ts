import { Controller, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { ApiGet } from '../../../common/decorators';
import { Public } from '../../auth/decorators';
import { VersionCheckQueryDto } from '../dto/version-check-query.dto';
import { VersionCheckResponseDto } from '../dto/version-check-response.dto';
import { AppConfigService } from '../services/app-config.service';

/**
 * App Config Controller
 *
 * Public endpoints for mobile app configuration.
 * No authentication required — must work before user login.
 */
@ApiTags('App Config')
@Controller('app-config')
export class AppConfigController {
  constructor(private readonly appConfigService: AppConfigService) {}

  /**
   * Version check endpoint for mobile apps.
   * Called on every app launch and foreground resume to determine
   * if a force update, recommended update, or maintenance mode applies.
   */
  @Public()
  @ApiGet({
    path: 'version-check',
    summary: 'Check mobile app version for updates',
    description:
      'Public endpoint called by mobile apps to check if the current version requires an update. Returns force/recommended/none status with store URLs.',
    responseType: VersionCheckResponseDto,
    queries: [
      {
        name: 'appType',
        required: true,
        description: 'Which app is checking',
        enum: ['consumer', 'business', 'field-worker'],
      },
      {
        name: 'platform',
        required: true,
        description: 'Mobile platform',
        enum: ['android', 'ios'],
      },
      {
        name: 'currentVersion',
        required: true,
        description: 'Current app version in semver format (e.g., 1.8.0)',
      },
    ],
  })
  checkVersion(@Query() query: VersionCheckQueryDto): VersionCheckResponseDto {
    return this.appConfigService.checkVersion(query.appType, query.platform, query.currentVersion);
  }
}
