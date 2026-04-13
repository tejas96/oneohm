'use client';

/**
 * FileTypeIcon
 *
 * Renders the correct MUI icon for a given filename based on its extension.
 * The icon-to-extension mapping lives in `lib/utils/file.ts` (FILE_TYPE_CONFIG).
 *
 * To add support for a new file type:
 *   1. Add the extension to the relevant constant in lib/utils/file.ts.
 *   2. Add/update the FILE_TYPE_CONFIG entry in lib/utils/file.ts.
 *   3. Import and add the MUI icon to the ICON_MAP below.
 *   No other file needs to change.
 *
 * @example
 *   <FileTypeIcon fileName="report.pdf" fontSize={32} />
 *   <FileTypeIcon fileName="photo.jpg" fontSize={20} />
 */

import ArticleIcon from '@mui/icons-material/Article';
import DescriptionIcon from '@mui/icons-material/Description';
import ImageIcon from '@mui/icons-material/Image';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import TableChartIcon from '@mui/icons-material/TableChart';

import { FILE_TYPE_CONFIG, getFileType, type FileType } from '@/lib/utils/file';

type SvgIconComponent = React.ComponentType<{ sx?: object }>;

/**
 * Map FileType → MUI icon component.
 * Mirrors the iconName in FILE_TYPE_CONFIG — kept here to preserve tree-shaking
 * (dynamic imports from @mui/icons-material are not tree-shakable).
 *
 * To add a new file type:
 *   1. Add to FILE_TYPE_CONFIG in lib/utils/file.ts
 *   2. Import the MUI icon here and add it to ICON_MAP
 */
const ICON_MAP: Record<FileType, SvgIconComponent> = {
  image: ImageIcon,
  pdf: PictureAsPdfIcon,
  word: DescriptionIcon,
  excel: TableChartIcon,
  text: ArticleIcon,
  generic: InsertDriveFileIcon,
};

interface FileTypeIconProps {
  fileName: string;
  /** Icon font-size in px. Defaults to 20. */
  fontSize?: number;
}

export function FileTypeIcon({ fileName, fontSize = 20 }: FileTypeIconProps): React.JSX.Element {
  const type = getFileType(fileName);
  const { color } = FILE_TYPE_CONFIG[type];
  const IconComponent = ICON_MAP[type];

  return <IconComponent sx={{ fontSize, color }} />;
}
