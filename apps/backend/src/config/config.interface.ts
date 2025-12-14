/**
 * Application Configuration Interfaces
 * Provides type-safe access to environment variables
 */

export interface AppConfig {
  nodeEnv: 'development' | 'production';
  port: number;
  host: string;
  apiPrefix: string;
  corsOrigin: string;
  baseUrl: string;
}

export interface DatabaseConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  name: string;
  url?: string;
  ssl: boolean;
  synchronize: boolean;
  logging: boolean;
  poolMin: number;
  poolMax: number;
}

export interface JwtConfig {
  secret: string;
  expiresIn: string;
  refreshSecret: string;
  refreshExpiresIn: string;
}

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db: number;
  ttl: number;
}

export interface MailConfig {
  host: string;
  port: number;
  user?: string;
  password?: string;
  from: string;
  secure: boolean;
}

export interface StorageConfig {
  type: 'local' | 's3' | 'azure' | 'gcp';
  localPath?: string;
  maxFileSize: number;
  awsRegion?: string;
  awsAccessKeyId?: string;
  awsSecretAccessKey?: string;
  awsS3Bucket?: string;
}

export interface SecurityConfig {
  apiKey?: string;
  apiKeyHeader: string;
  throttleTtl: number;
  throttleLimit: number;
  rateLimitTtl: number;
  rateLimitMax: number;
}

export interface LoggingConfig {
  level: string;
  format: string;
  dir: string;
}

export interface FeatureFlagsConfig {
  enableSwagger: boolean;
  enableCaching: boolean;
  enableRateLimiting: boolean;
  enableCompression: boolean;
  enableHelmet: boolean;
}

export interface MonitoringConfig {
  sentryDsn?: string;
  sentryEnvironment: string;
  gaTrackingId?: string;
}

export interface ThirdPartyConfig {
  stripePublicKey?: string;
  stripeSecretKey?: string;
  stripeWebhookSecret?: string;
  googleMapsApiKey?: string;
}

export interface IntegrationsConfig {
  encryptionKey?: string;
  msg91AuthKey?: string;
  msg91SenderId?: string;
  msg91DltTemplateId?: string;
}

/**
 * Complete Application Configuration
 */
export interface Configuration {
  app: AppConfig;
  database: DatabaseConfig;
  jwt: JwtConfig;
  redis: RedisConfig;
  mail: MailConfig;
  storage: StorageConfig;
  security: SecurityConfig;
  logging: LoggingConfig;
  featureFlags: FeatureFlagsConfig;
  monitoring: MonitoringConfig;
  thirdParty: ThirdPartyConfig;
  integrations: IntegrationsConfig;
}
