'use client';

import dynamic from 'next/dynamic';

import type { TrendLineChartImplProps } from './trend-line-chart.impl';

import { Skeleton } from '@/components/ui/skeleton';


/**
 * `next/dynamic({ ssr:false })` wrapper around the recharts impl so the
 * chart bundle ships only to the client. Loading state is a skeleton
 * sized to match the configured height — this avoids layout shift on
 * route entry when the chunk is still streaming.
 */

const TrendLineChartLazy = dynamic(() => import('./trend-line-chart.impl'), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full rounded-lg" />,
});

export type TrendLineChartProps = TrendLineChartImplProps;

export function TrendLineChart(props: TrendLineChartProps): React.JSX.Element {
  return <TrendLineChartLazy {...props} />;
}

TrendLineChart.displayName = 'TrendLineChart';
