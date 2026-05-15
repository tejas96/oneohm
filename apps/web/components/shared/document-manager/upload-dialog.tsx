'use client';

import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { Box, Button, LinearProgress, Typography } from '@mui/material';
import { DOCUMENT_ENTITY_TYPE_OPTIONS } from '@oneohm-epc/shared/constants';
import { DocumentCategory, DocumentEntityType, DocumentTag } from '@oneohm-epc/shared/types';
import { useCallback, useRef, useState } from 'react';

import {
  DOCUMENT_TAG_OPTIONS,
  DOCUMENT_CATEGORY_OPTIONS,
  ACCEPTED_EXTENSIONS,
  ACCEPTED_MIME_TYPES,
  MAX_FILE_SIZE_BYTES,
} from './constants';
import { formatBytes } from './utils';

import {
  MUIDialog,
  MUIDialogHeader,
  MUIDialogTitle,
  MUIDialogBody,
  MUIDialogFooter,
  MUISelect,
  MUIInput,
  showToast,
} from '@/components/ui';

interface UploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpload: (params: {
    file: File;
    tag: string;
    category: DocumentCategory;
    entityType?: DocumentEntityType;
    onProgress: (percent: number) => void;
  }) => Promise<void>;
  /** If true, shows the entity type selector */
  showEntityTypeSelector?: boolean;
  /** Default selected entity type if selector is shown */
  defaultEntityType?: DocumentEntityType;
}

