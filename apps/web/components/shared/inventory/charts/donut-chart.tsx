'use client';

import dynamic from 'next/dynamic';

import type { DonutChartImplProps } from './donut-chart.impl';

import { Skeleton } from '@/components/ui/skeleton';


const DonutChartLazy = dynamic(() => import('./donut-chart.impl'), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full rounded-lg" />,
});

export type DonutChartProps = DonutChartImplProps;

export function DonutChart(props: DonutChartProps): React.JSX.Element {
  return <DonutChartLazy {...props} />;
}

DonutChart.displayName = 'DonutChart';
