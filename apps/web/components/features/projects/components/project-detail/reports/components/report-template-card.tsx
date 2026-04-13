'use client';

import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined';
import DownloadIcon from '@mui/icons-material/Download';
import RefreshIcon from '@mui/icons-material/Refresh';
import { Box, Button, Card, CardContent, Skeleton } from '@mui/material';
import { DocumentEntityType } from '@oneohm-epc/shared/types';

import { useReportDownload } from '../hooks/use-report-download';
import type { ReportTemplate } from '../types/report.types';

import { useDocuments } from '@/components/features/documents/hooks';
import { MUIStatusChip, MUITypography } from '@/components/ui';

interface ReportTemplateCardProps {
  template: ReportTemplate;
  projectId: string;
  onGenerate: (template: ReportTemplate) => void;
}

export function ReportTemplateCard({ template, projectId, onGenerate }: ReportTemplateCardProps) {
  const { data: allDocs, isLoading } = useDocuments(DocumentEntityType.PROJECT, projectId);
  const { download, isDownloading } = useReportDownload();

  const existingDoc = allDocs?.find((d) => d.tag === template.documentTag) ?? null;
  const isGenerated = !!existingDoc;

  if (isLoading) {
    return (
      <Card variant="outlined" sx={{ height: '100%' }}>
        <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, p: 2 }}>
          <Skeleton variant="text" width="60%" height={20} />
          <Skeleton variant="text" width="90%" height={16} />
          <Skeleton variant="text" width="40%" height={16} />
          <Box sx={{ display: 'flex', gap: 1, mt: 'auto', pt: 1 }}>
            <Skeleton variant="rectangular" width={80} height={32} sx={{ borderRadius: 1 }} />
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      variant="outlined"
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        transition: 'box-shadow 0.2s',
        '&:hover': { boxShadow: 2 },
      }}
    >
      <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, p: 2, flex: 1 }}>
        {/* Icon + Title row */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 40,
              height: 40,
              borderRadius: 1,
              bgcolor: 'grey.100',
              flexShrink: 0,
            }}
          >
            <ArticleOutlinedIcon sx={{ fontSize: 22, color: 'text.secondary' }} />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <MUITypography variant="bodyPrimary" noWrap>
              {template.name}
            </MUITypography>
            <MUITypography variant="finePrint" sx={{ mt: 0.25 }}>
              {template.description}
            </MUITypography>
          </Box>
        </Box>

        {/* Status badge */}
        <Box>
          {isGenerated ? (
            <MUIStatusChip label="Generated" color="success" size="small" />
          ) : (
            <MUIStatusChip label="Not Generated" autoColor={false} size="small" />
          )}
        </Box>

        {existingDoc && (
          <MUITypography variant="finePrint">
            Last updated:{' '}
            {new Date(existingDoc.updatedAt).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </MUITypography>
        )}

        {/* Action buttons */}
        <Box sx={{ display: 'flex', gap: 1, mt: 'auto', pt: 0.5, flexWrap: 'wrap' }}>
          <Button
            variant={isGenerated ? 'outlined' : 'contained'}
            size="small"
            startIcon={isGenerated ? <RefreshIcon /> : undefined}
            onClick={() => onGenerate(template)}
          >
            {isGenerated ? 'Regenerate' : 'Generate'}
          </Button>
          {isGenerated && (
            <Button
              variant="outlined"
              size="small"
              startIcon={<DownloadIcon />}
              onClick={() => existingDoc && void download(existingDoc)}
              disabled={isDownloading}
            >
              Download
            </Button>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}
