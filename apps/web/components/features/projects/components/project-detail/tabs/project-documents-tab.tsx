'use client';

import { FileText, FolderOpen } from 'lucide-react';
import React, { useMemo } from 'react';

import { DOCUMENT_CATEGORY_COLORS, DOCUMENT_CATEGORY_MAP } from '../../../constants';
import type { ProjectDocument } from '../../../hooks/types';
import { useDocumentDownload } from '../../../hooks/use-document-download';
import { useProjectDocuments } from '../../../hooks/use-project-documents';

import { EmptyState, ErrorState } from '@/components/shared/feedback/empty-state';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { showToast } from '@/components/ui/sonner';
import { getErrorMessage } from '@/lib/utils/error';
import { formatDate } from '@/lib/utils/format';


interface ProjectDocumentsTabProps {
  projectId: string;
  isActive: boolean;
}

export const ProjectDocumentsTab = React.memo(({
  projectId,
  isActive,
}: ProjectDocumentsTabProps): React.JSX.Element => {
  const { data: documents, isLoading, isError, error, refetch } = useProjectDocuments(projectId, { enabled: isActive });
  const { download: handleDownload } = useDocumentDownload();

  const grouped = useMemo(() => {
    if (!documents) return {};
    const groups: Record<string, ProjectDocument[]> = {};
    for (const doc of documents) {
      const category = DOCUMENT_CATEGORY_MAP[doc.documentType] ?? 'Other';
      if (!groups[category]) groups[category] = [];
      groups[category].push(doc);
    }
    return groups;
  }, [documents]);

  if (isLoading && isActive) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-lg" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorState
        title="Failed to load documents"
        description={getErrorMessage(error)}
        onRetry={() => refetch()}
      />
    );
  }

  if (!documents || documents.length === 0) {
    return (
      <EmptyState
        icon={<FileText className="w-full h-full" />}
        iconColor="muted"
        title="No documents uploaded"
        description="Upload project documents to keep everything organized."
        action={{
          label: 'Upload Document',
          onClick: () => showToast.info('Coming Soon'),
        }}
      />
    );
  }

  const categories = Object.keys(grouped);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground">Project Documents</h3>
        <Button size="sm" onClick={() => showToast.info('Coming Soon')}>
          + Upload Document
        </Button>
      </div>
      <div className="space-y-4">
        {categories.map((category) => {
          const colors = DOCUMENT_CATEGORY_COLORS[category] ?? DOCUMENT_CATEGORY_COLORS['Other'];
          return (
            <div key={category}>
              <h4 className="text-2xs font-semibold text-foreground-secondary uppercase mb-2 flex items-center gap-2">
                <span className={`size-5 rounded flex items-center justify-center ${colors?.bg}`}>
                  <FolderOpen className={`size-3 ${colors?.text}`} />
                </span>
                {category}
              </h4>
              <div className="bg-background-secondary rounded-lg divide-y divide-border-light">
                {(grouped[category] ?? []).map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-3"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FileText className={`size-5 shrink-0 ${colors?.text ?? 'text-foreground-muted'}`} />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">{doc.fileName}</p>
                        <p className="text-2xs text-foreground-tertiary">
                          {formatDate(doc.createdAt, 'medium')}
                          {doc.fileSize ? ` · ${(doc.fileSize / 1024).toFixed(0)} KB` : ''}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDownload(doc.filePath)}
                      className="text-2xs text-primary font-medium hover:underline cursor-pointer shrink-0"
                    >
                      Download
                    </button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});
