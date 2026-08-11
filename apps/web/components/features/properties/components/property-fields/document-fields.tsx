'use client';

import { DocumentEntityType, DocumentTag, PropertyStatus } from '@tejas96/shared/types';
import * as React from 'react';

import { type CustomerPropertyResponse } from '../../hooks';

import { DocumentManager, type DraftDocument } from '@/components/shared/document-manager';
import { MUITypography } from '@/components/ui';

interface DocumentFieldsProps {
  isEditMode: boolean;
  propertyId?: string;
  initialData?: CustomerPropertyResponse;
  isSubmitting: boolean;
  handleDraftDocsChange: (docs: DraftDocument[]) => void;
}

/** Property document uploads. Card chrome is supplied by the wizard's StepCard. */
export function DocumentFields({
  isEditMode,
  propertyId,
  initialData,
  isSubmitting,
  handleDraftDocsChange,
}: DocumentFieldsProps): React.JSX.Element {
  const showDocumentManager = !isEditMode || initialData?.status !== PropertyStatus.CONVERTED;

  if (!showDocumentManager) {
    return (
      <div className="p-4 text-center rounded-lg bg-background-secondary">
        <MUITypography variant="body" className="text-foreground-secondary">
          Documents cannot be managed for converted properties.
        </MUITypography>
      </div>
    );
  }

  return (
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
        DocumentTag.PANEL_STRUCTURE_INSTALLATION_VIEW,
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
  );
}
