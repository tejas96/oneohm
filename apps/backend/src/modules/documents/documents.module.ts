import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DocumentController } from './controllers';
import { DocumentEntity } from './entities';
import { DocumentRepository } from './repositories';
import { DocumentPrintService, DocumentService } from './services';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [TypeOrmModule.forFeature([DocumentEntity]), StorageModule],
  controllers: [DocumentController],
  providers: [DocumentRepository, DocumentService, DocumentPrintService],
  exports: [DocumentRepository, DocumentService],
})
export class DocumentsModule {}
