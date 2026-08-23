import type { QuoteSnapshot } from '@tejas96/shared/types';

import { systemSizeKwOf } from '../../../common/utils';
import type { ProjectEntity } from '../../projects/entities/project.entity';

export function getLatestQuoteVersion(project: ProjectEntity) {
  const versions = project.quote?.versions ?? [];
  if (!versions.length) return null;
  return [...versions].sort((a, b) => {
    const createdDiff = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    if (createdDiff !== 0) return createdDiff;
    return b.versionNumber - a.versionNumber;
  })[0];
}

export function getQuoteSnapshot(project: ProjectEntity): QuoteSnapshot | undefined {
  return getLatestQuoteVersion(project)?.quoteSnapshot;
}

export function getSystemSizeKw(project: ProjectEntity): number | undefined {
  const version = getLatestQuoteVersion(project);
  return systemSizeKwOf(version ?? {});
}
