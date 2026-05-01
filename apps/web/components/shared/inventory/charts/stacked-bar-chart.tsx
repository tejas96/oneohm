'use client';

import dynamic from 'next/dynamic';

import type { StackedBarChartImplProps } from './stacked-bar-chart.impl';

import { Skeleton } from '@/components/ui/skeleton';

const StackedBarChartLazy = dynamic(() => import('./stacked-bar-chart.impl'), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full rounded-lg" />,
});

export type StackedBarChartProps = StackedBarChartImplProps;

export function StackedBarChart(props: StackedBarChartProps): React.JSX.Element {
  return <StackedBarChartLazy {...props} />;
}

StackedBarChart.displayName = 'StackedBarChart';
