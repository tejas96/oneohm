import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import type { CurrentUserType } from '../../auth/types';
import { FEATURE_KEY, type FeatureMetadata } from '../decorators/require-feature.decorator';
import { IamService } from '../services/iam.service';

/**
 * Feature Guard
 * Checks if user has access to a feature
 *
 * Simplified in Minimal IAM: Feature access = having ANY permission for that feature
 *
 * Usage:
 * @RequireFeature('customers')
 */
@Injectable()
export class FeatureGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private iamService: IamService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Get feature metadata from decorator
    const featureMetadata = this.reflector.getAllAndOverride<FeatureMetadata>(FEATURE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If no feature required, allow access
    if (!featureMetadata) {
      return true;
    }

    // Get user from request (set by JwtAuthGuard)
    const request = context.switchToHttp().getRequest<{ user: CurrentUserType }>();
    const user = request.user;

    if (!user.id) {
      throw new ForbiddenException('Access denied: User not authenticated');
    }

    const { featureCode } = featureMetadata;

    // Check feature access using IAM service (simplified - only needs userId and featureCode)
    const hasAccess = await this.iamService.hasFeatureAccess(user.id, featureCode);

    if (!hasAccess) {
      throw new ForbiddenException(`Access denied: Feature '${featureCode}' is not accessible`);
    }

    return true;
  }
}
