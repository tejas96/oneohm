'use client';

import * as React from 'react';

import {
  DISC_STACK_VIEWBOX,
  type DiscStackGeometry,
  type FunnelDiscGeometry,
} from './funnel-disc-stack.utils';

interface FunnelDiscStackSvgProps {
  geometry: DiscStackGeometry;
  idPrefix: string;
  hoveredStageId: string | null;
  onStageHover: (stageId: string | null) => void;
}

function ConnectorLine({
  fromDisc,
  toDisc,
}: {
  fromDisc: FunnelDiscGeometry;
  toDisc: FunnelDiscGeometry;
}): React.JSX.Element {
  const { centerX } = DISC_STACK_VIEWBOX;
  // Start/end a few px clear of the rims so the connector reads as a distinct
  // link floating in the gap, not a line disappearing behind the caps.
  const y1 = fromDisc.bottomY + 10;
  const y2 = toDisc.topY - 10;

  return (
    <g>
      <line
        x1={centerX}
        y1={y1}
        x2={centerX}
        y2={y2}
        stroke="#94a3b8"
        strokeWidth={2}
        strokeDasharray="2 5"
        strokeLinecap="round"
      />
      <circle cx={centerX} cy={y1} r={2.5} fill={fromDisc.colorDark} />
      <circle cx={centerX} cy={y2} r={2.5} fill={toDisc.colorDark} />
    </g>
  );
}

function DiscCylinder({
  disc,
  idPrefix,
  isHovered,
  onHover,
}: {
  disc: FunnelDiscGeometry;
  idPrefix: string;
  isHovered: boolean;
  onHover: (hovered: boolean) => void;
}): React.JSX.Element {
  const { centerX } = DISC_STACK_VIEWBOX;
  const { rx, ry, topY, bottomY, color, colorDark, colorLight } = disc;
  const gradId = `${idPrefix}-side-${disc.stage.id}`;
  const shadowId = `${idPrefix}-shadow-${disc.stage.id}`;

  const sidePath = [
    `M ${centerX - rx} ${topY}`,
    `A ${rx} ${ry} 0 0 0 ${centerX + rx} ${topY}`,
    `L ${centerX + rx} ${bottomY}`,
    `A ${rx} ${ry} 0 0 1 ${centerX - rx} ${bottomY}`,
    'Z',
  ].join(' ');

  return (
    <g
      className="transition-transform duration-300 ease-out"
      style={{ transform: isHovered ? 'translateY(-2px)' : 'translateY(0)' }}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={colorDark} />
          <stop offset="16%" stopColor={color} />
          <stop offset="50%" stopColor={colorLight} />
          <stop offset="84%" stopColor={color} />
          <stop offset="100%" stopColor={colorDark} />
        </linearGradient>
        <radialGradient id={shadowId} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#0f172a" stopOpacity={0.22} />
          <stop offset="100%" stopColor="#0f172a" stopOpacity={0} />
        </radialGradient>
      </defs>

      {/* soft contact shadow beneath the disc */}
      <ellipse
        cx={centerX}
        cy={bottomY + 6}
        rx={rx * 0.92}
        ry={ry * 0.7}
        fill={`url(#${shadowId})`}
      />

      {/* bottom rim */}
      <ellipse cx={centerX} cy={bottomY} rx={rx} ry={ry} fill={colorDark} />

      {/* cylinder side */}
      <path
        d={sidePath}
        fill={`url(#${gradId})`}
        style={{
          filter: isHovered
            ? `drop-shadow(0 10px 18px ${color}40)`
            : `drop-shadow(0 4px 8px ${color}22)`,
          transition: 'filter 300ms ease-out',
        }}
      />

      {/* top cap */}
      <ellipse
        cx={centerX}
        cy={topY}
        rx={rx}
        ry={ry}
        fill="white"
        stroke={color}
        strokeWidth={1.25}
        strokeOpacity={isHovered ? 0.45 : 0.22}
        style={{ transition: 'stroke-opacity 300ms ease-out' }}
      />

      <text
        x={centerX}
        y={topY + 1}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={12.5}
        fontWeight={700}
        letterSpacing={0.6}
        fill={color}
        className="uppercase"
      >
        {disc.stage.label}
      </text>
    </g>
  );
}

export function FunnelDiscStackSvg({
  geometry,
  idPrefix,
  hoveredStageId,
  onStageHover,
}: FunnelDiscStackSvgProps): React.JSX.Element {
  const { discs, totalHeight } = geometry;

  return (
    <svg
      viewBox={`0 0 ${DISC_STACK_VIEWBOX.width} ${totalHeight}`}
      className="h-full w-full max-w-[320px]"
      aria-hidden
    >
      {discs.slice(0, -1).map((disc, i) => (
        <ConnectorLine key={`connector-${disc.stage.id}`} fromDisc={disc} toDisc={discs[i + 1]!} />
      ))}

      {discs.map((disc) => (
        <DiscCylinder
          key={disc.stage.id}
          disc={disc}
          idPrefix={idPrefix}
          isHovered={hoveredStageId === disc.stage.id}
          onHover={(hovered) => onStageHover(hovered ? disc.stage.id : null)}
        />
      ))}
    </svg>
  );
}
