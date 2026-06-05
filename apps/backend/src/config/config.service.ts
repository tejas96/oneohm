import { Injectable } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';

import {
  AppConfig,
  Configuration,
  DatabaseConfig,
  FirebaseConfig,
  FeatureFlagsConfig,
  IntegrationsConfig,
  JwtConfig,
  LoggingConfig,
  MailConfig,
  MobileAppConfig,
  MonitoringConfig,
  RedisConfig,
  SecurityConfig,
  SeedConfig,
  StorageConfig,
  ThirdPartyConfig,
} from './config.interface';

/**
 * Custom Configuration Service
 * Provides type-safe access to all configuration values
 *
 * Usage:
 * ```typescript
 * constructor(private configService: ConfigService) {}
 *
 * const port = this.configService.app.port;
 * const dbHost = this.configService.database.host;
 * ```
 */
@Injectable()
export class ConfigService {
  constructor(private nestConfigService: NestConfigService<Configuration>) {}

  /**
   * Application Configuration
   */
  get app(): AppConfig {
    return this.nestConfigService.get<AppConfig>('app')!;
  }

  /**
   * Database Configuration
   */
  get database(): DatabaseConfig {
    return this.nestConfigService.get<DatabaseConfig>('database')!;
  }

  /**
   * JWT Configuration
   */
  get jwt(): JwtConfig {
    return this.nestConfigService.get<JwtConfig>('jwt')!;
  }

  /**
   * Redis Configuration
   */
  get redis(): RedisConfig {
    return this.nestConfigService.get<RedisConfig>('redis')!;
  }

  /**
   * Mail Configuration
   */
  get mail(): MailConfig {
    return this.nestConfigService.get<MailConfig>('mail')!;
  }

  /**
   * Storage Configuration
   */
  get storage(): StorageConfig {
    return this.nestConfigService.get<StorageConfig>('storage')!;
  }

  /**
   * Security Configuration
   */
  get security(): SecurityConfig {
    return this.nestConfigService.get<SecurityConfig>('security')!;
  }

  /**
   * Logging Configuration
   */
  get logging(): LoggingConfig {
    return this.nestConfigService.get<LoggingConfig>('logging')!;
  }

  /**
   * Feature Flags Configuration
   */
  get featureFlags(): FeatureFlagsConfig {
    return this.nestConfigService.get<FeatureFlagsConfig>('featureFlags')!;
  }

  /**
   * Monitoring Configuration
   */
  get monitoring(): MonitoringConfig {
    return this.nestConfigService.get<MonitoringConfig>('monitoring')!;
  }

  /**
   * Third-party Services Configuration
   */
  get thirdParty(): ThirdPartyConfig {
    return this.nestConfigService.get<ThirdPartyConfig>('thirdParty')!;
  }

  /**
   * Firebase Configuration
   */
  get firebase(): FirebaseConfig {
    return this.nestConfigService.get<FirebaseConfig>('firebase')!;
  }

  /**
   * Integrations Configuration
   */
  get integrations(): IntegrationsConfig {
    return this.nestConfigService.get<IntegrationsConfig>('integrations')!;
  }

  /**
   * Mobile App Version Configuration
   */
  get mobileApp(): MobileAppConfig {
    return this.nestConfigService.get<MobileAppConfig>('mobileApp')!;
  }

  /**
   * Seed Configuration
   */
  get seed(): SeedConfig {
    return this.nestConfigService.get<SeedConfig>('seed')!;
  }

  /**
   * Get complete configuration
   */
  get all(): Configuration {
    return {
      app: this.app,
      database: this.database,
      jwt: this.jwt,
      redis: this.redis,
      mail: this.mail,
      storage: this.storage,
      security: this.security,
      logging: this.logging,
      featureFlags: this.featureFlags,
      monitoring: this.monitoring,
      thirdParty: this.thirdParty,
      firebase: this.firebase,
      integrations: this.integrations,
      mobileApp: this.mobileApp,
      seed: this.seed,
    };
  }

  /**
   * Check if running in production
   */
  get isProduction(): boolean {
    return this.app.nodeEnv === 'production';
  }

  /**
   * Check if running in development
   */
  get isDevelopment(): boolean {
    return this.app.nodeEnv === 'development';
  }

  /**
   * Check if running in test mode
   */
  get isTest(): boolean {
    return this.app.nodeEnv === 'development';
  }

  /**
   * Get environment name
   */
  get environment(): string {
    return this.app.nodeEnv;
  }
}
