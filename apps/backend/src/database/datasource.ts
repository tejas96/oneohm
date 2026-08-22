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
 * The calendar day this business runs on.
 *
 * Postgres defaults to UTC, and `fly.toml` already sets `TZ = 'Asia/Kolkata'` on the Node
 * process — so before this setting existed, the two halves of the app disagreed about what
 * day it was for the five and a half hours between IST midnight and 05:29. The same overdue
 * count came out one number from SQL and another from JavaScript, depending only on which
 * side computed it.
 *
 * This is a BUSINESS rule, not a machine property, so it is pinned rather than read from the
 * host clock: a developer in another timezone should see the same day boundaries production
 * does, or they cannot reproduce a bug that only appears after IST midnight.
 *
 * What it moves: `CURRENT_DATE`, `now()::date`, `date_trunc('day', now())` and any
 * `timestamptz::date` cast now resolve against IST. What it does NOT move: a timestamptz
 * compared against another timestamptz is an absolute instant either way, so token expiry,
 * audit trails, rate limits and every `value_date` money figure are untouched.
 *
 * Keep in step with `TZ` in `apps/backend/fly.toml`.
 */
const DATABASE_TIMEZONE = process.env.DATABASE_TIMEZONE || 'Asia/Kolkata';

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
      // Sent as a Postgres startup parameter, so every connection in the pool —
      // including ones opened later — carries it. See DATABASE_TIMEZONE above.
      options: `-c timezone=${DATABASE_TIMEZONE}`,
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
