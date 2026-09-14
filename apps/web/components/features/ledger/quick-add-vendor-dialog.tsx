'use client';

import { Alert, Button, CircularProgress } from '@mui/material';
import { type JSX, useEffect, useRef, useState } from 'react';

import {
  MUIDialog,
  MUIDialogBody,
  MUIDialogDescription,
  MUIDialogFooter,
  MUIDialogHeader,
  MUIDialogTitle,
  MUIInput,
} from '@/components/ui';
import { apiClient } from '@/lib/api/client';
import { useVendorMutations, type Vendor } from '@/lib/hooks/resources/vendors';
import { useGatedAction } from '@/lib/rbac';

interface QuickAddVendorDialogProps {
  open: boolean;
  /** What the person typed into the vendor search — the name to start from. */
  initialName: string;
  onClose: () => void;
  onCreated: (vendor: Pick<Vendor, 'id' | 'name' | 'code'>) => void;
}

/**
 * Add a vendor without leaving the expense being recorded.
 *
 * Before this, a bill from a new supplier meant closing the expense dialog —
 * which wipes what was typed — and going to Inventory, which a person holding
 * only finance permissions cannot open. So an accountant could not put a new
 * supplier's bill on credit at all.
 *
 * It asks only for what recording a bill needs: a name, and optionally a phone
 * and credit days. The code is generated (VEN-0001, …) by the server. Everything
 * else is added later under Inventory → Vendors.
 *
 * Gated on `finance.payments.record`, the same code as recording the expense —
 * whoever may record the bill may name who it is owed to. Editing a vendor's full
 * record stays with Inventory's own permission.
 */
export function QuickAddVendorDialog({
  open,
  initialName,
  onClose,
  onCreated,
}: QuickAddVendorDialogProps): JSX.Element {
  const { create } = useVendorMutations();
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState('');
  const [creditDays, setCreditDays] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  // Re-seed on every open, so a second vendor added in the same expense does
  // not start from the first one's details.
  useEffect(() => {
    if (!open) return;
    setName(initialName);
    setPhone('');
    setCreditDays('');
    setError(null);
  }, [open, initialName]);

  const trimmedName = name.trim();
  const trimmedPhone = phone.trim();
  const phoneError =
    trimmedPhone && (trimmedPhone.length < 10 || trimmedPhone.length > 20)
      ? 'Enter a phone number of 10 to 20 characters, or leave it blank.'
      : undefined;
  const daysError =
    creditDays.trim() && !/^\d+$/.test(creditDays.trim())
      ? 'Enter whole days, like 30, or leave it blank.'
      : undefined;
  const valid = Boolean(trimmedName) && !phoneError && !daysError;
  const busy = checking || create.isPending;

  // A ref, not state: two clicks in the same tick both read the pre-render
  // value of a state flag, so state cannot stop a double submission.
  const inFlight = useRef(false);

  const handleSave = async (): Promise<void> => {
    if (!valid || inFlight.current) return;
    inFlight.current = true;
    setError(null);
    try {
      // Refuse a name that already exists. The server allows duplicate names on
      // purpose — Inventory tells same-named vendors apart by code — but a
      // person adding one in a hurry from an expense has almost always missed
      // the existing vendor in the list.
      setChecking(true);
      const { data } = await apiClient.get<{ data: Vendor[] }>('/vendors', {
        params: { search: trimmedName, limit: 25 },
      });
      setChecking(false);
      const clash = data.data.find(
        (v) => v.name.trim().toLowerCase() === trimmedName.toLowerCase(),
      );
      if (clash) {
        setError(
          `“${clash.name}” is already a vendor (${clash.code}). Close this and pick them from the list.`,
        );
        return;
      }

      const vendor = await create.mutateAsync({
        name: trimmedName,
        phone: trimmedPhone || undefined,
        creditDays: creditDays.trim() ? Number(creditDays.trim()) : undefined,
      });
      onCreated({ id: vendor.id, name: vendor.name, code: vendor.code });
    } catch {
      // The create mutation already shows its own error toast.
      setChecking(false);
    } finally {
      inFlight.current = false;
    }
  };

  const save = useGatedAction('finance.payments.record', () => void handleSave(), 'Add vendor');

  return (
    <MUIDialog open={open} onOpenChange={(next) => !next && !busy && onClose()} size="sm">
      <MUIDialogHeader>
        <MUIDialogTitle>Add a vendor</MUIDialogTitle>
        <MUIDialogDescription>
          Just enough to record this bill. Add their full details later under Inventory → Vendors.
        </MUIDialogDescription>
      </MUIDialogHeader>

      <MUIDialogBody>
        <div className="flex flex-col gap-4">
          <MUIInput
            fieldLabel="Vendor name"
            required
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              // A warning about the old name must not sit under a new one.
              setError(null);
            }}
            disabled={busy}
            autoFocus
          />
          <MUIInput
            fieldLabel="Phone (optional)"
            inputMode="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            disabled={busy}
            error={phoneError}
          />
          <MUIInput
            fieldLabel="Credit days (optional)"
            inputMode="numeric"
            placeholder="30"
            value={creditDays}
            onChange={(e) => setCreditDays(e.target.value)}
            disabled={busy}
            error={daysError}
          />
          {error ? <Alert severity="warning">{error}</Alert> : null}
        </div>
      </MUIDialogBody>

      <MUIDialogFooter>
        <Button onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={save.onGatedClick}
          aria-disabled={!save.allowed}
          disabled={!valid || busy}
          startIcon={busy ? <CircularProgress size={16} /> : undefined}
        >
          Add vendor
        </Button>
      </MUIDialogFooter>
    </MUIDialog>
  );
}
