export interface DiscomLabelFields {
  circleName?: string | null;
  divisionName?: string | null;
  subdivisionName?: string | null;
  sectionName?: string | null;
}

export function buildDiscomLabel(discom: DiscomLabelFields): string {
  const parts: string[] = [];

  if (discom.divisionName?.trim()) {
    parts.push(discom.divisionName.trim());
  } else if (discom.circleName?.trim()) {
    parts.push(discom.circleName.trim());
  }

  if (discom.subdivisionName?.trim()) {
    parts.push(discom.subdivisionName.trim());
  }

  if (discom.sectionName?.trim()) {
    parts.push(discom.sectionName.trim());
  }

  if (parts.length === 0 && discom.circleName?.trim()) {
    return discom.circleName.trim();
  }

  return parts.join(' – ') || '—';
}
