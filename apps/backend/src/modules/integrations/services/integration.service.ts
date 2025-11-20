import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import {
  IntegrationProvider,
  IntegrationCategory,
  type ITextMessage,
  type ITemplateMessage,
  type IMediaMessage,
  type IOtpMessage,
  type IAlertMessage,
  type IMessageResponse,
} from '@oneohm-epc/shared-types';

import type { CreateIntegrationDto, UpdateIntegrationDto } from '../dto';
import { IntegrationEntity } from '../entities';
import { IntegrationProviderFactory } from '../factories';
import type { IMessagingProvider, IBaseIntegration } from '../interfaces';
import { IntegrationRepository } from '../repositories';
import { IntegrationCredentialService } from './integration-credential.service';

/**
 * Integration Service
 * Main service for managing and using integrations
 * Handles auto-resolution of integrations from database
 */
@Injectable()
export class IntegrationService {
  private readonly logger = new Logger(IntegrationService.name);

  constructor(
    private readonly repository: IntegrationRepository,
    private readonly credentialService: IntegrationCredentialService,
    private readonly providerFactory: IntegrationProviderFactory,
  ) {}

  // ===== CRUD OPERATIONS =====

  /**
   * Create a new integration
   */
  async createIntegration(
    organizationId: string,
    dto: CreateIntegrationDto,
    userId: string,
  ): Promise<IntegrationEntity> {
    // Check if integration already exists
    const exists = await this.repository.exists(organizationId, dto.provider, dto.category);
    if (exists) {
      throw new ConflictException(
        `Integration for provider '${dto.provider}' in category '${dto.category}' already exists`,
      );
    }

    // Encrypt credentials
    const encryptedCredentials = this.credentialService.encrypt(dto.credentials);

    // Build config for validation
    const config = {
      authType: dto.authType,
      credentials: dto.credentials, // Use plain credentials for validation
      configuration: dto.configuration,
    };

    // Build provider instance and validate credentials
    const provider = this.providerFactory.build(dto.category, dto.provider, config);
    const validation = await provider.validateCredentials();

    if (!validation.valid) {
      throw new BadRequestException(
        `Credential validation failed: ${validation.error || 'Invalid credentials'}`,
      );
    }

    // Create integration
    const integration = await this.repository.create({
      organizationId,
      name: dto.name,
      provider: dto.provider,
      category: dto.category,
      authType: dto.authType,
      credentials: { encrypted: encryptedCredentials },
      configuration: dto.configuration,
      isActive: dto.isActive ?? true,
      createdBy: userId,
      updatedBy: userId,
      lastValidatedAt: new Date(),
    });

    this.logger.log(
      `Created integration: ${integration.name} (${integration.provider}/${integration.category}) for org ${organizationId}`,
    );

    return integration;
  }

  /**
   * Update an existing integration
   */
  async updateIntegration(
    id: string,
    organizationId: string,
    dto: UpdateIntegrationDto,
    userId: string,
  ): Promise<IntegrationEntity> {
    const integration = await this.repository.findById(id);

    if (!integration) {
      throw new NotFoundException(`Integration with ID ${id} not found`);
    }

    if (integration.organizationId !== organizationId) {
      throw new NotFoundException(`Integration with ID ${id} not found`);
    }

    const updateData: Partial<IntegrationEntity> = {
      updatedBy: userId,
    };

    // Update name if provided
    if (dto.name) {
      updateData.name = dto.name;
    }

    // Update credentials and validate if provided
    if (dto.credentials) {
      const encryptedCredentials = this.credentialService.encrypt(dto.credentials);

      // Build config for validation
      const config = {
        authType: dto.authType || integration.authType,
        credentials: dto.credentials,
        configuration: dto.configuration || integration.configuration,
      };

      const provider = this.providerFactory.build(
        integration.category as IntegrationCategory,
        integration.provider as IntegrationProvider,
        config,
      );

      const validation = await provider.validateCredentials();

      if (!validation.valid) {
        throw new BadRequestException(
          `Credential validation failed: ${validation.error || 'Invalid credentials'}`,
        );
      }

      updateData.credentials = { encrypted: encryptedCredentials };
      updateData.lastValidatedAt = new Date();
      updateData.validationError = undefined;
    }

    // Update auth type if provided
    if (dto.authType) {
      updateData.authType = dto.authType;
    }

    // Update configuration if provided
    if (dto.configuration) {
      updateData.configuration = dto.configuration;
    }

    // Update isActive if provided
    if (dto.isActive !== undefined) {
      updateData.isActive = dto.isActive;
    }

    const updated = await this.repository.update(id, updateData);

    if (!updated) {
      throw new NotFoundException(`Integration with ID ${id} not found`);
    }

    this.logger.log(`Updated integration: ${updated.name} (${id})`);

    return updated;
  }

