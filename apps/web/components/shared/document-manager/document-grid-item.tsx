'use client';

import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import DownloadIcon from '@mui/icons-material/Download';
import VisibilityIcon from '@mui/icons-material/Visibility';
import {
  Box,
  Checkbox,
  Chip,
  CircularProgress,
  IconButton,
  Tooltip,
  Typography,
} from '@mui/material';
import React, { useCallback, useEffect, useState } from 'react';

import { FileTypeIcon } from './file-type-icon';
import { MoveDocumentPopover } from './move-document-popover';
import type { DraftDocument, ItemSelection } from './types';
import { formatBytes, getTagLabel } from './utils';

import type { DocumentRecord } from '@/lib/api/documents';
import { getDownloadUrl } from '@/lib/api/storage';
import { extractFileKey, isImageFile } from '@/lib/utils/file';

type AnyDocItem = DocumentRecord | DraftDocument;

interface DocumentGridItemProps {
  document: AnyDocItem;
  onPreview: (doc: AnyDocItem) => void;
  onDownload: (doc: AnyDocItem) => void;
  onDelete?: (doc: AnyDocItem) => void;
  /** Picking for print: a click toggles the checkbox, and the actions hide. */
  selection?: ItemSelection;
}

export function DocumentGridItem({
  document: doc,
  onPreview,
  onDownload,
  onDelete,
  selection,
}: DocumentGridItemProps): React.JSX.Element {
  const [imgError, setImgError] = useState(false);
  const [viewUrl, setViewUrl] = useState<string | null>(null);
  const isImage = isImageFile(doc.fileName);

  useEffect(() => {
    if (!isImage || !doc.fileUrl) return;

    // If it's already a blob or data URL, use it directly
    if (doc.fileUrl.startsWith('blob:') || doc.fileUrl.startsWith('data:')) {
      setViewUrl(doc.fileUrl);
      return;
    }

    // If it already looks like a signed URL (has query params), try it first
    if (doc.fileUrl.includes('?')) {
      setViewUrl(doc.fileUrl);
      return;
    }

    setViewUrl(null);
    setImgError(false);

    let cancelled = false;
    getDownloadUrl(extractFileKey(doc.fileUrl))
      .then((url) => {
        if (!cancelled) setViewUrl(url);
      })
      .catch(() => {
        if (!cancelled) setImgError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [doc.fileUrl, doc.fileName]);

  const handleImageError = useCallback(() => setImgError(true), []);

  const fileSize = 'fileSizeBytes' in doc ? doc.fileSizeBytes : undefined;

  const card = (
    <Box
      className="group"
      onClick={selection && !selection.disabled ? () => selection.onToggle() : undefined}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        borderRadius: 1.5,
        border: 1,
        borderColor: selection?.selected ? 'primary.main' : 'divider',
        outline: selection?.selected ? '1px solid' : 'none',
        outlineColor: 'primary.main',
        bgcolor: 'background.paper',
        opacity: selection?.disabled ? 0.45 : 1,
        cursor: selection && !selection.disabled ? 'pointer' : undefined,
        transition: 'box-shadow 0.15s',
        '&:hover': { boxShadow: selection?.disabled ? 0 : 1 },
        '&:hover .grid-overlay': { opacity: 1 },
      }}
    >
      {/* Preview Area */}
      <Box
        onClick={selection ? undefined : () => onPreview(doc)}
        aria-label={selection ? `Select ${doc.fileName}` : `Preview ${doc.fileName}`}
        sx={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: 128,
          width: '100%',
          bgcolor: 'grey.100',
          cursor: 'pointer',
          p: 0,
        }}
      >
        {isImage && !imgError ? (
          viewUrl ? (
            <Box
              component="img"
              src={viewUrl}
              alt={doc.fileName}
              onError={handleImageError}
              loading="lazy"
              crossOrigin="anonymous"
              sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <CircularProgress size={20} />
          )
        ) : (
          <FileTypeIcon fileName={doc.fileName} fontSize={32} />
        )}

        {selection && (
          <Checkbox
            checked={selection.selected}
            disabled={selection.disabled}
            onClick={(e) => e.stopPropagation()}
            onChange={() => selection.onToggle()}
            slotProps={{ input: { 'aria-label': `Select ${doc.fileName} for printing` } }}
            size="small"
            sx={{
              position: 'absolute',
              top: 4,
              left: 4,
              zIndex: 2,
              p: 0.25,
              bgcolor: 'background.paper',
              borderRadius: 1,
              '&:hover': { bgcolor: 'background.paper' },
            }}
          />
        )}

        {/* Hover Overlay (not drawn while picking: its buttons would take the click) */}
        {!selection && (
          <Box
            className="grid-overlay"
            sx={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: 'rgba(0,0,0,0.4)',
              opacity: 0,
              transition: 'opacity 0.2s',
              gap: 1,
              zIndex: 1,
            }}
          >
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                onPreview(doc);
              }}
              sx={{
                color: 'white',
                bgcolor: 'rgba(255,255,255,0.1)',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' },
              }}
              title="Preview"
            >
              <VisibilityIcon sx={{ fontSize: 20 }} />
            </IconButton>
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                onDownload(doc);
              }}
              sx={{
                color: 'white',
                bgcolor: 'rgba(255,255,255,0.1)',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' },
              }}
              title="Download"
            >
              <DownloadIcon sx={{ fontSize: 20 }} />
            </IconButton>
            {'id' in doc && !('status' in doc) && (
              <MoveDocumentPopover
                documentId={doc.id}
                currentEntityType={doc.entityType}
                sx={{
                  color: 'white',
                  bgcolor: 'rgba(255,255,255,0.1)',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' },
                }}
              />
            )}
          </Box>
        )}
      </Box>

      {/* Info */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, p: 1 }}>
        <Typography variant="caption" fontWeight={500} noWrap title={doc.fileName}>
          {doc.fileName}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Chip
            label={getTagLabel(doc.tag)}
            size="small"
            variant="outlined"
            sx={{ height: 18, fontSize: '0.625rem', '& .MuiChip-label': { px: 0.5 } }}
          />
          {fileSize != null && (
            <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.625rem' }}>
              {formatBytes(fileSize)}
            </Typography>
          )}
        </Box>
      </Box>

      {/* Actions */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: 0.25,
          borderTop: 1,
          borderColor: 'divider',
          px: 0.5,
          py: 0.5,
        }}
      >
        {onDelete && !selection && (
          <IconButton
            size="small"
            onClick={() => onDelete(doc)}
            aria-label={`Delete ${doc.fileName}`}
            sx={{ color: 'text.disabled', '&:hover': { color: 'error.main' } }}
          >
            <DeleteOutlineIcon sx={{ fontSize: 16 }} />
          </IconButton>
        )}
      </Box>
    </Box>
  );

  return selection?.disabled ? (
    <Tooltip title="Only PDFs and JPG or PNG photos can be printed" placement="top">
      <span>{card}</span>
    </Tooltip>
  ) : (
    card
  );
}
