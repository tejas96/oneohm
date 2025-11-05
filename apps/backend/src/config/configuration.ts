/* eslint-disable @typescript-eslint/no-confusing-non-null-assertion */
import type { Configuration } from './config.interface';

/**
 * Configuration Loader
 * Loads and structures environment variables
 * Note: Non-null assertions are required for TypeORM CLI compatibility
 */
/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
export default (): Configuration => ({
  app: {
    nodeEnv: process.env.NODE_ENV! as 'development' | 'production',
    port: parseInt(process.env.BACKEND_PORT!, 10),
    host: process.env.BACKEND_HOST!,
    apiPrefix: process.env.BACKEND_API_PREFIX!,
    corsOrigin: process.env.CORS_ORIGIN!,
  },

  database: {
    host: process.env.DATABASE_HOST!,
    port: parseInt(process.env.DATABASE_PORT!, 10),
    user: process.env.DATABASE_USER!,
    password: process.env.DATABASE_PASSWORD!,
    name: process.env.DATABASE_NAME!,
    url: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL! === 'true',
    synchronize: false, // Always false - use migrations only
    logging: process.env.DATABASE_LOGGING! === 'true',
    poolMin: parseInt(process.env.DATABASE_POOL_MIN!, 10),
    poolMax: parseInt(process.env.DATABASE_POOL_MAX!, 10),
  },

  jwt: {
    secret: process.env.JWT_SECRET!,
    expiresIn: process.env.JWT_EXPIRES_IN!,
    refreshSecret: process.env.JWT_REFRESH_SECRET!,
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN!,
  },

  redis: {
    host: process.env.REDIS_HOST!,
    port: parseInt(process.env.REDIS_PORT!, 10),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB!, 10),
    ttl: parseInt(process.env.REDIS_TTL!, 10),
  },

  mail: {
    host: process.env.MAIL_HOST!,
    port: parseInt(process.env.MAIL_PORT!, 10),
    user: process.env.MAIL_USER,
    password: process.env.MAIL_PASSWORD,
    from: process.env.MAIL_FROM!,
    secure: process.env.MAIL_SECURE === 'true',
  },

  storage: {
    type: process.env.STORAGE_TYPE as 'local' | 's3' | 'azure' | 'gcp',
    localPath: process.env.STORAGE_LOCAL_PATH,
    maxFileSize: parseInt(process.env.STORAGE_MAX_FILE_SIZE!, 10),
  },

  security: {
    apiKey: process.env.API_KEY,
    apiKeyHeader: process.env.API_KEY_HEADER!,
    throttleTtl: parseInt(process.env.THROTTLE_TTL!, 10),
    throttleLimit: parseInt(process.env.THROTTLE_LIMIT!, 10),
    rateLimitTtl: parseInt(process.env.RATE_LIMIT_TTL!, 10),
    rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX!, 10),
  },

  logging: {
    level: process.env.LOG_LEVEL!,
    format: process.env.LOG_FORMAT!,
    dir: process.env.LOG_DIR!,
  },

  featureFlags: {
    enableSwagger: process.env.ENABLE_SWAGGER === 'true',
    enableCaching: process.env.ENABLE_CACHING === 'true',
    enableRateLimiting: process.env.ENABLE_RATE_LIMITING === 'true',
    enableCompression: process.env.ENABLE_COMPRESSION === 'true',
    enableHelmet: process.env.ENABLE_HELMET === 'true',
  },

  monitoring: {
    sentryDsn: process.env.SENTRY_DSN,
    sentryEnvironment: process.env.SENTRY_ENVIRONMENT!,
    gaTrackingId: process.env.GA_TRACKING_ID,
  },

  thirdParty: {
    stripePublicKey: process.env.STRIPE_PUBLIC_KEY,
    stripeSecretKey: process.env.STRIPE_SECRET_KEY,
    stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY,
  },
});
