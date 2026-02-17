'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, type JSX } from 'react';
import { useForm } from 'react-hook-form';

import { markAsLostSchema, type MarkAsLostFormData, LOST_REASONS } from '../schemas';

import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogBody,
  DialogDescription,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  showToast,
} from '@/components/ui';


// ============================================================================
// Types
// ============================================================================

interface Property {
  id: string;
  propertyName?: string;
}

interface MarkAsLostModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  property: Property | null;
}

// ============================================================================
// Component
// ============================================================================

export function MarkAsLostModal({
  open,
  onOpenChange,
  property,
}: MarkAsLostModalProps): JSX.Element {
  const form = useForm<MarkAsLostFormData>({
    resolver: zodResolver(markAsLostSchema),
    defaultValues: {
      reason: '',
      notes: '',
    },
  });

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      form.reset({ reason: '', notes: '' });
    }
  }, [open, form]);

  const onSubmit = (_data: MarkAsLostFormData): void => {
    // TODO: Phase 2 - integrate with mark-as-lost API endpoint
    showToast.success('Property marked as lost');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mark as Lost</DialogTitle>
          <DialogDescription>
            Mark <span className="font-medium text-foreground">{property?.propertyName}</span> as a lost opportunity.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={(e) => void form.handleSubmit(onSubmit)(e)}>
          <DialogBody className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reason">Reason *</Label>
              <Select
                value={form.watch('reason')}
                onValueChange={(v) => form.setValue('reason', v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a reason" />
                </SelectTrigger>
                <SelectContent>
                  {LOST_REASONS.map(reason => (
                    <SelectItem key={reason.value} value={reason.value}>
                      {reason.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.reason && (
                <p className="text-xs text-error">{form.formState.errors.reason.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Additional Notes</Label>
              <Textarea
                id="notes"
                placeholder="Any additional details..."
                {...form.register('notes')}
              />
            </div>
          </DialogBody>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="destructive" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Saving...' : 'Mark as Lost'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
