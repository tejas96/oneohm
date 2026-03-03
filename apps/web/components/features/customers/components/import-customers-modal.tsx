'use client';

import { Upload, FileText, X } from 'lucide-react';
import { useState, useRef, type ChangeEvent, type DragEvent, type JSX } from 'react';

import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogBody,
  Checkbox,
  Label,
  showToast,
} from '@/components/ui';

// ============================================================================
// Types
// ============================================================================

interface ImportCustomersModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ============================================================================
// Component
// ============================================================================

export function ImportCustomersModal({
  open,
  onOpenChange,
}: ImportCustomersModalProps): JSX.Element {
  const [file, setFile] = useState<File | null>(null);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Validate file type
      if (!selectedFile.name.endsWith('.csv') && !selectedFile.name.endsWith('.xlsx')) {
        showToast.error('Please upload a CSV or Excel file');
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      if (!droppedFile.name.endsWith('.csv') && !droppedFile.name.endsWith('.xlsx')) {
        showToast.error('Please upload a CSV or Excel file');
        return;
      }
      setFile(droppedFile);
    }
  };

  const handleImport = async () => {
    if (!file) return;

    setIsUploading(true);
    // TODO: Phase 2 - API call to upload and process the file

    // Simulate upload
    await new Promise((resolve) => setTimeout(resolve, 1500));

    showToast.success(`Successfully imported customers from ${file.name}`);
    setIsUploading(false);
    setFile(null);
    onOpenChange(false);
  };

  const handleClose = () => {
    setFile(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Import Customers</DialogTitle>
        </DialogHeader>

        <DialogBody className="space-y-4">
          {/* File Drop Zone */}
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            className="border-2 border-dashed border-border-light rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx"
              onChange={handleFileSelect}
              className="hidden"
            />

            {file ? (
              <div className="flex items-center justify-center gap-3">
                <FileText className="size-icon-lg text-primary" />
                <div className="text-left">
                  <p className="text-sm font-medium text-foreground">{file.name}</p>
                  <p className="text-xs text-foreground-secondary">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="size-8 p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                  }}
                >
                  <X className="size-icon-sm" />
                </Button>
              </div>
            ) : (
              <>
                <Upload className="size-icon-xl text-foreground-tertiary mx-auto mb-3" />
                <p className="text-sm font-medium text-foreground">
                  Drop your file here or click to browse
                </p>
                <p className="text-xs text-foreground-tertiary mt-1">
                  Supports CSV and Excel files
                </p>
              </>
            )}
          </div>

          {/* Options */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="skipDuplicates"
              checked={skipDuplicates}
              onCheckedChange={(checked) => setSkipDuplicates(checked === true)}
            />
            <Label htmlFor="skipDuplicates" className="text-sm cursor-pointer">
              Skip duplicate entries (based on phone number)
            </Label>
          </div>

          {/* Template Download */}
          <div className="bg-background-secondary rounded-lg p-3">
            <p className="text-xs text-foreground-secondary">
              Need a template?{' '}
              <button
                type="button"
                className="text-primary hover:underline"
                onClick={() => {
                  // TODO: Download template
                  showToast.info('Template download coming soon');
                }}
              >
                Download sample CSV
              </button>
            </p>
          </div>
        </DialogBody>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleImport} disabled={!file || isUploading}>
            {isUploading ? 'Importing...' : 'Import'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
