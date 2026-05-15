'use client';

import { DocumentEntityType } from '@oneohm-epc/shared/types';
import React from 'react';

import { PropertyDocumentHub } from '@/components/shared/document-manager';

interface ProjectDocumentsTabProps {
  projectId: string;
  propertyId: string;
}

export const ProjectDocumentsTab = React.memo(
  ({ projectId, propertyId }: ProjectDocumentsTabProps): React.JSX.Element => {
    return (
      <PropertyDocumentHub
        propertyId={propertyId}
        allowUpload
        defaultUploadEntityType={DocumentEntityType.PROJECT}
        defaultUploadEntityId={projectId}
      />
    );
  },
);
