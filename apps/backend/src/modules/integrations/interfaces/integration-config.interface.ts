/**
 * Base configuration interface for all integrations
 */
export interface IIntegrationConfig {
  authType: string;
  credentials: Record<string, any>;
  configuration?: Record<string, any>;
}
