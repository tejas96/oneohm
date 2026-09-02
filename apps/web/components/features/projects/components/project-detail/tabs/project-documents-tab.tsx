'use client';

import { DocumentEntityType } from '@tejas96/shared/types';
import React from 'react';

import { Mono, Overline } from '../primitives';

import { useDocumentsByProperty } from '@/components/features/documents/hooks';
import { PropertyDocumentHub } from '@/components/shared/document-manager';

interface ProjectDocumentsTabProps {
  projectId: string;
  propertyId: string;
}

/**
 * Every file filed against this site, grouped by what it belongs to.
 *
 * The hub itself is shared verbatim with the customer and property pages, so
 * it is deliberately not restyled here — the three screens must show documents
 * identically, and a project-only skin would be the first crack in that. This
 * tab adds the page's own section heading above it and nothing else.
 *
 * Uploads default to the PROJECT entity type so a file added from this tab is
 * filed against the project rather than the site.
 */
export const ProjectDocumentsTab = React.memo(
  ({ projectId, propertyId }: ProjectDocumentsTabProps): React.JSX.Element => {
    // Same query key as the hub below, so react-query serves both from one
    // request. This is only for the count in the heading.
    const { data: documents } = useDocumentsByProperty(propertyId);
    const count = documents?.length ?? 0;

    return (
      <section>
        <div className="flex items-baseline gap-2.5 px-1 pb-3">
          <Overline>Documents</Overline>
          {documents ? (
            <span className="text-[11.5px] text-foreground-tertiary">
              <Mono>{count}</Mono> filed against this site
            </span>
          ) : null}
        </div>

        <PropertyDocumentHub
          propertyId={propertyId}
          allowUpload
          defaultUploadEntityType={DocumentEntityType.PROJECT}
          defaultUploadEntityId={projectId}
        />
      </section>
    );
  },
);

ProjectDocumentsTab.displayName = 'ProjectDocumentsTab';