export function UploadDialog({
  open,
  onOpenChange,
  onUpload,
  showEntityTypeSelector = false,
  defaultEntityType,
}: UploadDialogProps): React.JSX.Element {
  const [tag, setTag] = useState('');
  const [customTag, setCustomTag] = useState('');
  const [category, setCategory] = useState<string>(DocumentCategory.DOCUMENT);
  const [entityType, setEntityType] = useState<DocumentEntityType | ''>(defaultEntityType ?? '');
  const [file, setFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isOtherTag = tag === (DocumentTag.OTHER as string);
  const resolvedTag = isOtherTag ? customTag.trim().toLowerCase().replace(/\s+/g, '_') : tag;

  const resetForm = useCallback(() => {
    setTag('');
    setCustomTag('');
    setCategory(DocumentCategory.DOCUMENT);
    if (showEntityTypeSelector) setEntityType(defaultEntityType ?? '');
    setFile(null);
    setIsDragOver(false);
    setIsUploading(false);
    setProgress(0);
  }, [showEntityTypeSelector, defaultEntityType]);

  const handleClose = useCallback(
    (isOpen: boolean) => {
      if (!isOpen) resetForm();
      onOpenChange(isOpen);
    },
    [onOpenChange, resetForm],
  );

  const validateFile = useCallback((f: File): boolean => {
    if (!ACCEPTED_MIME_TYPES.includes(f.type)) {
      showToast.error('Please upload an image (JPEG, PNG, WebP) or PDF file');
      return false;
    }
    if (f.size > MAX_FILE_SIZE_BYTES) {
      showToast.error('File size must be less than 5 MB');
      return false;
    }
    return true;
  }, []);

  const handleFileSelect = useCallback(
    (f: File) => {
      if (validateFile(f)) {
        setFile(f);
        if (f.type.startsWith('image/')) {
          setCategory(DocumentCategory.IMAGE);
        }
      }
    },
    [validateFile],
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (f) handleFileSelect(f);
      if (fileInputRef.current) fileInputRef.current.value = '';
    },
    [handleFileSelect],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const f = e.dataTransfer.files[0];
      if (f) handleFileSelect(f);
    },
    [handleFileSelect],
  );

  const handleUpload = useCallback(async () => {
    if (!file || !resolvedTag) return;
    setIsUploading(true);
    setProgress(5);

    try {
      await onUpload({
        file,
        tag: resolvedTag,
        category: category as DocumentCategory,
        ...(showEntityTypeSelector && entityType ? { entityType: entityType } : {}),
        onProgress: (percent) => setProgress(percent),
      });
      setProgress(100);
      handleClose(false);
    } catch {
      showToast.error('Failed to upload document. Please try again.');
    } finally {
      setIsUploading(false);
    }
  }, [file, resolvedTag, category, entityType, showEntityTypeSelector, onUpload, handleClose]);

  const canUpload =
    !!file &&
    !!resolvedTag &&
    !isUploading &&
    (!isOtherTag || customTag.trim().length > 0) &&
    (!showEntityTypeSelector || !!entityType);

  return (
    <MUIDialog open={open} onOpenChange={handleClose} size="sm">
      <MUIDialogHeader>
        <MUIDialogTitle>Upload Document</MUIDialogTitle>
      </MUIDialogHeader>

      <MUIDialogBody sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        {/* Entity Type Selector */}
        {showEntityTypeSelector && (
          <MUISelect
            fieldLabel="Group (Entity Type)"
            required
            value={entityType}
            onChange={(e) => setEntityType(e.target.value as DocumentEntityType)}
            disabled={isUploading}
            placeholder="Select a group..."
            options={[...DOCUMENT_ENTITY_TYPE_OPTIONS]}
          />
        )}

        {/* Tag / Document Type */}
        <MUISelect
          fieldLabel="Document Type"
          required
          value={tag}
          onChange={(e) => setTag(e.target.value as string)}
          disabled={isUploading}
          placeholder="Select document type"
          options={DOCUMENT_TAG_OPTIONS}
        />

        {/* Custom Tag Input (when "Other" selected) */}
        {isOtherTag && (
          <MUIInput
            fieldLabel="Custom Tag Name"
            required
            value={customTag}
            onChange={(e) => setCustomTag(e.target.value)}
            placeholder="e.g. Bank Statement, Warranty Card..."
            disabled={isUploading}
            slotProps={{ htmlInput: { maxLength: 100 } }}
            helperText="Enter a descriptive name for this document type"
          />
        )}

        {/* Category */}
        <MUISelect
          fieldLabel="Category"
          value={category}
          onChange={(e) => setCategory(e.target.value as string)}
          disabled={isUploading}
          options={DOCUMENT_CATEGORY_OPTIONS}
        />

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_EXTENSIONS}
          onChange={handleInputChange}
          style={{ display: 'none' }}
          disabled={isUploading}
          aria-label="Select file to upload"
        />

        {/* File Drop Zone */}
        <Box
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e: React.DragEvent) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={(e: React.DragEvent) => {
            e.preventDefault();
            setIsDragOver(false);
          }}
          onDrop={handleDrop}
          role="button"
          tabIndex={0}
          onKeyDown={(e: React.KeyboardEvent) => {
            if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click();
          }}
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            p: 3,
            borderRadius: 1.5,
            border: '2px dashed',
            borderColor: isDragOver ? 'primary.main' : 'divider',
            bgcolor: isDragOver ? 'primary.light' : 'transparent',
            opacity: isDragOver ? 0.1 : 1,
            cursor: isUploading ? 'not-allowed' : 'pointer',
            pointerEvents: isUploading ? 'none' : 'auto',
            transition: 'border-color 0.2s, background-color 0.2s',
            '&:hover': { borderColor: 'primary.main' },
          }}
        >
          {file ? (
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="body2" fontWeight={500}>
                {file.name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {formatBytes(file.size)} &middot; Click to change
              </Typography>
            </Box>
          ) : (
            <Box sx={{ textAlign: 'center' }}>
              <CloudUploadIcon sx={{ fontSize: 32, color: 'text.disabled', mb: 1 }} />
              <Typography variant="body2" color="text.secondary">
                Drag and drop or click to upload
              </Typography>
              <Typography variant="caption" color="text.disabled">
                JPEG, PNG, WebP, PDF up to 5 MB
              </Typography>
            </Box>
          )}
        </Box>

        {/* Upload Progress */}
        {isUploading && (
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="caption" color="text.secondary">
                Uploading...
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {progress}%
              </Typography>
            </Box>
            <LinearProgress variant="determinate" value={progress} sx={{ borderRadius: 1 }} />
          </Box>
        )}
      </MUIDialogBody>

      <MUIDialogFooter>
        <Button variant="outlined" onClick={() => handleClose(false)} disabled={isUploading}>
          Cancel
        </Button>
        <Button variant="contained" onClick={() => void handleUpload()} disabled={!canUpload}>
          {isUploading ? 'Uploading...' : 'Upload'}
        </Button>
      </MUIDialogFooter>
    </MUIDialog>
  );
}
