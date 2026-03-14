/**
 * Storage Module
 *
 * Provides file storage functionality using S3-compatible services (AWS S3, Tigris, etc.)
 *
 * Features:
 * - Presigned URL generation for direct uploads
 * - File deletion
 * - File existence checking
 * - Organized file storage by category
 *
 * @module modules/storage
 */

import { Module } from '@nestjs/common';

import { StorageController } from './controllers';
import { S3StorageService, StorageService } from './services';
import { ConfigModule } from '../../config/config.module';

@Module({
  imports: [ConfigModule],
  controllers: [StorageController],
  providers: [StorageService, S3StorageService],
  exports: [StorageService, S3StorageService],
})
export class StorageModule {}
