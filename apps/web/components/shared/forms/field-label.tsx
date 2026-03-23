import { Info } from 'lucide-react';
import type { ReactNode } from 'react';

import { Label, Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui';
import { cn } from '@/lib/utils';

interface FieldLabelProps {
  htmlFor?: string;
  label: ReactNode;
  required?: boolean;
  tooltip?: ReactNode;
  className?: string;
}

export function FieldLabel({
  htmlFor,
  label,
  required,
  tooltip,
  className,
}: FieldLabelProps): ReactNode {
  return (
    <div className={cn('flex items-center gap-1', className)}>
      <Label htmlFor={htmlFor} required={required}>
        {label}
      </Label>
      {tooltip && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Info className="size-icon-xs text-foreground-tertiary cursor-help" />
          </TooltipTrigger>
          <TooltipContent>{tooltip}</TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}
