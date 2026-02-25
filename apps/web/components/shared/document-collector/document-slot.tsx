'use client';

/**
 * DocumentSlot Component
 *
 * Individual document upload slot with full-bleed preview, clear actions,
 * and a lightbox modal for viewing/downloading.
 *
 * @module shared/document-collector
 */

import {
  AlertCircle,
  Check,
  Download,
  Expand,
  FileText,
  RefreshCw,
  Replace,
  Trash2,
  Upload,
} from 'lucide-react';
import * as React from 'react';

import { ACCEPTED_FILE_TYPES, formatFileSize, MAX_FILE_SIZE } from './constants';
import type { CapturedDocument, DocumentSlot as DocumentSlotType } from './types';

import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  showToast,
} from '@/components/ui';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

interface DocumentSlotProps {
  slot: DocumentSlotType;
  document?: CapturedDocument;
  onFileSelect: (slotId: string, file: File) => void;
  onRemove: (slotId: string) => void | Promise<void>;
  onRetry?: (slotId: string) => void | Promise<void>;
  disabled?: boolean;
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export function DocumentSlot({
  slot,
  document,
  onFileSelect,
  onRemove,
  onRetry,
  disabled = false,
  className,
}: DocumentSlotProps): React.JSX.Element {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = React.useState(false);

  const handleClick = (): void => {
    if (!disabled && !document) {
      fileInputRef.current?.click();
    }
  };

  const handleReplace = (): void => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (file) {
      validateAndSelect(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const validateAndSelect = (file: File): void => {
    if (!ACCEPTED_FILE_TYPES.all.includes(file.type)) {
      showToast.error('Please upload an image (JPEG, PNG) or PDF file');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      showToast.error('File size must be less than 5MB');
      return;
    }
    onFileSelect(slot.id, file);
  };

  const handleDragOver = (e: React.DragEvent): void => {
    e.preventDefault();
    if (!disabled && !document) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent): void => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent): void => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled || document) return;
    const file = e.dataTransfer.files[0];
    if (file) {
      validateAndSelect(file);
    }
  };

  const handleDownload = (): void => {
    if (!document?.previewUrl) return;
    const a = window.document.createElement('a');
    a.href = document.uploadedUrl ?? document.previewUrl;
    a.download = document.fileName;
    window.document.body.appendChild(a);
    a.click();
    window.document.body.removeChild(a);
  };

