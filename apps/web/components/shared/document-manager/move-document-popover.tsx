import DriveFileMoveIcon from '@mui/icons-material/DriveFileMove';
import {
  IconButton,
  ListItemText,
  MenuItem,
  Popover,
  Typography,
  type SxProps,
  type Theme,
} from '@mui/material';
import { DOCUMENT_ENTITY_TYPE_OPTIONS } from '@tejas96/shared/constants';
import { DocumentEntityType } from '@tejas96/shared/types';
import { Loader2 } from 'lucide-react';
import React, { useState } from 'react';

import { useUpdateDocument } from '@/lib/hooks/resources';

interface MoveDocumentPopoverProps {
  documentId: string;
  currentEntityType: DocumentEntityType;
  className?: string;
  sx?: SxProps<Theme>;
}

export function MoveDocumentPopover({
  documentId,
  currentEntityType,
  className,
  sx,
}: MoveDocumentPopoverProps): React.JSX.Element {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const { mutate: updateDocument, isPending } = useUpdateDocument();

  const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
  };

  const handleClose = (event?: React.MouseEvent | React.KeyboardEvent | object) => {
    if (event && 'stopPropagation' in event) {
      (event as any).stopPropagation();
    }
    setAnchorEl(null);
  };

  const handleSelect = (event: React.MouseEvent, newEntityType: DocumentEntityType) => {
    event.preventDefault();
    event.stopPropagation();

    if (newEntityType === currentEntityType) {
      setAnchorEl(null);
      return;
    }

    setAnchorEl(null);
    updateDocument(
      { id: documentId, entityType: newEntityType },
      {
        onSuccess: () => {
          // Cache invalidation handled by hook
        },
      },
    );
  };

  const open = Boolean(anchorEl);

  return (
    <div className={className}>
      <IconButton
        size="small"
        onClick={handleOpen}
        className={className}
        disabled={isPending}
        sx={{
          opacity: 0,
          '.group:hover &': { opacity: 1 },
          transition: 'opacity 0.2s',
          ...sx,
        }}
      >
        {isPending ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <DriveFileMoveIcon sx={{ fontSize: (sx as any)?.fontSize ?? 20 }} />
        )}
      </IconButton>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={(e) => handleClose(e as any)}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        slotProps={{
          paper: {
            className: 'w-48 py-1 rounded-lg border border-border bg-background shadow-lg',
          },
        }}
      >
        <div className="px-3 py-2 mb-1">
          <Typography
            variant="caption"
            className="text-foreground-secondary font-medium uppercase tracking-wider text-[10px]"
          >
            Move to group
          </Typography>
        </div>
        {DOCUMENT_ENTITY_TYPE_OPTIONS.map((option) => (
          <MenuItem
            key={option.value}
            onClick={(e) => handleSelect(e, option.value)}
            disabled={option.value === currentEntityType}
            className="px-3 py-1.5 min-h-0"
          >
            <ListItemText
              primary={option.label}
              primaryTypographyProps={{
                variant: 'body2',
                className:
                  option.value === currentEntityType
                    ? 'text-primary font-medium'
                    : 'text-foreground',
              }}
            />
          </MenuItem>
        ))}
      </Popover>
    </div>
  );
}
