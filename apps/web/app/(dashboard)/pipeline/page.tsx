import { PipelinePage } from '@/components/features/pipeline';

/**
 * Sales Pipeline/Funnel Page
 * Thin wrapper - all logic in feature component
 */
// eslint-disable-next-line import/no-default-export -- Next.js requires default export for pages
export default function PipelineRoute(): React.JSX.Element {
  return <PipelinePage />;
}
