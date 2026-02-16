'use client';

/**
 * DocumentCollector Component
 *
 * Manages multiple document upload slots for loan/KYC documents.
 * Includes predefined slots + option to add additional documents.
 *
 * @module shared/document-collector
 */

import { Plus } from 'lucide-react';
import * as React from 'react';

import { getDocumentSlots, ACCEPTED_FILE_TYPES, MAX_FILE_SIZE } from './constants';
import { DocumentSlot } from './document-slot';
import type { CapturedDocument, DocumentSlot as DocumentSlotType } from './types';

import { Button, Label, showToast } from '@/components/ui';
import { deleteFile } from '@/lib/api/storage';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

export interface DocumentCollectorProps {
  /** Whether customer wants loan financing */
  wantsLoan: boolean;
  /** Current documents */
  documents: CapturedDocument[];
  /** Callback when documents change */
  onDocumentsChange: (documents: CapturedDocument[]) => void;
  /** Whether component is disabled */
  disabled?: boolean;
  /** Additional class names */
  className?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

function generateId(): string {
  return `doc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function createDocumentFromFile(file: File, slotId: string): CapturedDocument {
  return {
    id: generateId(),
    file,
    slotId,
    fileName: file.name,
    fileSize: file.size,
    mimeType: file.type,
    previewUrl: URL.createObjectURL(file),
    status: 'pending',
    progress: 0,
  };
}

// ============================================================================
// Component
// ============================================================================

export function DocumentCollector({
  wantsLoan,
  documents,
  onDocumentsChange,
  disabled = false,
  className,
}: DocumentCollectorProps): React.JSX.Element {
  const additionalFileInputRef = React.useRef<HTMLInputElement>(null);
  const [additionalDocCounter, setAdditionalDocCounter] = React.useState(1);

  // Get slots with dynamic required status
  const slots = React.useMemo(() => getDocumentSlots(wantsLoan), [wantsLoan]);

  // Get document by slot ID
  const getDocBySlot = React.useCallback(
    (slotId: string): CapturedDocument | undefined => {
      return documents.find((d) => d.slotId === slotId);
    },
    [documents]
  );

  // Get additional documents (not in predefined slots)
  const additionalDocs = React.useMemo(() => {
    const slotIds = slots.map((s) => s.id);
    return documents.filter((d) => !slotIds.includes(d.slotId));
  }, [documents, slots]);

  // Handle file selection for a slot
  const handleFileSelect = React.useCallback(
    (slotId: string, file: File) => {
      const newDoc = createDocumentFromFile(file, slotId);
      
      // Revoke blob URL of existing document in same slot (prevent memory leak)
      const existingDoc = documents.find((d) => d.slotId === slotId);
      if (existingDoc?.previewUrl) {
        URL.revokeObjectURL(existingDoc.previewUrl);
      }
      
      // Remove existing document in same slot
      const filtered = documents.filter((d) => d.slotId !== slotId);
      onDocumentsChange([...filtered, newDoc]);
    },
    [documents, onDocumentsChange]
  );

  // Handle file removal
  const handleRemove = React.useCallback(
    async (slotId: string) => {
      const doc = documents.find((d) => d.slotId === slotId);
      if (!doc) return;

      // Revoke blob URL
      if (doc.previewUrl) {
        URL.revokeObjectURL(doc.previewUrl);
      }

      // Delete from storage if uploaded
      if (doc.fileKey) {
        try {
          await deleteFile(doc.fileKey);
        } catch {
          // Ignore delete errors
        }
      }

      onDocumentsChange(documents.filter((d) => d.slotId !== slotId));
    },
    [documents, onDocumentsChange]
  );

  // Handle retry upload
  const handleRetry = React.useCallback(
    async (slotId: string) => {
      const doc = documents.find((d) => d.slotId === slotId);
      if (!doc) return;

      // Reset status and trigger re-upload
      onDocumentsChange(
        documents.map((d) =>
          d.slotId === slotId ? { ...d, status: 'pending' as const, error: undefined } : d
        )
      );
    },
    [documents, onDocumentsChange]
  );

  // Handle additional document selection
  const handleAdditionalFileSelect = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Validate
      if (!ACCEPTED_FILE_TYPES.all.includes(file.type)) {
        showToast.error('Please upload an image (JPEG, PNG) or PDF file');
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        showToast.error('File size must be less than 5MB');
        return;
      }

      // Create with unique slot ID
      const slotId = `other_${additionalDocCounter}`;
      setAdditionalDocCounter((c) => c + 1);

      const newDoc = createDocumentFromFile(file, slotId);
      onDocumentsChange([...documents, newDoc]);

      // Reset input
      if (additionalFileInputRef.current) {
        additionalFileInputRef.current.value = '';
      }
    },
    [documents, onDocumentsChange, additionalDocCounter]
  );

  // Check if all required documents are present
  const hasRequiredDocuments = React.useMemo(() => {
    if (!wantsLoan) return true;
    const requiredSlots = slots.filter((s) => s.required);
    return requiredSlots.every((slot) => {
      const doc = getDocBySlot(slot.id);
      return doc && (doc.status === 'success' || doc.status === 'pending');
    });
  }, [wantsLoan, slots, getDocBySlot]);

  return (
    <div className={cn('space-y-4', className)}>
      {/* Predefined slots grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {slots.map((slot) => (
          <DocumentSlot
            key={slot.id}
            slot={slot}
            document={getDocBySlot(slot.id)}
            onFileSelect={handleFileSelect}
            onRemove={handleRemove}
            onRetry={handleRetry}
            disabled={disabled}
          />
        ))}
      </div>

      {/* Additional documents */}
      {additionalDocs.length > 0 && (
        <div className="space-y-2">
          <Label className="text-xs text-foreground-secondary">
            Additional Documents
          </Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {additionalDocs.map((doc) => {
              const slot: DocumentSlotType = {
                id: doc.slotId,
                label: 'Other Document',
                required: false,
              };
              return (
                <DocumentSlot
                  key={doc.id}
                  slot={slot}
                  document={doc}
                  onFileSelect={handleFileSelect}
                  onRemove={handleRemove}
                  onRetry={handleRetry}
                  disabled={disabled}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Add more button */}
      <div className="flex justify-center">
        <input
          ref={additionalFileInputRef}
          type="file"
          accept={ACCEPTED_FILE_TYPES.all.join(',')}
          onChange={handleAdditionalFileSelect}
          className="hidden"
          disabled={disabled}
          aria-label="Upload additional document"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => additionalFileInputRef.current?.click()}
          disabled={disabled}
          className="gap-2"
        >
          <Plus className="size-icon-sm" />
          Add Another Document
        </Button>
      </div>

      {/* Validation message */}
      {wantsLoan && !hasRequiredDocuments && (
        <p className="text-xs text-error text-center">
          Aadhaar Card is required for loan financing
        </p>
      )}
    </div>
  );
}
