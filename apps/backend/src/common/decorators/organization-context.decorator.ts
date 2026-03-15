import { createParamDecorator, ExecutionContext, BadRequestException } from '@nestjs/common';

/**
 * Organization Context Decorator
 * Extracts organizationId from request query or header
 *
 * Usage:
 * ```typescript
 * @Get()
 * async findAll(@OrganizationContext() organizationId: string) {
 *   // organizationId is automatically extracted and validated
 * }
 * ```
 *
 * Priority:
 * 1. Query parameter: ?organizationId=xxx
 * 2. Header: X-Organization-Id
 * 3. Header: x-organization-id
 */
export const OrganizationContext = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();

    // Try query parameter first
    let organizationId = request.query?.organizationId;

    // Fallback to header
    if (!organizationId) {
      organizationId = request.headers['x-organization-id'] || request.headers['X-Organization-Id'];
    }

    if (!organizationId) {
      throw new BadRequestException(
        'organizationId is required. Provide it as query parameter (?organizationId=xxx) or header (X-Organization-Id)',
      );
    }

    // Basic UUID validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(organizationId)) {
      throw new BadRequestException('organizationId must be a valid UUID');
    }

    return organizationId;
  },
);
