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
  frontendUrl: string;
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
  type: 'local' | 's3' | 'tigris' | 'azure' | 'gcp';
  localPath?: string;
  maxFileSize: number;
  /** AWS/Tigris region */
  awsRegion?: string;
  /** AWS/Tigris access key */
  awsAccessKeyId?: string;
  /** AWS/Tigris secret key */
  awsSecretAccessKey?: string;
  /** S3/Tigris bucket name */
  awsS3Bucket?: string;
  /** Custom S3 endpoint for Tigris or other S3-compatible storage */
  s3Endpoint?: string;
  /** Presigned URL expiry in seconds (default: 3600) */
  presignedUrlExpiry?: number;
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

export interface FirebaseConfig {
  projectId?: string;
  clientEmail?: string;
  privateKey?: string;
  serviceAccountPath?: string;
}

export interface IntegrationsConfig {
  encryptionKey?: string;
  msg91AuthKey?: string;
  msg91SenderId?: string;
  msg91LoginTemplateId?: string;
  msg91PasswordResetTemplateId?: string;
}

export interface MobileAppVersionConfig {
  minVersion: string;
  recommendedVersion: string;
  playStoreUrl: string;
  appStoreUrl: string;
}

export interface MobileAppConfig {
  consumer: MobileAppVersionConfig;
  business: MobileAppVersionConfig;
  maintenanceMode: boolean;
  maintenanceMessage: string;
}

export interface SeedConfig {
  platformAdminEmail: string;
  platformAdminPhone: string;
  platformAdminPassword: string;
  organizationId: string;
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
  firebase: FirebaseConfig;
  integrations: IntegrationsConfig;
  mobileApp: MobileAppConfig;
  seed: SeedConfig;
}
