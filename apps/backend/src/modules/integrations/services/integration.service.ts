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
  IntegrationStatus,
  type ITextMessage,
  type ITemplateMessage,
  type IMediaMessage,
  type IOtpMessage,
  type IAlertMessage,
  type IMessageResponse,
} from '@tejas96/shared/types';

import { ProviderResolver, ProviderFactory } from '../core';
import type { CreateIntegrationDto, UpdateIntegrationDto } from '../dto';
import { IntegrationEntity } from '../entities';
import type { IMessagingProvider, IBaseIntegration } from '../interfaces';
import { IntegrationRepository } from '../repositories';
import { IntegrationCredentialService } from './integration-credential.service';

type SendHandler = (provider: IMessagingProvider) => Promise<IMessageResponse>;

export interface MessagingHealthResult {
  canSend: boolean;
  errors: Array<{ code?: string | number; description?: string }>;
}

@Injectable()
export class IntegrationService {
  private readonly logger = new Logger(IntegrationService.name);

  constructor(
    private readonly repository: IntegrationRepository,
    private readonly credentialService: IntegrationCredentialService,
    private readonly providerFactory: ProviderFactory,
    private readonly providerResolver: ProviderResolver,
  ) {}

  async createIntegration(
    dto: CreateIntegrationDto,
    userId: string,
  ): Promise<IntegrationEntity> {
    const exists = await this.repository.existsByProviderAndCategory(dto.provider, dto.category);
    if (exists) {
      throw new ConflictException(
        `Integration for provider '${dto.provider}' in category '${dto.category}' already exists`,
      );
    }

    await this.validateProviderCredentials(dto.provider, dto.credentials, dto.configuration);

    const encryptedCredentials = this.credentialService.encrypt(dto.credentials);

    const integration = await this.repository.create({
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
      validationError: undefined,
    });

    this.logger.log(
      `Created integration: ${integration.name} (${integration.provider}/${integration.category})`,
    );

    return integration;
  }

