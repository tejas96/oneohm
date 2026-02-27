import Link from 'next/link';

import { Button , Typography } from '@/components/ui';
import { ROUTES } from '@/lib/config/routes';

// eslint-disable-next-line import/no-default-export -- Next.js requires default export for special files
export default function NotFound(): React.JSX.Element {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background-secondary">
      <div className="text-center">
        <Typography variant="h1" className="text-6xl mb-4">
          404
        </Typography>
        <Typography variant="h3" className="mb-4">
          Page Not Found
        </Typography>
        <Typography variant="body" color="muted" className="mb-8">
          The page you&apos;re looking for doesn&apos;t exist.
        </Typography>
        <Button asChild>
          <Link href={ROUTES.HOME}>Go Home</Link>
        </Button>
      </div>
    </div>
  );
}
