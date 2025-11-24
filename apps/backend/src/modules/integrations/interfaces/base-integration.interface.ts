/**
 * Base Integration Interface
 * All integrations (Messaging, Payment, Storage, etc.) must implement this
 */
export interface IBaseIntegration {
  /**
   * Check if the integration is properly configured
   */
  isConfigured(): boolean;

  /**
   * Validate credentials by making a test API call
   * @returns Object with valid flag and optional error message
   */
  validateCredentials(): Promise<{ valid: boolean; error?: string }>;
}
