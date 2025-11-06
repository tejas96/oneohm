declare namespace NodeJS {
  interface ProcessEnv {
    // All env vars are strings - parse them in configuration.ts
    NODE_ENV: 'development' | 'production';
    BACKEND_PORT: string;
    BACKEND_HOST: string;
    BACKEND_API_PREFIX: string;
    CORS_ORIGIN: string;

    DATABASE_HOST: string;
    DATABASE_PORT: string;
    DATABASE_USER: string;
    DATABASE_PASSWORD: string;
    DATABASE_NAME: string;
    DATABASE_URL?: string;
    DATABASE_SSL: string;
    DATABASE_SYNCHRONIZE: string;
    DATABASE_LOGGING: string;
    DATABASE_POOL_MIN: string;
    DATABASE_POOL_MAX: string;

    JWT_SECRET: string;
    JWT_EXPIRES_IN: string;
    JWT_REFRESH_SECRET: string;
    JWT_REFRESH_EXPIRES_IN: string;

    REDIS_HOST?: string;
    REDIS_PORT?: string;
    REDIS_PASSWORD?: string;
    REDIS_DB?: string;
    REDIS_TTL?: string;

    MAIL_HOST?: string;
    MAIL_PORT?: string;
    MAIL_USER?: string;
    MAIL_PASSWORD?: string;
    MAIL_FROM?: string;
    MAIL_SECURE?: string;

    STORAGE_TYPE?: string;
    STORAGE_LOCAL_PATH?: string;
    STORAGE_MAX_FILE_SIZE?: string;

    API_KEY?: string;
    API_KEY_HEADER?: string;
    THROTTLE_TTL?: string;
    THROTTLE_LIMIT?: string;
    RATE_LIMIT_TTL?: string;
    RATE_LIMIT_MAX?: string;

    LOG_LEVEL?: string;
    LOG_FORMAT?: string;
    LOG_DIR?: string;

    ENABLE_SWAGGER?: string;
    ENABLE_CACHING?: string;
    ENABLE_RATE_LIMITING?: string;
    ENABLE_COMPRESSION?: string;
    ENABLE_HELMET?: string;

    SENTRY_DSN?: string;
    SENTRY_ENVIRONMENT?: string;
    GA_TRACKING_ID?: string;

    STRIPE_PUBLIC_KEY?: string;
    STRIPE_SECRET_KEY?: string;
    STRIPE_WEBHOOK_SECRET?: string;
    GOOGLE_MAPS_API_KEY?: string;
  }
}
