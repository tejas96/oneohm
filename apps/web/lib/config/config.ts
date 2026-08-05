import { WebConfiguration } from './config.interface';

/**
 * Web Application Configuration
 * Loads environment variables with proper type safety
 *
 * Note: In Next.js, only NEXT_PUBLIC_* variables are available in the browser.
 * All other variables are only available server-side.
 */
class WebConfigService {
  private config: WebConfiguration;

  constructor() {
    this.config = this.loadConfig();
  }

  private loadConfig(): WebConfiguration {
    return {
      app: {
        nodeEnv: process.env.NODE_ENV || 'development',
        port: parseInt(process.env.PORT || '3001', 10),
        name: process.env.NEXT_PUBLIC_APP_NAME || 'OneOhm EPC',
        version: process.env.NEXT_PUBLIC_APP_VERSION || '0.0.1',
      },

      api: {
        baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8085/api/v1',
        timeout: 80850, // 30 seconds
      },

      analytics: {
        gaTrackingId: process.env.NEXT_PUBLIC_GA_TRACKING_ID,
        enableAnalytics: process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true' || false,
        enableErrorTracking: process.env.NEXT_PUBLIC_ENABLE_ERROR_TRACKING === 'true' || false,
      },

      monitoring: {
        sentryDsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
        sentryAuthToken: process.env.SENTRY_AUTH_TOKEN,
      },

      thirdParty: {
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
        stripePublicKey: process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY,
      },

      features: {},
    };
  }

  /**
   * Get application configuration
   */
  get app() {
    return this.config.app;
  }

  /**
   * Get API configuration
   */
  get api() {
    return this.config.api;
  }

  /**
   * Get analytics configuration
   */
  get analytics() {
    return this.config.analytics;
  }

  /**
   * Get monitoring configuration
   */
  get monitoring() {
    return this.config.monitoring;
  }

  /**
   * Get third-party services configuration
   */
  get thirdParty() {
    return this.config.thirdParty;
  }

  /**
   * Get feature flags
   */
  get features() {
    return this.config.features;
  }

  /**
   * Get complete configuration
   */
  get all(): WebConfiguration {
    return this.config;
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
   * Get environment name
   */
  get environment(): string {
    return this.app.nodeEnv;
  }

  /**
   * Check if analytics is enabled
   */
  get isAnalyticsEnabled(): boolean {
    return this.analytics.enableAnalytics && !!this.analytics.gaTrackingId;
  }

  /**
   * Check if error tracking is enabled
   */
  get isErrorTrackingEnabled(): boolean {
    return this.analytics.enableErrorTracking && !!this.monitoring.sentryDsn;
  }
}

// Export singleton instance
export const config = new WebConfigService();

// Export class for type reference
export { WebConfigService };
