import type { PipelineFunnelStage } from '@/lib/hooks/resources';

/** SVG coordinate space for the stacked disc funnel */
export const DISC_STACK_VIEWBOX = {
  width: 360,
  height: 460,
  centerX: 180,
  topHalfWidth: 148,
  bottomHalfWidth: 56,
  ellipseRy: 17,
  sideHeight: 78,
  /** Vertical breathing room between one disc's bottom rim and the next disc's top cap */
  gap: 46,
  topPadding: 12,
} as const;

export interface FunnelDiscGeometry {
  stage: PipelineFunnelStage;
  index: number;
  topY: number;
  bottomY: number;
  centerY: number;
  rx: number;
  ry: number;
  sideHeight: number;
  color: string;
  colorDark: string;
  colorLight: string;
}

export interface DiscStackGeometry {
  discs: FunnelDiscGeometry[];
  totalHeight: number;
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const bigint = parseInt(
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean,
    16,
  );
  return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number): number => Math.max(0, Math.min(255, Math.round(v)));
  return `#${[r, g, b].map((v) => clamp(v).toString(16).padStart(2, '0')).join('')}`;
}

export function shadeColor(hex: string, percent: number): string {
  const [r, g, b] = hexToRgb(hex);
  const t = percent < 0 ? 0 : 255;
  const p = Math.abs(percent);
  return rgbToHex(r + (t - r) * p, g + (t - g) * p, b + (t - b) * p);
}

function rxAtIndex(index: number, count: number): number {
  const { topHalfWidth, bottomHalfWidth } = DISC_STACK_VIEWBOX;
  if (count <= 1) return topHalfWidth;
  const t = index / (count - 1);
  const eased = Math.pow(t, 0.72);
  return topHalfWidth * (1 - eased) + bottomHalfWidth * eased;
}

export function computeDiscStackGeometry(
  stages: PipelineFunnelStage[],
  stageColors: Record<string, string>,
): DiscStackGeometry {
  if (stages.length === 0) {
    return { discs: [], totalHeight: DISC_STACK_VIEWBOX.height };
  }

  const { sideHeight, gap, topPadding, ellipseRy } = DISC_STACK_VIEWBOX;
  const step = sideHeight + gap;

  const discs: FunnelDiscGeometry[] = stages.map((stage, index) => {
    const topY = topPadding + index * step;
    const bottomY = topY + sideHeight;
    const color = stageColors[stage.id] ?? '#76c044';

    return {
      stage,
      index,
      topY,
      bottomY,
      centerY: topY + sideHeight / 2,
      rx: rxAtIndex(index, stages.length),
      ry: ellipseRy,
      sideHeight,
      color,
      colorDark: shadeColor(color, -0.28),
      colorLight: shadeColor(color, 0.32),
    };
  });

  const last = discs[discs.length - 1];
  const totalHeight = last ? last.bottomY + topPadding : DISC_STACK_VIEWBOX.height;

  return { discs, totalHeight };
}

export function discCenterPercent(disc: FunnelDiscGeometry, totalHeight: number): number {
  return (disc.centerY / totalHeight) * 100;
}
