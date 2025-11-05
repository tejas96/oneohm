import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { createDataSourceOptions } from './datasource';
import { Configuration } from '../config/config.interface';

/**
 * Database Module
 * Configures TypeORM connection with production-ready settings
 */
@Global()
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService<Configuration>) => {
        return createDataSourceOptions(configService);
      },
    }),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
