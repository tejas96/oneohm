'use client';

import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import DownloadIcon from '@mui/icons-material/Download';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { Box, Chip, CircularProgress, IconButton, Typography } from '@mui/material';
import { useCallback, useEffect, useState } from 'react';

import type { DraftDocument } from './types';
import { formatBytes, formatDocDate, getTagLabel } from './utils';

import type { DocumentRecord } from '@/lib/api/documents';
import { getDownloadUrl } from '@/lib/api/storage';
import { extractFileKey, isImageFile } from '@/lib/utils';

type AnyDocItem = DocumentRecord | DraftDocument;

interface DocumentListItemProps {
  document: AnyDocItem;
  onPreview: (doc: AnyDocItem) => void;
  onDownload: (doc: AnyDocItem) => void;
  onDelete?: (doc: AnyDocItem) => void;
  isDeleting?: boolean;
  extraChip?: string;
}

function Thumbnail({ doc }: { doc: AnyDocItem }): React.JSX.Element {
  const [imgError, setImgError] = useState(false);
  const [viewUrl, setViewUrl] = useState<string | null>(null);
  const isImage = isImageFile(doc.fileName);

  useEffect(() => {
    if (!isImage) return;
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
  }, [doc.fileUrl, isImage]);

  const handleError = useCallback(() => setImgError(true), []);

  const boxSx = {
    width: 40,
    height: 40,
    flexShrink: 0,
    borderRadius: 1,
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    bgcolor: 'grey.100',
    border: 1,
    borderColor: 'divider',
  } as const;

  if (isImage && !imgError) {
    if (!viewUrl) {
      return (
        <Box sx={boxSx}>
          <CircularProgress size={16} />
        </Box>
      );
    }
    return (
      <Box sx={boxSx}>
        <Box
          component="img"
          src={viewUrl}
          alt={doc.fileName}
          onError={handleError}
          loading="lazy"
          sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </Box>
    );
  }

  return (
    <Box sx={boxSx}>
      <InsertDriveFileIcon sx={{ fontSize: 20, color: 'text.disabled' }} />
    </Box>
  );
}

function getUploadedBy(doc: AnyDocItem): string | undefined {
  if ('uploadedByUser' in doc && doc.uploadedByUser) {
    return `${doc.uploadedByUser.firstName} ${doc.uploadedByUser.lastName}`;
  }
  return undefined;
}

export function DocumentListItem({
  document: doc,
  onPreview,
  onDownload,
  onDelete,
  isDeleting = false,
  extraChip,
}: DocumentListItemProps): React.JSX.Element {
  const createdAt = 'createdAt' in doc ? doc.createdAt : undefined;
  const fileSize = 'fileSizeBytes' in doc ? doc.fileSizeBytes : undefined;
  const uploadedBy = getUploadedBy(doc);

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        p: 1.5,
        borderRadius: 1,
        border: 1,
        borderColor: 'divider',
        transition: 'background-color 0.15s',
        '&:hover': { bgcolor: 'grey.50' },
      }}
    >
      {/* Left: Thumbnail + Info */}
      <Box
        sx={{ display: 'flex', alignItems: 'center', gap: 1.5, overflow: 'hidden', minWidth: 0 }}
      >
        <Thumbnail doc={doc} />
        <Box sx={{ minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" fontWeight={500} noWrap>
              {doc.fileName}
            </Typography>
            <Chip label={getTagLabel(doc.tag)} size="small" variant="outlined" />
            {extraChip && (
              <Chip label={extraChip} size="small" variant="outlined" sx={{ flexShrink: 0 }} />
            )}
          </Box>
          <Typography variant="caption" color="text.secondary">
            {formatBytes(fileSize)}
            {createdAt && ` · Uploaded ${formatDocDate(createdAt)}`}
            {uploadedBy && ` · by ${uploadedBy}`}
          </Typography>
        </Box>
      </Box>

      {/* Right: Actions */}
      <Box sx={{ display: 'flex', alignItems: 'center', flexShrink: 0, ml: 1.5 }}>
        <IconButton
          size="small"
          onClick={() => onPreview(doc)}
          aria-label={`Preview ${doc.fileName}`}
        >
          <VisibilityIcon fontSize="small" />
        </IconButton>
        <IconButton
          size="small"
          onClick={() => onDownload(doc)}
          aria-label={`Download ${doc.fileName}`}
        >
          <DownloadIcon fontSize="small" />
        </IconButton>
        {onDelete && (
          <IconButton
            size="small"
            onClick={() => onDelete(doc)}
            disabled={isDeleting}
            aria-label={`Delete ${doc.fileName}`}
            sx={{ color: 'text.disabled', '&:hover': { color: 'error.main' } }}
          >
            <DeleteOutlineIcon fontSize="small" />
          </IconButton>
        )}
      </Box>
    </Box>
  );
}