  /**
   * Delete an integration
   */
  async deleteIntegration(id: string, organizationId: string): Promise<void> {
    const integration = await this.repository.findById(id);

    if (!integration) {
      throw new NotFoundException(`Integration with ID ${id} not found`);
    }

    if (integration.organizationId !== organizationId) {
      throw new NotFoundException(`Integration with ID ${id} not found`);
    }

    await this.repository.softDelete(id);

    this.logger.log(`Deleted integration: ${integration.name} (${id})`);
  }

  /**
   * Get integration by ID
   */
  async getIntegrationById(id: string, organizationId: string): Promise<IntegrationEntity> {
    const integration = await this.repository.findById(id);

    if (integration?.organizationId !== organizationId) {
      throw new NotFoundException(`Integration with ID ${id} not found`);
    }

    return integration;
  }

  /**
   * Get all integrations for an organization
   */
  async getIntegrations(organizationId: string): Promise<IntegrationEntity[]> {
    return this.repository.findByOrganization(organizationId);
  }

  /**
   * Get active integrations by category
   */
  async getIntegrationsByCategory(
    category: IntegrationCategory,
    organizationId: string,
  ): Promise<IntegrationEntity[]> {
    return this.repository.findByCategoryAndOrg(category, organizationId);
  }

  // ===== MESSAGING OPERATIONS =====

  /**
   * Send text message (auto-resolves provider)
   */
  async sendTextMessage(
    organizationId: string,
    message: ITextMessage,
    provider?: IntegrationProvider,
  ): Promise<IMessageResponse> {
    const messagingProvider = await this.resolveProvider<IMessagingProvider>(
      IntegrationCategory.MESSAGING,
      organizationId,
      provider,
    );

    return messagingProvider.sendTextMessage(message);
  }

  /**
   * Send template message
   */
  async sendTemplateMessage(
    organizationId: string,
    message: ITemplateMessage,
    provider?: IntegrationProvider,
  ): Promise<IMessageResponse> {
    const messagingProvider = await this.resolveProvider<IMessagingProvider>(
      IntegrationCategory.MESSAGING,
      organizationId,
      provider,
    );

    return messagingProvider.sendTemplateMessage(message);
  }

  /**
   * Send media message
   */
  async sendMediaMessage(
    organizationId: string,
    message: IMediaMessage,
    provider?: IntegrationProvider,
  ): Promise<IMessageResponse> {
    const messagingProvider = await this.resolveProvider<IMessagingProvider>(
      IntegrationCategory.MESSAGING,
      organizationId,
      provider,
    );

    return messagingProvider.sendMediaMessage(message);
  }

  /**
   * Send OTP message
   */
  async sendOtpMessage(
    organizationId: string,
    message: IOtpMessage,
    provider?: IntegrationProvider,
  ): Promise<IMessageResponse> {
    const messagingProvider = await this.resolveProvider<IMessagingProvider>(
      IntegrationCategory.MESSAGING,
      organizationId,
      provider,
    );

    return messagingProvider.sendOtpMessage(message);
  }

  /**
   * Send alert message
   */
  async sendAlertMessage(
    organizationId: string,
    message: IAlertMessage,
    provider?: IntegrationProvider,
  ): Promise<IMessageResponse> {
    const messagingProvider = await this.resolveProvider<IMessagingProvider>(
      IntegrationCategory.MESSAGING,
      organizationId,
      provider,
    );

    return messagingProvider.sendAlertMessage(message);
  }

  // ===== PROVIDER RESOLUTION =====

  /**
   * Resolve and build a provider instance from database
   */
  private async resolveProvider<T extends IBaseIntegration>(
    category: IntegrationCategory,
    organizationId: string,
    provider?: IntegrationProvider,
  ): Promise<T> {
    let integration: IntegrationEntity | null;

    if (provider) {
      // Get specific provider
      integration = await this.repository.findByOrgProviderCategory(
        organizationId,
        provider,
        category,
      );
    } else {
      // Auto-select first active provider for this category
      const integrations = await this.repository.findByCategoryAndOrg(category, organizationId);
      integration = integrations[0] || null;
    }

    if (!integration) {
      const providerMsg = provider ? ` for provider '${provider}'` : '';
      throw new NotFoundException(
        `No active integration found for category '${category}'${providerMsg}`,
      );
    }

    if (!integration.isActive) {
      throw new BadRequestException(`Integration '${integration.name}' is not active`);
    }

    // Decrypt credentials
    const encryptedString = integration.credentials.encrypted;
    const decryptedCredentials = this.credentialService.decrypt(encryptedString);

    // Build config
    const config = {
      authType: integration.authType,
      credentials: decryptedCredentials,
      configuration: integration.configuration,
    };

    // Build and return provider instance
    return this.providerFactory.build<T>(
      integration.category as IntegrationCategory,
      integration.provider as IntegrationProvider,
      config,
    );
  }
}
