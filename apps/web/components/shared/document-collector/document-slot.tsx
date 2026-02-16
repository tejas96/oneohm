'use client';

/**
 * DocumentSlot Component
 *
 * Individual document upload slot with preview, progress, and actions.
 * Supports drag & drop and file selection.
 *
 * @module shared/document-collector
 */

import {
  AlertCircle,
  Check,
  FileText,
  RefreshCw,
  Replace,
  Trash2,
  Upload,
} from 'lucide-react';
import * as React from 'react';

import { ACCEPTED_FILE_TYPES, formatFileSize, MAX_FILE_SIZE } from './constants';
import type { CapturedDocument, DocumentSlot as DocumentSlotType } from './types';

import { Button, showToast } from '@/components/ui';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

interface DocumentSlotProps {
  /** Slot configuration */
  slot: DocumentSlotType;
  /** Captured document if any */
  document?: CapturedDocument;
  /** Callback when file is selected */
  onFileSelect: (slotId: string, file: File) => void;
  /** Callback to remove document */
  onRemove: (slotId: string) => void;
  /** Callback to retry upload */
  onRetry?: (slotId: string) => void;
  /** Whether slot is disabled */
  disabled?: boolean;
  /** Additional class names */
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

  const handleClick = () => {
    if (!disabled && !document) {
      fileInputRef.current?.click();
    }
  };

  const handleReplace = () => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      validateAndSelect(file);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const validateAndSelect = (file: File) => {
    // Validate file type
    if (!ACCEPTED_FILE_TYPES.all.includes(file.type)) {
      showToast.error('Please upload an image (JPEG, PNG) or PDF file');
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      showToast.error('File size must be less than 5MB');
      return;
    }

    onFileSelect(slot.id, file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled && !document) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (disabled || document) return;

    const file = e.dataTransfer.files[0];
    if (file) {
      validateAndSelect(file);
    }
  };

  // Render states
  const isUploading = document?.status === 'uploading';
  const isSuccess = document?.status === 'success';
  const isError = document?.status === 'error';
  const isPending = document?.status === 'pending';

  const renderContent = () => {
    // No document - show upload prompt
    if (!document) {
      return (
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <div
            className={cn(
              'size-container-lg rounded-full flex items-center justify-center mb-3 transition-colors',
              isDragging
                ? 'bg-primary/20 text-primary'
                : 'bg-background-secondary text-foreground-tertiary'
            )}
          >
            <Upload className="size-icon" />
          </div>
          <p className="text-sm font-medium text-foreground mb-1">{slot.label}</p>
          {slot.description && (
            <p className="text-xs text-foreground-tertiary">{slot.description}</p>
          )}
          <p className="text-xs text-foreground-muted mt-2">
            Click or drag to upload
          </p>
        </div>
      );
    }

    // Has document - show preview/status
    const isImage = document.mimeType.startsWith('image/');

    return (
      <div className="flex items-start gap-3 p-3">
        {/* Preview */}
        <div className="relative size-container-xl rounded-lg overflow-hidden bg-background-secondary flex-shrink-0">
          {isImage ? (
            <img
              src={document.previewUrl}
              alt={document.fileName}
              className="size-full object-cover"
            />
          ) : (
            <div className="size-full flex items-center justify-center">
              <FileText className="size-icon-lg text-foreground-tertiary" />
            </div>
          )}

          {/* Upload progress overlay */}
          {isUploading && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <div className="text-white text-xs font-medium">{document.progress}%</div>
            </div>
          )}

          {/* Success indicator */}
          {isSuccess && (
            <div className="absolute bottom-1 right-1 size-icon-md rounded-full bg-success flex items-center justify-center">
              <Check className="size-icon-2xs text-white" />
            </div>
          )}

          {/* Error indicator */}
          {isError && (
            <div className="absolute bottom-1 right-1 size-icon-md rounded-full bg-error flex items-center justify-center">
              <AlertCircle className="size-icon-2xs text-white" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">
            {slot.label}
          </p>
          <p className="text-xs text-foreground-secondary truncate">
            {document.fileName}
          </p>
          <p className="text-xs text-foreground-tertiary">
            {formatFileSize(document.fileSize)}
          </p>

          {/* Progress bar */}
          {isUploading && (
            <div className="mt-2 h-1.5 bg-background-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${document.progress}%` }}
              />
            </div>
          )}

          {/* Error message */}
          {isError && (
            <p className="text-xs text-error mt-1">{document.error}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-1">
          {isError && onRetry && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="size-container-sm p-0"
              onClick={() => onRetry(slot.id)}
              title="Retry upload"
            >
              <RefreshCw className="size-icon-sm" />
            </Button>
          )}
          {/* Replace button - allows selecting a different file */}
          {!isUploading && (isSuccess || isError || isPending) && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="size-container-sm p-0 text-foreground-tertiary hover:text-primary"
              onClick={handleReplace}
              title="Replace file"
            >
              <Replace className="size-icon-sm" />
            </Button>
          )}
          {!isUploading && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="size-container-sm p-0 text-foreground-tertiary hover:text-error"
              onClick={() => onRemove(slot.id)}
              title="Remove file"
            >
              <Trash2 className="size-icon-sm" />
            </Button>
          )}
        </div>
      </div>
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!disabled && !document && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      fileInputRef.current?.click();
    }
  };

  return (
    <div
      role={!document ? 'button' : undefined}
      tabIndex={!document && !disabled ? 0 : undefined}
      className={cn(
        'relative rounded-lg border-2 border-dashed transition-all cursor-pointer',
        !document && !disabled && 'hover:border-primary/50 hover:bg-primary/5',
        !document && !disabled && 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
        isDragging && 'border-primary bg-primary/10',
        document && 'border-solid cursor-default',
        isSuccess && 'border-success/30 bg-success/5',
        isError && 'border-error/30 bg-error/5',
        isPending && 'border-border-light',
        isUploading && 'border-primary/30 bg-primary/5',
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
        <span className="absolute top-2 right-2 text-[10px] font-medium text-error">
          Required
        </span>
      )}

      {renderContent()}
    </div>
  );
}
