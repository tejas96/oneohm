import { IntegrationStatus, type IMessageResponse } from '@oneohm-epc/shared/types';

import { BaseIntegrationProvider } from './base-integration-provider';

/**
 * Base Messaging Provider
 * Abstract base class for all messaging providers (SMS, WhatsApp, etc.)
 *
 * Provides common functionality for messaging:
 * - Success response formatting
 * - Error response formatting
 * - Phone number utilities
 *
 * NOTE: Full interface implementation will be done in future PR
 * when integration system refactor is complete
 */
export abstract class BaseMessagingProvider extends BaseIntegrationProvider {
  /**
   * Create a success response
   */
  protected createSuccessResponse(
    messageId: string,
    metadata?: Record<string, unknown>,
  ): IMessageResponse {
    return {
      messageId,
      status: IntegrationStatus.SENT,
      provider: this.getProviderName(),
      timestamp: new Date(),
      metadata,
    };
  }

  /**
   * Create a failed response
   */
  protected createFailedResponse(error: unknown, operation: string): IMessageResponse {
    const errorData = this.handleError(error, operation);

    return {
      messageId: `error-${Date.now()}`,
      status: IntegrationStatus.FAILED,
      provider: this.getProviderName(),
      timestamp: new Date(),
      ...errorData,
    };
  }
}
