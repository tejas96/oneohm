export { CustomerDetailHeader } from './header';
export type { HeaderSignal } from './header';
export { CustomerTabRail } from './tab-rail';
export { SiteStageBar } from './site-stage';
export type { SiteStageBarProps } from './site-stage';

// Design-system building blocks shared by the header, the drawer and every tab.
export {
  DetailCard,
  EmptyPane,
  Field,
  FieldGrid,
  IconCircle,
  Mono,
  RowSkeleton,
  SectionHeading,
  TonePill,
  TONE_INK,
} from './primitives';
export type { DetailTone } from './primitives';

/**
 * Kept for the **property** detail page, which imports both from here. They are
 * no longer used by the customer detail page — see the note in `kpi-strip.tsx`.
 */
export { CustomerDetailKpiStrip } from './kpi-strip';
export type { KpiItem } from './kpi-strip';
export { CustomerAttentionPanel } from './attention-panel';
export type { AttentionItem } from './attention-panel';

export { PropertyPipelineStrip } from '@/components/features/properties/property-detail/pipeline-strip';
export { TabSkeleton, PageSkeleton } from './tab-skeleton';
export { PropertyDetailDrawer } from './property-detail-drawer';
export type { PropertyDetailDrawerProps } from './property-detail-drawer';

export * from './tabs';
