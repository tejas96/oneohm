import { Module } from '@nestjs/common';

import { BomModule } from '../bom/bom.module';
import { DocumentsModule } from '../documents/documents.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { ProjectsModule } from '../projects/projects.module';
import { StorageModule } from '../storage/storage.module';
import { ReportsController } from './controllers/reports.controller';
import { AnnexureProformaAMapper } from './definitions/annexure-proforma-a/annexure-proforma-a.mapper';
import { AnnexureProformaAReportPlugin } from './definitions/annexure-proforma-a/annexure-proforma-a.plugin';
import { DcrMapper } from './definitions/dcr/dcr.mapper';
import { DcrReportPlugin } from './definitions/dcr/dcr.plugin';
import { NetMeteringAgreementMapper } from './definitions/net-metering-agreement/net-metering-agreement.mapper';
import { NetMeteringAgreementReportPlugin } from './definitions/net-metering-agreement/net-metering-agreement.plugin';
import { WcrMapper } from './definitions/wcr/wcr.mapper';
import { WcrReportPlugin } from './definitions/wcr/wcr.plugin';
import { FieldResolverService } from './engine/field-resolver.service';
import { ReportEngineService } from './engine/report-engine.service';
import { BaseProjectReportProvider } from './providers/base-project-report.provider';
import { ReportRegistryService } from './registry/report-registry.service';
import { TemplateRendererService } from './renderer/template-renderer.service';

@Module({
  imports: [ProjectsModule, DocumentsModule, StorageModule, OrganizationsModule, BomModule],
  controllers: [ReportsController],
  providers: [
    ReportRegistryService,
    ReportEngineService,
    FieldResolverService,
    TemplateRendererService,
    BaseProjectReportProvider,
    WcrMapper,
    AnnexureProformaAMapper,
    NetMeteringAgreementMapper,
    DcrMapper,
    WcrReportPlugin,
    AnnexureProformaAReportPlugin,
    NetMeteringAgreementReportPlugin,
    DcrReportPlugin,
  ],
  exports: [ReportEngineService],
})
export class ReportsModule {}
