import type { ConfigService } from '@nestjs/config';
import { type DataSourceOptions, DataSource } from 'typeorm';

import type { Configuration } from '../config/config.interface';

/**
 * TypeORM DataSource Factory
 * Creates and configures the database connection
 */
export const createDataSourceOptions = (
  configService: ConfigService<Configuration>,
): DataSourceOptions => {
  const dbConfig = configService.get('database', { infer: true });
  const nodeEnv = configService.get('app.nodeEnv', { infer: true });

  if (!dbConfig) {
    throw new Error('Database configuration is missing');
  }

  return {
    type: 'postgres',
    host: dbConfig.host,
    port: dbConfig.port,
    username: dbConfig.user,
    password: dbConfig.password,
    database: dbConfig.name,
    entities: [`${__dirname}/../**/*.entity{.ts,.js}`],
    migrations: [`${__dirname}/../database/migrations/**/*{.ts,.js}`],
    subscribers: [`${__dirname}/../**/*.subscriber{.ts,.js}`],
    synchronize: false, // Always false - use migrations
    logging: dbConfig.logging || nodeEnv === 'development',
    logger: 'advanced-console',
    ssl: dbConfig.ssl
      ? {
          rejectUnauthorized: false,
        }
      : false,
    extra: {
      max: dbConfig.poolMax || 20, // Maximum pool size
      min: dbConfig.poolMin || 5, // Minimum pool size
      idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
      connectionTimeoutMillis: 5000, // Connection timeout
      statement_timeout: 30000, // Query timeout (30 seconds)
      query_timeout: 30000,
    },
    // Production optimizations
    cache: false, // Disable query caching (use Redis for caching instead)
    maxQueryExecutionTime: nodeEnv === 'development' ? 1000 : 5000, // Log slow queries
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
