import { Logger } from '@nestjs/common';
import { IntegrationProvider } from '@tejas96/shared/types';

import type { IBaseIntegration } from '../interfaces';

/**
 * Base Integration Provider
 * Abstract base class for all integration providers
 *
 * Provides common functionality:
 * - Logging
 * - Error handling
 * - Response formatting
 */
export abstract class BaseIntegrationProvider implements IBaseIntegration {
  protected readonly logger: Logger;

  constructor() {
    this.logger = new Logger(this.constructor.name);
  }

  /**
   * Check if provider is properly configured
   * Must be implemented by each provider
   */
  abstract isConfigured(): boolean;

  /**
   * Validate credentials by making a test API call
   * Must be implemented by each provider
   */
  abstract validateCredentials(): Promise<{ valid: boolean; error?: string }>;

  /**
   * Get provider name
   * Must be implemented by each provider
   */
  protected abstract getProviderName(): IntegrationProvider;

  /**
   * Common error handler
   * Formats errors consistently across all providers
   */
  protected handleError(
    error: unknown,
    operation: string,
  ): { error: { code: string; message: string; details?: unknown } } {
    this.logger.error(`${operation} failed`, error);

    const err = error as {
      response?: { data?: { message?: string }; status?: number };
      message?: string;
      code?: string;
    };
    const errorMessage = err.response?.data?.message || err.message || 'Unknown error';
    const errorCode = err.response?.status?.toString() || err.code || 'UNKNOWN';

    return {
      error: {
        code: errorCode,
        message: errorMessage,
        details: err.response?.data,
      },
    };
  }

  /**
   * Clean phone number (remove + prefix for APIs that don't support it)
   */
  protected cleanPhone(phone: string): string {
    return phone.replace(/^\+/, '');
  }
}
