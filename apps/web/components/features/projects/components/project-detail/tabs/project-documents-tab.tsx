'use client';

import { DocumentEntityType } from '@oneohm-epc/shared/types';
import React from 'react';

import { DocumentManager } from '@/components/shared/document-manager';

interface ProjectDocumentsTabProps {
  projectId: string;
}

export const ProjectDocumentsTab = React.memo(
  ({ projectId }: ProjectDocumentsTabProps): React.JSX.Element => {
    return (
      <DocumentManager
        entityType={DocumentEntityType.PROJECT}
        entityId={projectId}
        title="Project Documents"
        description="Upload project documents to keep everything organized."
      />
    );
  },
);
