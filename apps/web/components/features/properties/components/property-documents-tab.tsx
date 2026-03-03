'use client';

import { FileText, Upload } from 'lucide-react';
import { useCallback, useMemo, useState, type JSX } from 'react';

import { DocumentPreviewModal } from '@/components/features/customers/components/document-preview-modal';
import {
  DocumentRow,
  type AggregatedDocument,
} from '@/components/features/customers/components/document-row';
import { UploadDocumentModal } from '@/components/features/customers/components/upload-document-modal';
import {
  type CustomerPropertyResponse,
  useDocumentPreview,
  useRemovePropertyDocument,
} from '@/components/features/customers/hooks';
import { EmptyState } from '@/components/shared/feedback/empty-state';
import { Button, showToast } from '@/components/ui';

interface PropertyDocumentsTabProps {
  property: CustomerPropertyResponse;
}

export function PropertyDocumentsTab({ property }: PropertyDocumentsTabProps): JSX.Element {
  const [uploadOpen, setUploadOpen] = useState(false);
  const [deletingUrl, setDeletingUrl] = useState<string | null>(null);

  const { previewDocument, isPreviewOpen, openPreview, closePreview, downloadToSystem } =
    useDocumentPreview();

  const { mutate: removeDocumentMutate } = useRemovePropertyDocument();

  const documents = useMemo<AggregatedDocument[]>(
    () =>
      (property.documents ?? []).map((doc) => ({
        url: doc.url,
        fileName: doc.fileName,
        tag: doc.tag,
        fileSize: doc.fileSize,
        uploadedAt: doc.uploadedAt,
        isLoanDoc: doc.isLoanDoc,
        propertyId: property.id,
        propertyName: property.propertyName || 'Unnamed Property',
      })),
    [property.documents, property.id, property.propertyName],
  );

  const handleDelete = useCallback(
    (doc: AggregatedDocument) => {
      setDeletingUrl(doc.url);
      removeDocumentMutate(
        { propertyId: property.id, documentUrl: doc.url },
        {
          onSuccess: () => {
            showToast.success('Document deleted');
            setDeletingUrl(null);
          },
          onError: () => {
            showToast.error('Failed to delete document');
            setDeletingUrl(null);
          },
        },
      );
    },
    [property.id, removeDocumentMutate],
  );

  if (documents.length === 0) {
    return (
      <>
        <EmptyState
          icon={<FileText className="w-full h-full" />}
          title="No documents yet"
          description="Upload property documents like electricity bills, site photos, or loan paperwork."
          action={{
            label: 'Upload Document',
            onClick: () => setUploadOpen(true),
            icon: <Upload className="size-icon-sm" />,
          }}
        />
        <UploadDocumentModal
          open={uploadOpen}
          onOpenChange={setUploadOpen}
          properties={[property]}
          defaultPropertyId={property.id}
        />
      </>
    );
  }

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-foreground-secondary">
          {documents.length} document{documents.length !== 1 ? 's' : ''}
        </p>
        <Button variant="outline" size="sm" onClick={() => setUploadOpen(true)}>
          <Upload className="mr-2 size-icon-sm" />
          Upload
        </Button>
      </div>

      <div className="space-y-2">
        {documents.map((doc) => (
          <DocumentRow
            key={doc.url}
            document={doc}
            onPreview={openPreview}
            onDownload={downloadToSystem}
            onDelete={handleDelete}
            isDeleting={deletingUrl === doc.url}
          />
        ))}
      </div>

      <UploadDocumentModal
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        properties={[property]}
        defaultPropertyId={property.id}
      />

      <DocumentPreviewModal
        document={previewDocument}
        open={isPreviewOpen}
        onOpenChange={() => closePreview()}
        onDownload={downloadToSystem}
      />
    </div>
  );
}
