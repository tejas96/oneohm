'use client';

/**
 * Upload Document Modal
 *
 * Modal for uploading documents to a specific property.
 * Features property selection, document type selection, drag-and-drop file upload,
 * and upload progress tracking.
 *
 * UI only - upload logic lives in useDocumentUpload hook.
 *
 * @module features/customers/components/upload-document-modal
 */

import { Upload } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';

import { DOCUMENT_TYPE_OPTIONS } from '../constants';
import { type CustomerPropertyResponse , useDocumentUpload } from '../hooks';

import { formatFileSize } from '@/components/shared/document-collector/constants';
import {
  Button,
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
  Progress,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

interface UploadDocumentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  properties: CustomerPropertyResponse[];
}

// ============================================================================
// Component
// ============================================================================

export function UploadDocumentModal({
  open,
  onOpenChange,
  properties,
}: UploadDocumentModalProps): React.JSX.Element {
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('');
  const [selectedDocType, setSelectedDocType] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    uploadProgress,
    isUploading,
    validateFile,
    uploadDocument,
    resetUploadState,
  } = useDocumentUpload();

  const resetForm = useCallback(() => {
    setSelectedPropertyId('');
    setSelectedDocType('');
    setSelectedFile(null);
    setIsDragOver(false);
    resetUploadState();
  }, [resetUploadState]);

  const handleClose = useCallback(
    (isOpen: boolean) => {
      if (!isOpen) {
        resetForm();
      }
      onOpenChange(isOpen);
    },
    [onOpenChange, resetForm],
  );

  const handleFileSelect = useCallback(
    (file: File) => {
      if (validateFile(file)) {
        setSelectedFile(file);
      }
    },
    [validateFile],
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFileSelect(file);
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [handleFileSelect],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) {
        handleFileSelect(file);
      }
    },
    [handleFileSelect],
  );

  const handleUpload = useCallback(async () => {
    if (!selectedPropertyId || !selectedDocType || !selectedFile) return;

    const success = await uploadDocument({
      propertyId: selectedPropertyId,
      docType: selectedDocType,
      file: selectedFile,
    });

    if (success) {
      handleClose(false);
    }
  }, [selectedPropertyId, selectedDocType, selectedFile, uploadDocument, handleClose]);

  const canUpload =
    selectedPropertyId && selectedDocType && selectedFile && !isUploading;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Upload Document</DialogTitle>
        </DialogHeader>

        <DialogBody className="space-y-4">
          {/* Property Selector */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Property <span className="text-error">*</span>
            </Label>
            <Select
              value={selectedPropertyId}
              onValueChange={setSelectedPropertyId}
              disabled={isUploading}
            >
              <SelectTrigger className="h-input-md">
                <SelectValue placeholder="Select property" />
              </SelectTrigger>
              <SelectContent className="z-popover">
                {properties.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.propertyName || p.address || 'Unnamed Property'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Document Type Selector */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Document Type <span className="text-error">*</span>
            </Label>
            <Select
              value={selectedDocType}
              onValueChange={setSelectedDocType}
              disabled={isUploading}
            >
              <SelectTrigger className="h-input-md">
                <SelectValue placeholder="Select document type" />
              </SelectTrigger>
              <SelectContent className="z-popover">
                {DOCUMENT_TYPE_OPTIONS.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* File Drop Zone */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              File <span className="text-error">*</span>
            </Label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.pdf"
              onChange={handleInputChange}
              className="hidden"
              disabled={isUploading}
              aria-label="Select file to upload"
            />
            <div
              className={cn(
                'flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors',
                isDragOver
                  ? 'border-primary bg-primary/5'
                  : 'border-border-light hover:border-primary/50',
                isUploading && 'pointer-events-none opacity-50',
              )}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  fileInputRef.current?.click();
                }
              }}
            >
              {selectedFile ? (
                <div className="text-center">
                  <p className="text-sm font-medium text-foreground">
                    {selectedFile.name}
                  </p>
                  <p className="mt-1 text-xs text-foreground-secondary">
                    {formatFileSize(selectedFile.size)} &middot; Click to change
                  </p>
                </div>
              ) : (
                <div className="text-center">
                  <Upload className="mx-auto size-icon-lg text-foreground-muted" />
                  <p className="mt-2 text-sm text-foreground-secondary">
                    Drag and drop or click to upload
                  </p>
                  <p className="mt-1 text-xs text-foreground-muted">
                    JPEG, PNG, PDF up to 5MB
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Upload Progress */}
          {isUploading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-foreground-secondary">
                <span>Uploading...</span>
                <span>{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="h-1.5" />
            </div>
          )}
        </DialogBody>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleClose(false)}
            disabled={isUploading}
          >
            Cancel
          </Button>
          <Button onClick={handleUpload} disabled={!canUpload}>
            {isUploading ? 'Uploading...' : 'Upload'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
