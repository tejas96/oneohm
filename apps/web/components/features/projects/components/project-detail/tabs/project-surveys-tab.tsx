'use client';

import type { FileAttachment } from '@oneohm-epc/shared-types';
import { ClipboardCheck, Download, Eye, FileImage, FileText } from 'lucide-react';
import React, { useCallback, useState } from 'react';

import { SURVEY_STATUS_BADGE_VARIANT, SURVEY_STATUS_LABELS } from '../../../constants';
import type { ProjectSurvey } from '../../../hooks/types';

import { EmptyState } from '@/components/shared/feedback/empty-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { showToast } from '@/components/ui/sonner';
import { isImageFile, isPdfFile } from '@/lib/utils/file';
import { formatDate } from '@/lib/utils/format';

interface ProjectSurveysTabProps {
  survey?: ProjectSurvey;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(0)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

function getDocIconStyle(filename: string): {
  bg: string;
  icon: typeof FileText;
  iconColor: string;
} {
  if (isPdfFile(filename)) return { bg: 'bg-error/10', icon: FileText, iconColor: 'text-error' };
  if (isImageFile(filename)) return { bg: 'bg-info/10', icon: FileImage, iconColor: 'text-info' };
  return { bg: 'bg-muted', icon: FileText, iconColor: 'text-foreground-muted' };
}

function SurveyDocuments({ documents }: { documents: FileAttachment[] }) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewName, setPreviewName] = useState('');

  const openPreview = useCallback((doc: FileAttachment) => {
    if (isImageFile(doc.filename) || isPdfFile(doc.filename)) {
      setPreviewUrl(doc.url);
      setPreviewName(doc.filename);
    } else {
      window.open(doc.url, '_blank');
    }
  }, []);

  const closePreview = useCallback(() => {
    setPreviewUrl(null);
    setPreviewName('');
  }, []);

  return (
    <>
      <div className="mt-4 pt-3 border-t border-border-light">
        <p className="text-xs text-foreground-secondary mb-3">Documents ({documents.length})</p>
        <div className="flex flex-wrap gap-2">
          {documents.map((doc) => {
            const style = getDocIconStyle(doc.filename);
            const canPreview = isImageFile(doc.filename) || isPdfFile(doc.filename);
            const IconComp = style.icon;

            return (
              <div
                key={doc.id}
                className="relative group w-[120px] rounded-lg border border-border-light bg-background p-3 flex flex-col items-center text-center transition-colors hover:border-border-medium"
              >
                <div
                  className={`size-10 rounded-full ${style.bg} flex items-center justify-center mb-2`}
                >
                  <IconComp className={`size-5 ${style.iconColor}`} />
                </div>
                <p
                  className="text-2xs font-medium text-foreground truncate w-full"
                  title={doc.filename}
                >
                  {doc.filename}
                </p>
                {doc.fileSize > 0 && (
                  <p className="text-[10px] text-foreground-tertiary">
                    {formatBytes(doc.fileSize)}
                  </p>
                )}

                {/* Hover overlay with gradient */}
                <div className="absolute inset-0 rounded-lg bg-linear-to-t from-background via-background/90 to-background/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                  {canPreview && (
                    <button
                      type="button"
                      onClick={() => openPreview(doc)}
                      className="size-8 rounded-full bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20 transition-colors cursor-pointer"
                      aria-label={`Preview ${doc.filename}`}
                    >
                      <Eye className="size-3.5" />
                    </button>
                  )}
                  <a
                    href={doc.url}
                    download={doc.filename}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="size-8 rounded-full bg-success/10 text-success flex items-center justify-center hover:bg-success/20 transition-colors"
                    aria-label={`Download ${doc.filename}`}
                  >
                    <Download className="size-3.5" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {previewUrl && (
        <div
          className="fixed inset-0 z-modal flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in-0 duration-normal"
          onClick={closePreview}
          role="presentation"
        >
          <div
            className="relative max-h-[90vh] max-w-[90vw]"
            onClick={(e) => e.stopPropagation()}
            role="presentation"
          >
            <button
              type="button"
              onClick={closePreview}
              className="absolute -top-3 -right-3 z-10 size-7 rounded-full bg-background border border-border-light flex items-center justify-center text-foreground-secondary hover:text-foreground cursor-pointer"
              aria-label="Close preview"
            >
              ✕
            </button>
            {isImageFile(previewName) && (
              <img
                src={previewUrl}
                alt={previewName}
                className="max-h-[85vh] max-w-full rounded-lg object-contain shadow-sm"
              />
            )}
            {isPdfFile(previewName) && (
              <iframe
                src={previewUrl}
                title={previewName}
                className="h-[85vh] w-[min(90vw,56rem)] rounded-lg border-0 bg-background shadow-sm"
              />
            )}
          </div>
        </div>
      )}
    </>
  );
}

function SurveyDataRow({ label, value }: { label: string; value?: string | number | null }) {
  if (value === undefined || value === null || value === '') return null;
  return (
    <div className="flex justify-between py-1.5">
      <span className="text-xs text-foreground-secondary">{label}</span>
      <span className="text-xs font-medium text-foreground">{String(value)}</span>
    </div>
  );
}

export const ProjectSurveysTab = React.memo(
  ({ survey }: ProjectSurveysTabProps): React.JSX.Element => {
    if (!survey) {
      return (
        <EmptyState
          icon={<ClipboardCheck className="w-full h-full" />}
          iconColor="muted"
          title="No site survey conducted"
          description="Schedule a site survey to assess the installation location."
          action={{
            label: 'Schedule Survey',
            onClick: () => showToast.info('Coming Soon'),
          }}
        />
      );
    }

    const data = survey.surveyData;
    const variant = SURVEY_STATUS_BADGE_VARIANT[survey.status] ?? 'secondary';

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Site Surveys</h3>
          <Button size="sm" onClick={() => showToast.info('Coming Soon')}>
            + Schedule Survey
          </Button>
        </div>

        <div className="rounded-lg border border-border-light bg-background-secondary p-4">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h4 className="text-xs font-semibold text-foreground">Initial Site Survey</h4>
              <p className="text-2xs text-foreground-secondary">
                {formatDate(survey.createdAt, 'medium')}
                {survey.surveyCode ? ` · ${survey.surveyCode}` : ''}
              </p>
            </div>
            <Badge variant={variant as 'success'} shape="pill" size="sm">
              {SURVEY_STATUS_LABELS[survey.status] ?? survey.status}
            </Badge>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8">
            <div className="divide-y divide-border-light">
              <SurveyDataRow label="Roof Type" value={data?.roofType} />
              <SurveyDataRow label="Roof Condition" value={data?.roofCondition} />
              <SurveyDataRow label="Roof Orientation" value={data?.roofOrientation} />
              <SurveyDataRow
                label="Tilt Angle"
                value={data?.roofTiltAngle != null ? `${data.roofTiltAngle}°` : undefined}
              />
              <SurveyDataRow
                label="Available Area"
                value={data?.availableAreaSqm != null ? `${data.availableAreaSqm} sqm` : undefined}
              />
            </div>
            <div className="divide-y divide-border-light">
              <SurveyDataRow label="Structural Assessment" value={data?.structuralAssessment} />
              <SurveyDataRow label="Site Access" value={data?.siteAccess} />
              <SurveyDataRow label="Safety Concerns" value={data?.safetyConcerns} />
            </div>
          </div>

          {data?.recommendations && (
            <div className="mt-4 pt-3 border-t border-border-light">
              <p className="text-xs font-medium text-foreground-secondary mb-1">Recommendations</p>
              <p className="text-xs text-foreground">{data.recommendations}</p>
            </div>
          )}

          {data?.notes && (
            <div className="mt-3 pt-3 border-t border-border-light">
              <p className="text-xs font-medium text-foreground-secondary mb-1">Notes</p>
              <p className="text-xs text-foreground">{data.notes}</p>
            </div>
          )}

          {survey.documents && survey.documents.length > 0 && (
            <SurveyDocuments documents={survey.documents} />
          )}
        </div>
      </div>
    );
  },
);