  const isUploading = document?.status === 'uploading';
  const isSuccess = document?.status === 'success';
  const isError = document?.status === 'error';
  const isPending = document?.status === 'pending';
  const isImage = document?.mimeType.startsWith('image/');

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (!disabled && !document && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      fileInputRef.current?.click();
    }
  };

  return (
    <>
      <div
        role={!document ? 'button' : undefined}
        tabIndex={!document && !disabled ? 0 : undefined}
        className={cn(
          'relative rounded-lg border-2 transition-all overflow-hidden',
          !document && 'border-dashed cursor-pointer',
          !document && !disabled && 'hover:border-primary/50 hover:bg-primary/5',
          !document && !disabled && 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
          isDragging && 'border-primary bg-primary/10',
          document && 'border-solid cursor-default',
          isSuccess && 'border-success/30',
          isError && 'border-error/30',
          isPending && 'border-border-light',
          isUploading && 'border-primary/30',
          disabled && 'opacity-50 cursor-not-allowed',
          className
        )}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_FILE_TYPES.all.join(',')}
          onChange={handleFileChange}
          className="hidden"
          disabled={disabled}
          aria-label={`Upload ${slot.label}`}
        />

        {/* Required badge */}
        {slot.required && !document && (
          <span className="absolute top-2 right-2 z-10 text-[10px] font-medium text-error bg-error/10 px-1.5 py-0.5 rounded">
            Required
          </span>
        )}

        {!document ? renderEmptySlot() : renderFilledSlot()}
      </div>

      {/* Preview Modal */}
      {document && isImage && (
        <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
          <DialogContent className="max-w-2xl p-0 overflow-hidden">
            <DialogHeader className="px-5 pt-5 pb-3">
              <div className="flex items-center justify-between">
                <div className="min-w-0 pr-8">
                  <DialogTitle className="text-sm font-semibold truncate">
                    {slot.label}
                  </DialogTitle>
                  <p className="text-xs text-foreground-secondary mt-0.5 truncate">
                    {document.fileName} &middot; {formatFileSize(document.fileSize)}
                  </p>
                </div>
              </div>
            </DialogHeader>
            <div className="px-5 pb-3">
              <div className="rounded-lg overflow-hidden bg-background-secondary">
                <img
                  src={document.uploadedUrl ?? document.previewUrl}
                  alt={document.fileName}
                  className="w-full h-auto max-h-[70vh] object-contain"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 px-5 pb-5 pt-1">
              <Button type="button" variant="outline" size="sm" onClick={handleDownload}>
                <Download className="size-icon-sm mr-1.5" />
                Download
              </Button>
              <DialogClose asChild>
                <Button type="button" variant="ghost" size="sm">
                  Close
                </Button>
              </DialogClose>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );

  // ============================================================================
  // Private render helpers
  // ============================================================================

  function renderEmptySlot(): React.JSX.Element {
    return (
      <div className="flex flex-col items-center justify-center h-[150px] px-4 text-center">
        <div
          className={cn(
            'size-10 rounded-full flex items-center justify-center mb-3 transition-colors',
            isDragging
              ? 'bg-primary/20 text-primary'
              : 'bg-background-secondary text-foreground-tertiary'
          )}
        >
          <Upload className="size-icon-sm" />
        </div>
        <p className="text-sm font-medium text-foreground mb-0.5">{slot.label}</p>
        {slot.description && (
          <p className="text-xs text-foreground-tertiary mb-2">{slot.description}</p>
        )}
        <p className="text-xs text-foreground-muted">
          Click or drag &middot; JPG, PNG, PDF up to 5MB
        </p>
      </div>
    );
  }

  function renderFilledSlot(): React.JSX.Element {
    return (
      <div className="flex flex-col">
        {/* Preview area - full width */}
        <div className="relative w-full h-[150px] bg-background-secondary">
          {isImage ? (
            <img
              src={document!.previewUrl}
              alt={document!.fileName}
              className="size-full object-contain"
            />
          ) : (
            <div className="size-full flex flex-col items-center justify-center gap-2">
              <FileText className="size-icon-lg text-foreground-tertiary" />
              <span className="text-xs text-foreground-tertiary font-medium">PDF Document</span>
            </div>
          )}

          {/* Upload progress overlay */}
          {isUploading && (
            <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-2">
              <div className="text-white text-lg font-semibold">{document.progress}%</div>
              <div className="w-3/4 h-1.5 bg-white/30 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white rounded-full transition-all duration-300"
                  style={{ width: `${document.progress}%` }}
                />
              </div>
              <span className="text-white/80 text-xs">Uploading...</span>
            </div>
          )}

          {/* Status badge overlay */}
          {isSuccess && (
            <div className="absolute top-2 right-2 flex items-center gap-1 bg-success/90 text-white text-[10px] font-medium px-2 py-1 rounded-lg">
              <Check className="size-3" />
              Uploaded
            </div>
          )}
          {isError && (
            <div className="absolute top-2 right-2 flex items-center gap-1 bg-error/90 text-white text-[10px] font-medium px-2 py-1 rounded-lg">
              <AlertCircle className="size-3" />
              Failed
            </div>
          )}

          {/* Quick actions overlay (top-left) */}
          {!isUploading && isImage && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setIsPreviewOpen(true); }}
              className="absolute top-2 left-2 flex items-center gap-1 bg-black/60 hover:bg-black/80 text-white text-[10px] font-medium px-2 py-1 rounded-lg transition-colors"
              title="View full size"
            >
              <Expand className="size-3" />
              View
            </button>
          )}
        </div>

        {/* File info bar */}
        <div className="px-3 py-2.5 border-t border-border-light bg-card">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-foreground truncate">{slot.label}</p>
              <p className="text-[11px] text-foreground-secondary truncate">
                {document!.fileName} &middot; {formatFileSize(document!.fileSize)}
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-0.5 shrink-0">
              {isError && onRetry && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="size-7 p-0 text-foreground-tertiary hover:text-primary"
                  onClick={(e) => { e.stopPropagation(); void onRetry(slot.id); }}
                  title="Retry upload"
                >
                  <RefreshCw className="size-3.5" />
                </Button>
              )}
              {!isUploading && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="size-7 p-0 text-foreground-tertiary hover:text-primary"
                  onClick={(e) => { e.stopPropagation(); handleReplace(); }}
                  title="Replace file"
                >
                  <Replace className="size-3.5" />
                </Button>
              )}
              {!isUploading && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="size-7 p-0 text-foreground-tertiary hover:text-error"
                  onClick={(e) => { e.stopPropagation(); void onRemove(slot.id); }}
                  title="Remove file"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              )}
            </div>
          </div>

          {/* Error message */}
          {isError && document.error && (
            <p className="text-[11px] text-error mt-1 truncate">{document.error}</p>
          )}
        </div>
      </div>
    );
  }
}
