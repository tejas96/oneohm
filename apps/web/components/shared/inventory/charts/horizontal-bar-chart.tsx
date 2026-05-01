'use client';

import dynamic from 'next/dynamic';

import type { HorizontalBarChartImplProps } from './horizontal-bar-chart.impl';

import { Skeleton } from '@/components/ui/skeleton';

const HorizontalBarChartLazy = dynamic(() => import('./horizontal-bar-chart.impl'), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full rounded-lg" />,
});

export type HorizontalBarChartProps = HorizontalBarChartImplProps;

export function HorizontalBarChart(props: HorizontalBarChartProps): React.JSX.Element {
  return <HorizontalBarChartLazy {...props} />;
}

HorizontalBarChart.displayName = 'HorizontalBarChart';
