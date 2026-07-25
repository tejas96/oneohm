import type { DiscomAdmin } from '../hooks/use-discoms-admin';

export function buildDiscomPreviewLabel(discom: {
  circleName?: string | null;
  divisionName?: string | null;
  subdivisionName?: string | null;
  sectionName?: string | null;
}): string {
  const parts: string[] = [];
  const head = (discom.divisionName || '').trim() || (discom.circleName || '').trim();
  if (head) parts.push(head);
  if ((discom.subdivisionName || '').trim()) parts.push(discom.subdivisionName!.trim());
  if ((discom.sectionName || '').trim()) parts.push(discom.sectionName!.trim());
  return parts.join(' › ');
}

export function buildDiscomPathLabel(discom: DiscomAdmin): string {
  const preview = buildDiscomPreviewLabel(discom);
  if (!preview) return '';
  return `${preview} · ${discom.circleName} circle`;
}

export function buildSubOfficerLabel(discom: DiscomAdmin): string {
  if ((discom.subdivisionInchargeName || '').trim()) {
    return `SDO · ${discom.subdivisionInchargeName}`;
  }
  if ((discom.sectionEngineerName || '').trim()) {
    return `Section · ${discom.sectionEngineerName}`;
  }
  return 'No sub officer set';
}

export function formatDiscomGeo(discom: DiscomAdmin): string {
  const lat = discom.geoLocation?.latitude;
  const lng = discom.geoLocation?.longitude;
  if (lat != null && lng != null) return `${lat}, ${lng}`;
  return 'Not pinned';
}