  async updateIntegration(
    id: string,
    dto: UpdateIntegrationDto,
    userId: string,
  ): Promise<IntegrationEntity> {
    const integration = await this.repository.findById(id);
    if (!integration) {
      throw new NotFoundException('Integration not found');
    }


    const updateData: Partial<IntegrationEntity> = {
      updatedBy: userId,
    };

    if (dto.name) {
      updateData.name = dto.name;
    }

    if (dto.credentials) {
      const configuration = dto.configuration ?? integration.configuration;
      await this.validateProviderCredentials(
        integration.provider as IntegrationProvider,
        dto.credentials,
        configuration,
      );
      updateData.credentials = {
        encrypted: this.credentialService.encrypt(dto.credentials),
      };
      updateData.lastValidatedAt = new Date();
      updateData.validationError = undefined;
    }

    if (dto.authType) {
      updateData.authType = dto.authType;
    }

    if (dto.configuration) {
      updateData.configuration = dto.configuration;
    }

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

  async deleteIntegration(id: string): Promise<void> {
    const integration = await this.repository.findById(id);
    if (!integration) {
      throw new NotFoundException('Integration not found');
    }


    await this.repository.softDelete(id);
    this.logger.log(`Deleted integration: ${integration.name} (${id})`);
  }

  async getIntegrationById(id: string): Promise<IntegrationEntity> {
    const integration = await this.repository.findById(id);
    if (!integration) {
      throw new NotFoundException('Integration not found');
    }


    return integration;
  }

  async getIntegrations(): Promise<IntegrationEntity[]> {
    return this.repository.findByOrganization();
  }

  async getIntegrationsByCategory(
    category: IntegrationCategory,
  ): Promise<IntegrationEntity[]> {
    return this.repository.findAllActiveByCategory(category);
  }

  async getActiveIntegration(
    category: IntegrationCategory,
    provider?: IntegrationProvider,
  ): Promise<IntegrationEntity | null> {
    return this.providerResolver.getActiveIntegration(category, provider);
  }

  async getMessagingHealth(provider: IntegrationProvider): Promise<MessagingHealthResult> {
    try {
      const resolved = await this.providerResolver.resolve(IntegrationCategory.MESSAGING, provider);

      if (this.hasMessagingHealth(resolved)) {
        return resolved.getMessagingHealth();
      }

      const validation = await resolved.validateCredentials();
      return {
        canSend: validation.valid,
        errors: validation.error ? [{ description: validation.error }] : [],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Integration not configured';
      return { canSend: false, errors: [{ description: message }] };
    }
  }

  async sendTextMessage(
    message: ITextMessage,
    provider?: IntegrationProvider,
  ): Promise<IMessageResponse> {
    return this.sendMessage(provider, (messagingProvider) =>
      messagingProvider.sendTextMessage(message),
    );
  }

  async sendTemplateMessage(
    message: ITemplateMessage,
    provider?: IntegrationProvider,
  ): Promise<IMessageResponse> {
    return this.sendMessage(provider, (messagingProvider) =>
      messagingProvider.sendTemplateMessage(message),
    );
  }

  async sendMediaMessage(
    message: IMediaMessage,
    provider?: IntegrationProvider,
  ): Promise<IMessageResponse> {
    return this.sendMessage(provider, (messagingProvider) =>
      messagingProvider.sendMediaMessage(message),
    );
  }

  async sendOtpMessage(
    message: IOtpMessage,
    provider?: IntegrationProvider,
  ): Promise<IMessageResponse> {
    return this.sendMessage(provider, (messagingProvider) =>
      messagingProvider.sendOtpMessage(message),
    );
  }

  async sendAlertMessage(
    message: IAlertMessage,
    provider?: IntegrationProvider,
  ): Promise<IMessageResponse> {
    return this.sendMessage(provider, (messagingProvider) =>
      messagingProvider.sendAlertMessage(message),
    );
  }

  async getWebhookVerifyToken(): Promise<string | undefined> {
    const integration = await this.providerResolver.getActiveIntegration(
      IntegrationCategory.MESSAGING,
      IntegrationProvider.WHATSAPP_BUSINESS,
    );
    const token = integration?.configuration?.webhookVerifyToken;
    return typeof token === 'string' ? token : undefined;
  }

  private async sendMessage(
    provider: IntegrationProvider | undefined,
    sendFn: SendHandler,
  ): Promise<IMessageResponse> {
    const messagingProvider = (await this.providerResolver.resolve(
      IntegrationCategory.MESSAGING,
      provider,
    )) as IMessagingProvider;

    try {
      const result = await sendFn(messagingProvider);

      if (result.status === IntegrationStatus.FAILED) {
        throw new BadRequestException(
          result.error?.message || 'Failed to send message. Please try again.',
        );
      }

      return result;
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }

      throw new BadRequestException(
        error instanceof Error ? error.message : 'Failed to send message. Please try again.',
      );
    }
  }

  private async validateProviderCredentials(
    provider: IntegrationProvider,
    credentials: Record<string, unknown>,
    configuration?: Record<string, unknown>,
  ): Promise<void> {
    const tempEntity = {
      provider,
      category: IntegrationCategory.MESSAGING,
      credentials: { encrypted: this.credentialService.encrypt(credentials) },
      configuration,
      isActive: true,
    } as IntegrationEntity;

    const instance = await this.providerFactory.create(provider, tempEntity);
    const validation = await instance.validateCredentials();

    if (!validation.valid) {
      throw new BadRequestException(
        validation.error || 'Credential validation failed. Check provider credentials.',
      );
    }
  }

  private hasMessagingHealth(
    provider: IBaseIntegration,
  ): provider is IBaseIntegration & { getMessagingHealth: () => Promise<MessagingHealthResult> } {
    return typeof (provider as { getMessagingHealth?: unknown }).getMessagingHealth === 'function';
  }
}
