import {
  BadRequestException,
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

import { CustomerProfileRepository } from '../../customers/repositories/customer-profile.repository';
import { CustomerPropertyRepository } from '../../customers/repositories/customer-property.repository';
import { ProjectRepository } from '../../projects/repositories/project.repository';
import { QuoteRepository } from '../../quotes/repositories/quote.repository';
import type { ConsumerAuthRequest } from '../types/consumer-request.types';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * CustomerOwnershipGuard
 * Resolves customerProfile from JWT user + organization context.
 * Asserts resource ownership when route params include propertyId or quotationId.
 *
 * Usage (with JwtAuthGuard):
 * @UseGuards(JwtAuthGuard, CustomerOwnershipGuard)
 */
@Injectable()
export class CustomerOwnershipGuard implements CanActivate {
  constructor(
    private readonly customerProfileRepository: CustomerProfileRepository,
    private readonly customerPropertyRepository: CustomerPropertyRepository,
    private readonly quoteRepository: QuoteRepository,
    private readonly projectRepository: ProjectRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<ConsumerAuthRequest>();

    if (!request.user?.id) {
      throw new ForbiddenException('Access denied: User not authenticated');
    }

    const organizationId = this.resolveOrganizationId(request);
    request.organizationId = organizationId;

    const customerProfile = await this.customerProfileRepository.findByUserAndOrganization(
      request.user.id,
      organizationId,
    );

    if (!customerProfile) {
      throw new ForbiddenException('Access denied: No customer profile for this organization');
    }

    request.customerProfile = customerProfile;

    const propertyId = request.params?.propertyId as string | undefined;
    if (propertyId) {
      await this.assertPropertyOwnership(propertyId, organizationId, customerProfile.id);
    }

    const quotationId = request.params?.quotationId as string | undefined;
    if (quotationId) {
      await this.assertQuoteOwnership(quotationId, organizationId, customerProfile.id);
    }

    const projectId = request.params?.projectId as string | undefined;
    if (projectId) {
      await this.assertProjectOwnership(projectId, organizationId, customerProfile.id);
    }

    return true;
  }

  private resolveOrganizationId(request: ConsumerAuthRequest): string {
    let organizationId = request.query?.organizationId as string | undefined;

    if (!organizationId) {
      const headerOrgId =
        request.headers['x-organization-id'] ?? request.headers['X-Organization-Id'];
      organizationId = Array.isArray(headerOrgId) ? headerOrgId[0] : headerOrgId;
    }

    if (!organizationId) {
      throw new BadRequestException(
        'organizationId is required. Provide it as query parameter (?organizationId=xxx) or header (X-Organization-Id)',
      );
    }

    if (!UUID_REGEX.test(organizationId)) {
      throw new BadRequestException('organizationId must be a valid UUID');
    }

    return organizationId;
  }

  private async assertPropertyOwnership(
    propertyId: string,
    organizationId: string,
    customerProfileId: string,
  ): Promise<void> {
    const property = await this.customerPropertyRepository.findByIdAndOrganization(
      propertyId,
      organizationId,
    );

    if (property?.customerId !== customerProfileId) {
      throw new ForbiddenException('Access denied: You do not own this property');
    }
  }

  private async assertQuoteOwnership(
    quotationId: string,
    organizationId: string,
    customerProfileId: string,
  ): Promise<void> {
    const quote = await this.quoteRepository.findById(quotationId, organizationId);

    if (quote.customerId !== customerProfileId) {
      throw new ForbiddenException('Access denied: You do not own this quotation');
    }
  }

  private async assertProjectOwnership(
    projectId: string,
    organizationId: string,
    customerProfileId: string,
  ): Promise<void> {
    const project = await this.projectRepository.findById(projectId, organizationId);

    if (!project) {
      throw new ForbiddenException('Access denied: You do not own this project');
    }

    const property = await this.customerPropertyRepository.findByIdAndOrganization(
      project.propertyId,
      organizationId,
    );

    if (property?.customerId !== customerProfileId) {
      throw new ForbiddenException('Access denied: You do not own this project');
    }
  }
}
