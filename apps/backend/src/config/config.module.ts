import { Global, Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';

import { ConfigService } from './config.service';
import configuration from './configuration';

/**
 * Global Configuration Module
 * Loads and validates environment variables
 * Provides ConfigService throughout the application
 */
@Global()
@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env', // Looks for .env in the backend app root
      load: [configuration],
      cache: true,
      expandVariables: true,
      ignoreEnvFile: false,
    }),
  ],
  providers: [ConfigService],
  exports: [ConfigService],
})
export class ConfigModule {}
