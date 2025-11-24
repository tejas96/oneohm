import { IntegrationStatus, type IMessageResponse } from '@oneohm-epc/shared-types';

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
    metadata?: Record<string, any>,
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
  protected createFailedResponse(error: any, operation: string): IMessageResponse {
    const errorData = this.handleError(error, operation);

    return {
      messageId: `error-${Date.now()}`,
      status: IntegrationStatus.FAILED,
      provider: this.getProviderName(),
      timestamp: new Date(),
      ...errorData,
    };
  }

  /**
   * Wrap async operations with error handling
   */
  protected async executeWithErrorHandling<T>(
    operation: () => Promise<T>,
    operationName: string,
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      this.logger.error(`${operationName} failed`, error);
      throw error;
    }
  }

  /**
   * Validate phone number format
   */
  protected validatePhone(phone: string): boolean {
    // Basic E.164 validation
    return /^\+?[1-9]\d{1,14}$/.test(phone);
  }

  /**
   * Validate message content
   */
  protected validateMessage(message: string, maxLength = 1600): boolean {
    return Boolean(message && message.length > 0 && message.length <= maxLength);
  }
}
