import { Module } from '@nestjs/common';

import { BomModule } from '../bom/bom.module';
import { CustomersModule } from '../customers/customers.module';
import { DocumentsModule } from '../documents/documents.module';
import { ProjectsModule } from '../projects/projects.module';
import { StorageModule } from '../storage/storage.module';
import { ReportsController } from './controllers/reports.controller';
import { TemplateRendererService } from './renderer/template-renderer.service';
import { ReportFactSourceService } from './services/report-fact-source.service';
import { ReportWorkspaceService } from './services/report-workspace.service';

@Module({
  imports: [ProjectsModule, DocumentsModule, StorageModule, BomModule, CustomersModule],
  controllers: [ReportsController],
  providers: [ReportWorkspaceService, ReportFactSourceService, TemplateRendererService],
})
export class ReportsModule {}
