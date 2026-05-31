import { Injectable, Logger } from '@nestjs/common';

import { ConfigService } from '../../../config';
import type { MobileAppVersionConfig } from '../../../config/config.interface';
import type { VersionCheckResponseDto } from '../dto/version-check-response.dto';

/**
 * App Config Service
 *
 * Handles version comparison logic for mobile app force update checks.
 * Uses simple semver comparison (major.minor.patch) without external dependencies.
 */
@Injectable()
export class AppConfigService {
  private readonly logger = new Logger(AppConfigService.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Check the app version and return update status
   */
  checkVersion(
    appType: 'consumer' | 'business',
    platform: 'android' | 'ios',
    currentVersion: string,
  ): VersionCheckResponseDto {
    const mobileAppConfig = this.configService.mobileApp;

    // Check maintenance mode first — overrides everything
    if (mobileAppConfig.maintenanceMode) {
      this.logger.log(`Maintenance mode active — blocking ${appType} app`);
      return {
        updateStatus: 'none',
        minVersion: '',
        recommendedVersion: '',
        storeUrl: '',
        maintenanceMode: true,
        maintenanceMessage: mobileAppConfig.maintenanceMessage,
      };
    }

    const appConfig: MobileAppVersionConfig = mobileAppConfig[appType];
    const storeUrl = platform === 'android' ? appConfig.playStoreUrl : appConfig.appStoreUrl;

    // Determine update status via semver comparison
    let updateStatus: 'force' | 'recommended' | 'none' = 'none';

    if (this.isVersionLessThan(currentVersion, appConfig.minVersion)) {
      updateStatus = 'force';
      this.logger.log(
        `Force update required for ${appType} app: ${currentVersion} < ${appConfig.minVersion}`,
      );
    } else if (this.isVersionLessThan(currentVersion, appConfig.recommendedVersion)) {
      updateStatus = 'recommended';
      this.logger.log(
        `Recommended update for ${appType} app: ${currentVersion} < ${appConfig.recommendedVersion}`,
      );
    }

    return {
      updateStatus,
      minVersion: appConfig.minVersion,
      recommendedVersion: appConfig.recommendedVersion,
      storeUrl,
      maintenanceMode: false,
      maintenanceMessage: null,
    };
  }

  /**
   * Compare two semver strings: returns true if versionA < versionB
   *
   * Splits on '.', compares major → minor → patch numerically.
   * No external dependencies needed for simple three-part semver.
   */
  private isVersionLessThan(versionA: string, versionB: string): boolean {
    const partsA = versionA.split('.').map(Number);
    const partsB = versionB.split('.').map(Number);

    for (let i = 0; i < 3; i++) {
      const a = partsA[i] ?? 0;
      const b = partsB[i] ?? 0;

      if (a < b) {
        return true;
      }
      if (a > b) {
        return false;
      }
    }

    return false; // Versions are equal
  }
}
