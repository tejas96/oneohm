'use client';

import AddPhotoAlternateOutlinedIcon from '@mui/icons-material/AddPhotoAlternateOutlined';
import CloseIcon from '@mui/icons-material/Close';
import { Box, CircularProgress, IconButton, Stack } from '@mui/material';
import { MAX_SERVICE_TICKET_PHOTOS, type ServiceTicketPhoto } from '@tejas96/shared/types';
import { type ChangeEvent, type JSX, useRef, useState } from 'react';

import { showToast } from '@/components/ui';
import { MUIFieldLabel } from '@/components/ui/mui-shared';
import { MUITypography } from '@/components/ui/mui-typography';
import { FileCategory, uploadFile } from '@/lib/api/storage';
import { color, radius } from '@/lib/theme/tokens';
import { getErrorMessage } from '@/lib/utils';

export interface ServiceTicketPhotosProps {
  value: ServiceTicketPhoto[];
  onChange: (photos: ServiceTicketPhoto[]) => void;
  /** Omitted while creating — uploadFile drops a non-UUID entityId on its own. */
  ticketId?: string;
  disabled?: boolean;
}

export function ServiceTicketPhotos({
  value,
  onChange,
  ticketId,
  disabled = false,
}: ServiceTicketPhotosProps): JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const remaining = MAX_SERVICE_TICKET_PHOTOS - value.length;
  const canAdd = !disabled && !uploading && remaining > 0;

  /**
   * Uploads are per-file with individual error handling: one bad file must not
   * discard the ones that already succeeded, so the user never loses work to a
   * single flaky upload.
   */
  const handleFiles = async (files: File[]): Promise<void> => {
    const accepted = files.slice(0, remaining);
    if (files.length > remaining) {
      showToast.error(
        `Only ${MAX_SERVICE_TICKET_PHOTOS} photos allowed — ${files.length - remaining} skipped.`,
      );
    }
    if (accepted.length === 0) return;

    setUploading(true);
    const uploaded: ServiceTicketPhoto[] = [];

    for (const file of accepted) {
      try {
        const result = await uploadFile({
          file,
          category: FileCategory.SERVICE,
          entityId: ticketId,
          entityType: 'service_ticket',
          subCategory: 'issue-photo',
        });
        uploaded.push({
          fileName: result.fileName,
          fileKey: result.fileKey,
          publicUrl: result.publicUrl,
          fileSize: file.size,
          mimeType: file.type,
        });
      } catch (error) {
        showToast.error(`${file.name} failed to upload: ${getErrorMessage(error)}`);
      }
    }

    setUploading(false);
    if (uploaded.length > 0) onChange([...value, ...uploaded]);
  };

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const files = Array.from(event.target.files ?? []);
    // Reset first so re-picking the same file still fires a change event.
    event.target.value = '';
    void handleFiles(files);
  };

  const handleRemove = (fileKey: string): void => {
    onChange(value.filter((photo) => photo.fileKey !== fileKey));
  };

  return (
    <Box>
      <MUIFieldLabel
        fieldLabel={
          <>
            Photos{' '}
            <MUITypography variant="finePrint" component="span">
              ({value.length}/{MAX_SERVICE_TICKET_PHOTOS})
            </MUITypography>
          </>
        }
      />

      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 0.5 }}>
        {value.map((photo) => (
          <Box
            key={photo.fileKey}
            sx={{
              position: 'relative',
              width: 84,
              height: 84,
              borderRadius: radius['card-functional'],
              overflow: 'hidden',
              border: '1px solid',
              borderColor: color.hairline,
            }}
          >
            {/* Plain <img>: these are S3-served URLs, not Next-optimised assets. */}
            <img
              src={photo.publicUrl}
              alt={photo.fileName}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            {!disabled && (
              <IconButton
                size="small"
                aria-label={`Remove ${photo.fileName}`}
                onClick={() => handleRemove(photo.fileKey)}
                sx={{
                  position: 'absolute',
                  top: 2,
                  right: 2,
                  bgcolor: 'rgba(0,0,0,0.55)',
                  color: '#fff',
                  p: '2px',
                  '&:hover': { bgcolor: 'rgba(0,0,0,0.75)' },
                }}
              >
                <CloseIcon sx={{ fontSize: 14 }} />
              </IconButton>
            )}
          </Box>
        ))}

        {canAdd && (
          <Box
            component="button"
            type="button"
            onClick={() => inputRef.current?.click()}
            sx={{
              width: 84,
              height: 84,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 0.5,
              cursor: 'pointer',
              border: '1px dashed',
              borderColor: color.hairline,
              borderRadius: radius['card-functional'],
              backgroundColor: 'transparent',
              color: color['text-tertiary'],
              '&:hover': { borderColor: color.accent, color: color.accent },
            }}
          >
            <AddPhotoAlternateOutlinedIcon sx={{ fontSize: 20 }} />
            <Box component="span" sx={{ fontSize: 11 }}>
              Add
            </Box>
          </Box>
        )}

        {uploading && (
          <Box
            sx={{
              width: 84,
              height: 84,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <CircularProgress size={20} />
          </Box>
        )}
      </Stack>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={handleInputChange}
      />
    </Box>
  );
}
