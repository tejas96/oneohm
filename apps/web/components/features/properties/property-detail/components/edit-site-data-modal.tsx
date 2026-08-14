'use client';

import FactCheckIcon from '@mui/icons-material/FactCheck';
import PeopleIcon from '@mui/icons-material/People';
import WbSunnyIcon from '@mui/icons-material/WbSunny';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  Typography,
  Alert,
  Box,
} from '@mui/material';
import {
  RoofCondition,
  RoofOrientation,
  type ShadingAnalysis,
  type SurveyData,
} from '@tejas96/shared/types';
import React, { useState, useEffect } from 'react';

import { type CustomerPropertyResponse, useUpdateProperty } from '../../hooks';

import { useEmployees } from '@/components/features/employees';
import type { Employee } from '@/components/features/employees/hooks/use-employees';
import { MUIUserAssigneeSelector, type AssigneeOption } from '@/components/ui';
import { useGatedAction } from '@/lib/rbac';

interface EditSiteDataModalProps {
  open: boolean;
  onClose: () => void;
  property: CustomerPropertyResponse;
}

/**
 * Options for one assignee field, always including whoever is currently
 * assigned.
 *
 * The employee list can legitimately not contain the current assignee — they
 * may have left, or been filtered out. Without the fallback entry the picker
 * finds no match for the stored id and renders the "Unassigned" placeholder,
 * so a site that *is* assigned reads as unassigned and the first save silently
 * clears it.
 */
function assigneeOptions(
  employees: Employee[],
  currentId: string,
  currentName: string | null | undefined,
): AssigneeOption[] {
  const options = employees.map((emp) => ({
    id: emp.userId,
    displayName: emp.user ? `${emp.user.firstName} ${emp.user.lastName ?? ''}`.trim() : emp.userId,
    secondaryText: [emp.designation, emp.department].filter(Boolean).join(' · ') || undefined,
  }));

  if (currentId && !options.some((o) => o.id === currentId)) {
    options.unshift({
      id: currentId,
      displayName: currentName || currentId,
      secondaryText: 'No longer in the employee list',
    });
  }

  return options;
}

