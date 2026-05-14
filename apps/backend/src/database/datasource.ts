import type { ConfigService } from '@nestjs/config';
import { type DataSourceOptions, DataSource } from 'typeorm';

import type { Configuration } from '../config/config.interface';

/**
 * Parse a Postgres connection URL into TypeORM-compatible fields.
 * Fly.io injects DATABASE_URL for attached Postgres clusters; we prefer
 * individual vars (DATABASE_HOST, etc.) when they are present so that
 * existing local setups keep working without change.
 */
function parseDatabaseUrl(url: string): Partial<{
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
}> {
  try {
    const parsed = new URL(url);
    return {
      host: parsed.hostname,
      port: parsed.port ? parseInt(parsed.port, 10) : 5432,
      username: parsed.username ? decodeURIComponent(parsed.username) : undefined,
      password: parsed.password ? decodeURIComponent(parsed.password) : undefined,
      database: parsed.pathname.replace(/^\//, '') || undefined,
    };
  } catch {
    return {};
  }
}

/**
 * TypeORM DataSource Factory
 * Creates and configures the database connection.
 *
 * Priority: individual DATABASE_* env vars > DATABASE_URL
 * This covers both local development and Fly.io (which injects DATABASE_URL).
 */
export const createDataSourceOptions = (
  configService: ConfigService<Configuration>,
): DataSourceOptions => {
  const dbConfig = configService.get('database', { infer: true });
  const nodeEnv = configService.get('app.nodeEnv', { infer: true });

  if (!dbConfig) {
    throw new Error('Database configuration is missing');
  }

  // Fall back to DATABASE_URL when individual host/user/pass/name vars are absent
  const fromUrl =
    !dbConfig.host && !dbConfig.user && dbConfig.url ? parseDatabaseUrl(dbConfig.url) : {};

  const host = dbConfig.host || fromUrl.host;
  const port = dbConfig.port || fromUrl.port || 5432;
  const username = dbConfig.user || fromUrl.username;
  const password = dbConfig.password || fromUrl.password;
  const database = dbConfig.name || fromUrl.database;

  if (!host || !username || !password || !database) {
    const missing = [
      !host && 'DATABASE_HOST',
      !username && 'DATABASE_USER',
      !password && 'DATABASE_PASSWORD',
      !database && 'DATABASE_NAME',
    ]
      .filter(Boolean)
      .join(', ');
    throw new Error(
      `Database configuration incomplete. Missing: ${missing}. ` +
        'Set individual DATABASE_* secrets or DATABASE_URL.',
    );
  }

  return {
    type: 'postgres',
    host,
    port,
    username,
    password,
    database,
    entities: [`${__dirname}/../**/*.entity{.ts,.js}`],
    migrations: [`${__dirname}/../database/migrations/**/*{.ts,.js}`],
    subscribers: [`${__dirname}/../**/*.subscriber{.ts,.js}`],
    synchronize: false,
    logging: dbConfig.logging ? true : ['error', 'warn', 'migration'],
    logger: 'advanced-console',
    ssl: dbConfig.ssl ? { rejectUnauthorized: false } : false,
    extra: {
      max: dbConfig.poolMax || 20,
      min: dbConfig.poolMin || 5,
      // Evict idle connections after 55s — just under Fly.io's WireGuard NAT
      // idle timeout (~60s). This proactively removes connections before the
      // network layer silently drops them, preventing "Connection terminated
      // unexpectedly" errors on the next query after a quiet period.
      idleTimeoutMillis: 55000,
      connectionTimeoutMillis: 5000,
      statement_timeout: 30000,
      query_timeout: 30000,
      // TCP keepalive: after 10s of socket inactivity, start probing every 5s.
      // Fly.io's tcp_keepalives_idle is 7200s (2h) server-side — far too slow
      // to catch WireGuard NAT drops. Client-side keepalive at 10s detects
      // and discards dead connections before they are handed to a query.
      keepAlive: true,
      keepAliveInitialDelayMillis: 10000,
    },
    cache: false,
    maxQueryExecutionTime: nodeEnv === 'development' ? 1000 : 5000,
    poolSize: dbConfig.poolMax || 20,
  };
};

/**
 * TypeORM DataSource
 * Used for migrations and CLI commands
 */
export const createDataSource = (configService: ConfigService<Configuration>): DataSource => {
  const options = createDataSourceOptions(configService);
  return new DataSource(options);
};
