import type { Configuration } from './config.interface';

/**
 * Configuration Loader
 * Loads and structures environment variables
 */
export default (): Configuration => ({
  app: {
    nodeEnv: process.env.NODE_ENV ?? 'development',
    port: parseInt(process.env.BACKEND_PORT ?? '8085', 10),
    host: process.env.BACKEND_HOST ?? 'localhost',
    apiPrefix: process.env.BACKEND_API_PREFIX ?? '/api/v1',
    corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:3001',
  },

  database: {
    host: process.env.DATABASE_HOST ?? 'localhost',
    port: parseInt(process.env.DATABASE_PORT ?? '5436', 10),
    user: process.env.DATABASE_USER ?? 'oneohm',
    password: process.env.DATABASE_PASSWORD ?? 'postgres',
    name: process.env.DATABASE_NAME ?? 'oneohm_epc',
    url: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL === 'true',
    synchronize: process.env.DATABASE_SYNCHRONIZE === 'true',
    logging: process.env.DATABASE_LOGGING === 'true',
    poolMin: parseInt(process.env.DATABASE_POOL_MIN ?? '2', 10),
    poolMax: parseInt(process.env.DATABASE_POOL_MAX ?? '10', 10),
  },

  jwt: {
    secret: process.env.JWT_SECRET ?? 'your-secret-key',
    expiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
    refreshSecret: process.env.JWT_REFRESH_SECRET ?? 'your-refresh-secret',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '30d',
  },

  redis: {
    host: process.env.REDIS_HOST ?? 'localhost',
    port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB ?? '0', 10),
    ttl: parseInt(process.env.REDIS_TTL ?? '3600', 10),
  },

  mail: {
    host: process.env.MAIL_HOST ?? 'smtp.gmail.com',
    port: parseInt(process.env.MAIL_PORT ?? '587', 10),
    user: process.env.MAIL_USER,
    password: process.env.MAIL_PASSWORD,
    from: process.env.MAIL_FROM ?? 'noreply@oneohm-epc.com',
    secure: process.env.MAIL_SECURE === 'true',
  },

  storage: {
    type: (process.env.STORAGE_TYPE as any) ?? 'local',
    localPath: process.env.STORAGE_LOCAL_PATH ?? './uploads',
    maxFileSize: parseInt(process.env.STORAGE_MAX_FILE_SIZE ?? '10485760', 10),
  },

  security: {
    apiKey: process.env.API_KEY,
    apiKeyHeader: process.env.API_KEY_HEADER ?? 'x-api-key',
    throttleTtl: parseInt(process.env.THROTTLE_TTL ?? '60', 10),
    throttleLimit: parseInt(process.env.THROTTLE_LIMIT ?? '10', 10),
    rateLimitTtl: parseInt(process.env.RATE_LIMIT_TTL ?? '60', 10),
    rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX ?? '100', 10),
  },

  logging: {
    level: process.env.LOG_LEVEL ?? 'info',
    format: process.env.LOG_FORMAT ?? 'json',
    dir: process.env.LOG_DIR ?? './logs',
  },

  featureFlags: {
    enableSwagger: process.env.ENABLE_SWAGGER !== 'false',
    enableCaching: process.env.ENABLE_CACHING === 'true',
    enableRateLimiting: process.env.ENABLE_RATE_LIMITING === 'true',
    enableCompression: process.env.ENABLE_COMPRESSION !== 'false',
    enableHelmet: process.env.ENABLE_HELMET !== 'false',
  },

  monitoring: {
    sentryDsn: process.env.SENTRY_DSN,
    sentryEnvironment: process.env.SENTRY_ENVIRONMENT ?? 'development',
    gaTrackingId: process.env.GA_TRACKING_ID,
  },

  thirdParty: {
    stripePublicKey: process.env.STRIPE_PUBLIC_KEY,
    stripeSecretKey: process.env.STRIPE_SECRET_KEY,
    stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY,
  },
});
