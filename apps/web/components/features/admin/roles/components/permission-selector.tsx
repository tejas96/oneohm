/* eslint-disable @typescript-eslint/no-unsafe-return -- permission selection from API */
'use client';

import { Search, X } from 'lucide-react';
import { useCallback, useMemo, useState, type JSX } from 'react';

import { Badge, Input, Label } from '@/components/ui';
import { useAllPermissions, type Permission } from '@/lib/hooks/resources';

interface PermissionSelectorProps {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

export function PermissionSelector({
  selectedIds,
  onChange,
}: PermissionSelectorProps): JSX.Element {
  const { items: allPermissions, isLoading } = useAllPermissions();
  const [search, setSearch] = useState('');

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const grouped = useMemo((): Record<string, Permission[]> => {
    const lowerSearch = search.toLowerCase();
    const filtered = allPermissions.filter((p) => {
      if (selectedSet.has(p.id)) return false;
      if (!lowerSearch) return true;
      return (
        p.name.toLowerCase().includes(lowerSearch) || p.code.toLowerCase().includes(lowerSearch)
      );
    });

    const groups: Record<string, Permission[]> = {};
    for (const p of filtered) {
      const feature = p.code.split(':')[0] || 'other';
      if (!groups[feature]) groups[feature] = [];
      groups[feature].push(p);
    }
    return groups;
  }, [allPermissions, search, selectedSet]);

  const selectedPermissions = useMemo(
    (): Permission[] => allPermissions.filter((p) => selectedSet.has(p.id)),
    [allPermissions, selectedSet],
  );

  const addPermission = useCallback(
    (id: string) => onChange([...selectedIds, id]),
    [selectedIds, onChange],
  );

  const removePermission = useCallback(
    (id: string) => onChange(selectedIds.filter((sid) => sid !== id)),
    [selectedIds, onChange],
  );

  const groupedSelected = useMemo(() => {
    const groups: Record<string, Permission[]> = {};
    for (const p of selectedPermissions) {
      const feature = p.code.split(':')[0] || 'other';
      if (!groups[feature]) groups[feature] = [];
      groups[feature].push(p);
    }
    return groups;
  }, [selectedPermissions]);

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">Permissions</Label>

      {selectedPermissions.length > 0 && (
        <div className="space-y-2 rounded-md p-3 max-h-[160px] overflow-y-auto shadow-e1">
          {Object.entries(groupedSelected)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([feature, perms]) => (
              <div key={feature}>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-foreground-tertiary mb-1">
                  {feature}
                </p>
                <div className="flex flex-wrap gap-1">
                  {perms.map((p) => (
                    <Badge
                      key={p.id}
                      variant="secondary"
                      size="xs"
                      className="pr-1 cursor-pointer hover:bg-error/10 group"
                      onClick={() => removePermission(p.id)}
                    >
                      {p.name}
                      <X className="ml-1 size-3 opacity-50 group-hover:opacity-100 group-hover:text-error" />
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}

      <div className="relative">
        <Input
          type="text"
          placeholder="Search permissions..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          leftIcon={<Search className="size-icon-sm" />}
          className="h-8 text-sm"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 hover:bg-muted rounded"
          >
            <X className="size-3 text-foreground-tertiary" />
          </button>
        )}
      </div>

      <div className="rounded-md max-h-[200px] overflow-y-auto shadow-e1">
        {isLoading ? (
          <p className="text-sm text-foreground-tertiary p-3 text-center">Loading permissions...</p>
        ) : Object.keys(grouped).length === 0 ? (
          <p className="text-sm text-foreground-tertiary p-3 text-center">
            {search ? 'No matching permissions' : 'All permissions assigned'}
          </p>
        ) : (
          <div className="divide-y divide-border-light">
            {Object.entries(grouped)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([feature, perms]) => (
                <div key={feature} className="p-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-foreground-tertiary mb-1.5 px-1">
                    {feature}
                  </p>
                  <div className="space-y-0.5">
                    {perms.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => addPermission(p.id)}
                        className="w-full flex items-center justify-between px-2 py-1.5 rounded text-sm hover:bg-muted transition-colors text-left"
                      >
                        <span>{p.name}</span>
                        <span className="text-[10px] text-foreground-tertiary font-mono">
                          {p.code}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      <p className="text-xs text-foreground-tertiary">
        {selectedPermissions.length} permission{selectedPermissions.length !== 1 ? 's' : ''}{' '}
        selected
      </p>
    </div>
  );
}