export function EditSiteDataModal({
  open,
  onClose,
  property,
}: EditSiteDataModalProps): React.JSX.Element {
  const save = useGatedAction('properties.edit', () => handleSave(), 'Edit site data');
  const updateProperty = useUpdateProperty();
  const { data: employees = [], isLoading: employeesLoading } = useEmployees({
    enabled: open,
  });

  // State fields
  const [siteVisitAssignee, setSiteVisitAssignee] = useState('');
  const [siteSurveyAssignee, setSiteSurveyAssignee] = useState('');
  const [availableRoofAreaSqft, setAvailableRoofAreaSqft] = useState('');
  const [siteNotes, setSiteNotes] = useState('');

  // Survey Data
  const [roofType, setRoofType] = useState('');
  const [roofCondition, setRoofCondition] = useState('');
  const [roofOrientation, setRoofOrientation] = useState('');
  const [isMaterialUnloadingAreaSafe, setIsMaterialUnloadingAreaSafe] = useState(false);
  const [surveyNotes, setSurveyNotes] = useState('');

  // Shading Analysis
  const [hasShading, setHasShading] = useState(false);
  const [shadingPercentage, setShadingPercentage] = useState('');
  const [shadingNotes, setShadingNotes] = useState('');

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Initialize values when modal opens
  useEffect(() => {
    if (open && property) {
      setSiteVisitAssignee(property.siteVisitAssignee ?? '');
      setSiteSurveyAssignee(property.siteSurveyAssignee ?? '');
      setAvailableRoofAreaSqft(
        property.availableRoofAreaSqft != null ? String(property.availableRoofAreaSqft) : '',
      );
      setSiteNotes(property.siteNotes ?? '');

      const survey = property.surveyData;
      setRoofType(survey?.roofType ?? '');
      setRoofCondition(survey?.roofCondition ?? '');
      setRoofOrientation(survey?.roofOrientation ?? '');
      setIsMaterialUnloadingAreaSafe(survey?.isMaterialUnloadingAreaSafe ?? false);
      setSurveyNotes(survey?.notes ?? '');

      const shading = property.shadingAnalysis;
      setHasShading(shading?.hasShading ?? false);
      setShadingPercentage(
        shading?.shadingPercentage != null ? String(shading.shadingPercentage) : '',
      );
      setShadingNotes(shading?.notes ?? '');

      setErrors({});
    }
  }, [open, property]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (availableRoofAreaSqft !== '') {
      const area = Number(availableRoofAreaSqft);
      if (isNaN(area) || area <= 0) {
        newErrors.availableRoofAreaSqft = 'Roof area must be greater than 0';
      }
    }

    if (hasShading) {
      if (shadingPercentage === '') {
        newErrors.shadingPercentage = 'Shading percentage is required when shading is present';
      } else {
        const pct = Number(shadingPercentage);
        if (isNaN(pct) || pct < 0 || pct > 100) {
          newErrors.shadingPercentage = 'Shading percentage must be between 0 and 100';
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = (): void => {
    if (!validate()) return;

    const shadingAnalysis = {
      hasShading,
      shadingPercentage: hasShading && shadingPercentage !== '' ? Number(shadingPercentage) : null,
      notes: hasShading ? shadingNotes || null : null,
    } as ShadingAnalysis;

    const surveyData = {
      roofType: roofType || null,
      roofCondition: (roofCondition || null) as RoofCondition | null,
      roofOrientation: (roofOrientation || null) as RoofOrientation | null,
      notes: surveyNotes || null,
      isMaterialUnloadingAreaSafe,
    } as SurveyData;

    /*
      Both blobs used to be sent on every save. Someone opening this modal to
      set an assignee and pressing Save would stamp an all-null survey over a
      column that was NULL, and the detail page would start reporting
      "Unloading area safe: No" and "Shading: None" — answers nobody gave.

      So a blank blob is only written once one already exists and is being
      edited; on a site that has never been surveyed it stays NULL. Note that
      an unticked checkbox is indistinguishable from an unanswered one, which
      is exactly why a blank blob must not be taken for an answer.
    */
    const surveyIsBlank =
      !roofType &&
      !roofCondition &&
      !roofOrientation &&
      !surveyNotes &&
      !isMaterialUnloadingAreaSafe;
    const shadingIsBlank = !hasShading && shadingPercentage === '' && !shadingNotes;

    const payload = {
      siteVisitAssignee: siteVisitAssignee || null,
      siteSurveyAssignee: siteSurveyAssignee || null,
      availableRoofAreaSqft: availableRoofAreaSqft !== '' ? Number(availableRoofAreaSqft) : null,
      siteNotes: siteNotes || null,
      shadingAnalysis: shadingIsBlank && !property.shadingAnalysis ? null : shadingAnalysis,
      surveyData: surveyIsBlank && !property.surveyData ? null : surveyData,
    };

    updateProperty.mutate(
      {
        id: property.id,
        data: payload,
      },
      {
        onSuccess: () => {
          onClose();
        },
      },
    );
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2.5,
          boxShadow: '0 20px 25px -5px rgba(0,0,0,0.08), 0 10px 10px -5px rgba(0,0,0,0.03)',
        },
      }}
    >
      <DialogTitle
        sx={{
          px: 3,
          pt: 3,
          pb: 2,
          borderBottom: '1px solid',
          borderColor: 'divider',
          fontWeight: 700,
          fontSize: '1.25rem',
          color: 'text.primary',
        }}
      >
        Edit Site Progress Data
      </DialogTitle>
      <DialogContent sx={{ px: 3, py: 2.5, bgcolor: 'background.default' }}>
        {/* Validation Alert */}
        {Object.keys(errors).length > 0 && (
          <Alert severity="error" sx={{ mb: 2.5, borderRadius: 1.5 }}>
            Please correct the validation errors below before saving.
          </Alert>
        )}

        {/* Section 1: Coordination & Site Visit */}
        <Box
          sx={{
            p: 2.5,
            mb: 2.5,
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
          }}
        >
          <Box display="flex" alignItems="center" gap={1} mb={2}>
            <PeopleIcon color="primary" fontSize="small" />
            <Typography variant="subtitle2" fontWeight={600} color="text.primary">
              Coordination & Site Visit
            </Typography>
          </Box>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <MUIUserAssigneeSelector
                fieldLabel="Site Visit Assignee"
                placeholder="Unassigned"
                value={siteVisitAssignee || null}
                // The payload sends `|| null`, but state stays a string so the
                // controlled inputs around it keep behaving the same.
                onChange={(userId) => setSiteVisitAssignee(userId ?? '')}
                options={assigneeOptions(
                  employees,
                  siteVisitAssignee,
                  property.siteVisitAssigneeName,
                )}
                optionsLoading={employeesLoading}
                allowUnassign
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <MUIUserAssigneeSelector
                fieldLabel="Technical Surveyor"
                placeholder="Unassigned"
                value={siteSurveyAssignee || null}
                onChange={(userId) => setSiteSurveyAssignee(userId ?? '')}
                options={assigneeOptions(
                  employees,
                  siteSurveyAssignee,
                  property.siteSurveyAssigneeName,
                )}
                optionsLoading={employeesLoading}
                allowUnassign
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Available Roof Area (sqft)"
                type="number"
                fullWidth
                size="small"
                value={availableRoofAreaSqft}
                error={!!errors.availableRoofAreaSqft}
                helperText={errors.availableRoofAreaSqft}
                onChange={(e) => setAvailableRoofAreaSqft(e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Site Visit Notes"
                multiline
                rows={1.5}
                fullWidth
                size="small"
                value={siteNotes}
                onChange={(e) => setSiteNotes(e.target.value)}
              />
            </Grid>
          </Grid>
        </Box>

        {/* Section 2: Technical Survey */}
        <Box
          sx={{
            p: 2.5,
            mb: 2.5,
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
          }}
        >
          <Box display="flex" alignItems="center" gap={1} mb={2}>
            <FactCheckIcon color="primary" fontSize="small" />
            <Typography variant="subtitle2" fontWeight={600} color="text.primary">
              Roof & Logistics Survey
            </Typography>
          </Box>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                label="Roof Type"
                fullWidth
                size="small"
                value={roofType}
                onChange={(e) => setRoofType(e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <FormControl fullWidth size="small">
                <InputLabel id="roof-condition-label">Roof Condition</InputLabel>
                <Select
                  labelId="roof-condition-label"
                  value={roofCondition}
                  label="Roof Condition"
                  onChange={(e) => setRoofCondition(e.target.value)}
                >
                  <MenuItem value="">
                    <em>Not Selected</em>
                  </MenuItem>
                  {Object.values(RoofCondition).map((cond) => (
                    <MenuItem key={cond} value={cond}>
                      {cond.charAt(0).toUpperCase() + cond.slice(1)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <FormControl fullWidth size="small">
                <InputLabel id="roof-orientation-label">Roof Orientation</InputLabel>
                <Select
                  labelId="roof-orientation-label"
                  value={roofOrientation}
                  label="Roof Orientation"
                  onChange={(e) => setRoofOrientation(e.target.value)}
                >
                  <MenuItem value="">
                    <em>Not Selected</em>
                  </MenuItem>
                  {Object.values(RoofOrientation).map((orient) => (
                    <MenuItem key={orient} value={orient}>
                      {orient.charAt(0).toUpperCase() + orient.slice(1)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', minHeight: 40 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={isMaterialUnloadingAreaSafe}
                      onChange={(e) => setIsMaterialUnloadingAreaSafe(e.target.checked)}
                    />
                  }
                  label="Material Unloading Area Safe?"
                />
              </Box>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                label="Survey General Notes"
                multiline
                rows={1.5}
                fullWidth
                size="small"
                value={surveyNotes}
                onChange={(e) => setSurveyNotes(e.target.value)}
              />
            </Grid>
          </Grid>
        </Box>

        {/* Section 3: Shading Analysis */}
        <Box
          sx={{
            p: 2.5,
            mb: 2.5,
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
          }}
        >
          <Box display="flex" alignItems="center" gap={1} mb={2}>
            <WbSunnyIcon color="primary" fontSize="small" />
            <Typography variant="subtitle2" fontWeight={600} color="text.primary">
              Solar Shading Analysis
            </Typography>
          </Box>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', minHeight: 40 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={hasShading}
                      onChange={(e) => setHasShading(e.target.checked)}
                    />
                  }
                  label="Has Shading?"
                />
              </Box>
            </Grid>
            <Grid size={{ xs: 12, sm: 8 }}>
              <TextField
                label="Shading Percentage"
                type="number"
                fullWidth
                size="small"
                disabled={!hasShading}
                value={shadingPercentage}
                error={!!errors.shadingPercentage}
                helperText={errors.shadingPercentage}
                onChange={(e) => setShadingPercentage(e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                label="Shading Analysis Notes"
                multiline
                rows={1.5}
                fullWidth
                size="small"
                disabled={!hasShading}
                value={shadingNotes}
                onChange={(e) => setShadingNotes(e.target.value)}
              />
            </Grid>
          </Grid>
        </Box>

        {/* Upload Documents Reminder */}
        <Alert severity="info" sx={{ borderRadius: 1.5 }}>
          Site images and documentation (such as Front View, Roof View, Meter Box, or Panel /
          Structure Installation View) can be uploaded and managed directly under the{' '}
          <strong>Documents</strong> tab.
        </Alert>
      </DialogContent>
      <DialogActions
        sx={{
          px: 3,
          py: 2,
          borderTop: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.default',
        }}
      >
        <Button onClick={onClose} color="inherit" variant="outlined" sx={{ borderRadius: 1.5 }}>
          Cancel
        </Button>
        <Button
          onClick={save.onGatedClick}
          aria-disabled={!save.allowed}
          color="primary"
          variant="contained"
          disabled={updateProperty.isPending}
          sx={{ borderRadius: 1.5, px: 3 }}
        >
          {updateProperty.isPending ? 'Saving...' : 'Save Site Data'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
