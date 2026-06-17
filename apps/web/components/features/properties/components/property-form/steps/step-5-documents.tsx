'use client';

import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import { Card } from '@mui/material';
import { DocumentEntityType, DocumentTag, PropertyStatus } from '@oneohm-epc/shared/types';
import * as React from 'react';

import { type CustomerPropertyResponse } from '../../../hooks';

import { DocumentManager, type DraftDocument } from '@/components/shared/document-manager';
import { MUITypography } from '@/components/ui';

interface Step5DocumentsProps {
  isEditMode: boolean;
  propertyId?: string;
  initialData?: CustomerPropertyResponse;
  isSubmitting: boolean;
  handleDraftDocsChange: (docs: DraftDocument[]) => void;
}

export function Step5Documents({
  isEditMode,
  propertyId,
  initialData,
  isSubmitting,
  handleDraftDocsChange,
}: Step5DocumentsProps): React.JSX.Element {
  const showDocumentManager = !isEditMode || initialData?.status !== PropertyStatus.CONVERTED;

  if (!showDocumentManager) {
    return (
      <div className="p-4 text-center rounded-lg border border-border bg-background-secondary">
        <MUITypography variant="body" className="text-foreground-secondary">
          Documents cannot be managed for converted properties.
        </MUITypography>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card variant="outlined">
        <div className="flex items-center gap-3 px-5 py-3 border-b border-border-light">
          <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 text-primary">
            <DescriptionOutlinedIcon fontSize="small" />
          </div>
          <div className="flex-1 min-w-0">
            <MUITypography variant="sectionTitle">Property Documents</MUITypography>
            <MUITypography variant="body">
              Upload utility bills, site layouts, and structural photos. (Financing documents should
              be uploaded in the Financing step.)
            </MUITypography>
          </div>
        </div>
        <DocumentManager
          entityType={DocumentEntityType.PROPERTY}
          entityId={isEditMode && propertyId ? propertyId : undefined}
          propertyId={isEditMode ? propertyId : undefined}
          title="Property Documents"
          description="Upload electricity bills, site photos, work completion reports, or other property files."
          allowedTags={[
            DocumentTag.ELECTRICITY_BILL,
            DocumentTag.SITE_IMAGE,
            DocumentTag.FRONT_VIEW,
            DocumentTag.ROOF_VIEW,
            DocumentTag.METER_BOX,
            DocumentTag.ANNEXURE_PROFORMA_A,
            DocumentTag.NET_METERING_AGREEMENT,
            DocumentTag.WCR,
            DocumentTag.DCR,
            DocumentTag.OTHER,
          ]}
          readOnly={isSubmitting}
          disableEntityTypeSelector={true}
          onDraftDocumentsChange={!isEditMode ? handleDraftDocsChange : undefined}
        />
      </Card>
    </div>
  );
}
