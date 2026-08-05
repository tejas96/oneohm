/**
 * Web Application Configuration Interfaces
 * Type-safe access to environment variables in Next.js
 */

export interface AppConfig {
  nodeEnv: string;
  port: number;
  name: string;
  version: string;
}

export interface ApiConfig {
  baseUrl: string;
  timeout: number;
}

export interface AnalyticsConfig {
  gaTrackingId?: string;
  enableAnalytics: boolean;
  enableErrorTracking: boolean;
}

export interface MonitoringConfig {
  sentryDsn?: string;
  sentryAuthToken?: string;
}

export interface ThirdPartyConfig {
  googleMapsApiKey?: string;
  stripePublicKey?: string;
}

export interface FeaturesConfig {
  // Reserved for future feature flags
}

export interface WebConfiguration {
  app: AppConfig;
  api: ApiConfig;
  analytics: AnalyticsConfig;
  monitoring: MonitoringConfig;
  thirdParty: ThirdPartyConfig;
  features: FeaturesConfig;
}
