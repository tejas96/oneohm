'use client';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  MUITypography,
} from '@/components/ui';

// ── Types ──────────────────────────────────────────────────────

interface ReviewSectionProps {
  id: string;
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}

// ── Component ─────────────────────────────────────────────────

export function ReviewSection({
  id,
  title,
  icon,
  children,
}: ReviewSectionProps): React.JSX.Element {
  return (
    <Accordion type="multiple" defaultValue={[id]}>
      <AccordionItem value={id} className="rounded-lg shadow-e1">
        <AccordionTrigger className="px-4 py-3 hover:no-underline">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary flex-shrink-0">
              {icon}
            </div>
            <MUITypography variant="bodyPrimary" className="font-medium">
              {title}
            </MUITypography>
          </div>
        </AccordionTrigger>
        <AccordionContent className="px-4 pb-4">{children}</AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
