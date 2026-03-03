'use client';

import type { ProjectPriority, ProjectStatus } from '@oneohm-epc/shared-types';
import { Inbox, LayoutGrid, List, Plus, Search, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';

import { PRIORITY_FILTER_OPTIONS, STATUS_FILTER_OPTIONS, TYPE_FILTER_OPTIONS } from '../constants';
import { useProjects, type ProjectFilters } from '../hooks';
import { ProjectCard } from './project-card';
import { projectColumns } from './project-table-columns';

import { DataTable } from '@/components/shared/data-table/data-table';
import { TablePagination } from '@/components/shared/data-table/pagination';
import { EmptyState, ErrorState } from '@/components/shared/feedback/empty-state';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ROUTES } from '@/lib/config/routes';
import { useDebounce } from '@/lib/hooks';

const DEFAULT_PAGE_SIZE = 10;

function useUrlState() {
  const searchParams = useSearchParams();

  const get = useCallback((key: string) => searchParams.get(key) ?? '', [searchParams]);

  const set = useCallback((updates: Record<string, string>) => {
    const params = new URLSearchParams(window.location.search);
    for (const [key, value] of Object.entries(updates)) {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    }
    const qs = params.toString();
    const url = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
    window.history.replaceState(null, '', url);
  }, []);

  return { get, set };
}

export function ProjectListPage() {
  const router = useRouter();
  const url = useUrlState();

  const [statusFilter, setStatusFilter] = useState(url.get('status'));
  const [priorityFilter, setPriorityFilter] = useState(url.get('priority'));
  const [typeFilter, setTypeFilter] = useState(url.get('projectType'));
  const [searchInput, setSearchInput] = useState(url.get('search'));
  const [currentView, setCurrentView] = useState<'card' | 'table'>(
    (url.get('view') as 'card' | 'table') || 'table',
  );
  const [currentPage, setCurrentPage] = useState(parseInt(url.get('page') || '1', 10));
  const [pageSize, setPageSize] = useState(
    parseInt(url.get('pageSize') || String(DEFAULT_PAGE_SIZE), 10),
  );

  const debouncedSearch = useDebounce(searchInput, 550);

  const filters: ProjectFilters = useMemo(
    () => ({
      page: currentPage,
      limit: pageSize,
      status: (statusFilter || undefined) as ProjectStatus | undefined,
      priority: (priorityFilter || undefined) as ProjectPriority | undefined,
      projectType: typeFilter || undefined,
      search: debouncedSearch || undefined,
    }),
    [currentPage, pageSize, statusFilter, priorityFilter, typeFilter, debouncedSearch],
  );

  const { data, isLoading, isError, refetch } = useProjects(filters);

  const projects = data?.data ?? [];
  const totalItems = data?.meta?.total ?? 0;
  const totalPages = data?.meta?.totalPages ?? 1;

  const handleFilterChange = useCallback(
    (key: string, value: string) => {
      url.set({ [key]: value, page: '' });
      setCurrentPage(1);
      if (key === 'status') setStatusFilter(value);
      if (key === 'priority') setPriorityFilter(value);
      if (key === 'projectType') setTypeFilter(value);
    },
    [url],
  );

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchInput(value);
      url.set({ search: value, page: '' });
      setCurrentPage(1);
    },
    [url],
  );

  const handleViewChange = useCallback(
    (view: 'card' | 'table') => {
      setCurrentView(view);
      url.set({ view });
    },
    [url],
  );

  const handlePageChange = useCallback(
    (page: number) => {
      setCurrentPage(page);
      url.set({ page: page > 1 ? String(page) : '' });
    },
    [url],
  );

  const handlePageSizeChange = useCallback(
    (size: number) => {
      setPageSize(size);
      setCurrentPage(1);
      url.set({ pageSize: size !== DEFAULT_PAGE_SIZE ? String(size) : '', page: '' });
    },
    [url],
  );

  const hasActiveFilters = statusFilter || priorityFilter || typeFilter || debouncedSearch;

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">All Projects</h1>
          <p className="text-sm text-foreground-secondary mt-0.5">
            Manage and track all your solar installation projects
          </p>
        </div>
        <Button asChild>
          <Link href={ROUTES.PROJECTS.NEW}>
            <Plus className="size-4 mr-1.5" />
            New Project
          </Link>
        </Button>
      </div>

      {/* Search & Filters Row */}
      <div className="flex items-center gap-3">
        {/* Search Bar */}
        <div className="relative w-72">
          <Input
            placeholder="Search projects..."
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            leftIcon={<Search className="size-icon-sm" />}
            className="h-8 text-sm"
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => handleSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 hover:bg-muted rounded"
            >
              <X className="size-3.5 text-foreground-tertiary" />
            </button>
          )}
        </div>

        {/* Divider */}
        <div className="h-5 w-px bg-border-light" />

        {/* Status */}
        <Select
          value={statusFilter || 'all'}
          onValueChange={(v) => handleFilterChange('status', v === 'all' ? '' : v)}
        >
          <SelectTrigger className="w-36 h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_FILTER_OPTIONS.map((opt) => (
              <SelectItem key={opt.value || 'all'} value={opt.value || 'all'}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Priority */}
        <Select
          value={priorityFilter || 'all'}
          onValueChange={(v) => handleFilterChange('priority', v === 'all' ? '' : v)}
        >
          <SelectTrigger className="w-32 h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PRIORITY_FILTER_OPTIONS.map((opt) => (
              <SelectItem key={opt.value || 'all'} value={opt.value || 'all'}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Type */}
        <Select
          value={typeFilter || 'all'}
          onValueChange={(v) => handleFilterChange('projectType', v === 'all' ? '' : v)}
        >
          <SelectTrigger className="w-32 h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TYPE_FILTER_OPTIONS.map((opt) => (
              <SelectItem key={opt.value || 'all'} value={opt.value || 'all'}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setStatusFilter('');
              setPriorityFilter('');
              setTypeFilter('');
              setSearchInput('');
              setCurrentPage(1);
              url.set({ status: '', priority: '', projectType: '', search: '', page: '' });
            }}
            className="text-foreground-secondary h-8"
          >
            <X className="mr-1 size-3" />
            Clear
          </Button>
        )}

        {/* Spacer + View Toggle */}
        <div className="ml-auto flex items-center bg-muted rounded-lg p-0.5">
          <button
            type="button"
            onClick={() => handleViewChange('table')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-1.5 transition-colors ${
              currentView === 'table'
                ? 'bg-primary/10 text-primary'
                : 'text-foreground-secondary hover:text-foreground'
            }`}
          >
            <List className="size-4" />
            Table
          </button>
          <button
            type="button"
            onClick={() => handleViewChange('card')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-1.5 transition-colors ${
              currentView === 'card'
                ? 'bg-primary/10 text-primary'
                : 'text-foreground-secondary hover:text-foreground'
            }`}
          >
            <LayoutGrid className="size-4" />
            Cards
          </button>
        </div>
      </div>

      {/* Error State */}
      {isError && <ErrorState onRetry={() => refetch()} />}

      {/* Content */}
      {!isError && (
        <>
          {/* Empty States */}
          {!isLoading && projects.length === 0 && (
            <div className="bg-background rounded-lg border border-border-light overflow-hidden">
              <div className="p-8">
                {hasActiveFilters ? (
                  <EmptyState
                    title="No projects found"
                    description={
                      debouncedSearch
                        ? `No results match your search and filters. Try adjusting your criteria.`
                        : 'No projects match the selected filters. Try different filter options.'
                    }
                    icon={<Search className="w-full h-full" />}
                    iconColor="muted"
                    action={{
                      label: 'Clear Filters',
                      onClick: () => {
                        setStatusFilter('');
                        setPriorityFilter('');
                        setTypeFilter('');
                        setSearchInput('');
                        setCurrentPage(1);
                        url.set({
                          status: '',
                          priority: '',
                          projectType: '',
                          search: '',
                          page: '',
                        });
                      },
                    }}
                  />
                ) : (
                  <EmptyState
                    title="No projects yet"
                    description="Get started by creating your first project to track solar installations."
                    icon={<Inbox className="w-full h-full" />}
                    iconColor="primary"
                    action={{
                      label: 'New Project',
                      onClick: () => {
                        router.push(ROUTES.PROJECTS.NEW);
                      },
                    }}
                  />
                )}
              </div>
            </div>
          )}

          {/* Card View */}
          {currentView === 'card' && (
            <>
              {isLoading && (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div
                      key={i}
                      className="bg-background rounded-lg border border-border-light p-4 animate-pulse"
                    >
                      <div className="h-4 bg-muted rounded w-1/3 mb-2" />
                      <div className="h-5 bg-muted rounded w-2/3 mb-3" />
                      <div className="h-3 bg-muted rounded w-1/2 mb-2" />
                      <div className="h-3 bg-muted rounded w-2/5 mb-3" />
                      <div className="h-2 bg-muted rounded w-full mb-3" />
                      <div className="h-8 bg-muted rounded w-full mt-3" />
                    </div>
                  ))}
                </div>
              )}
              {!isLoading && projects.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {projects.map((project) => (
                    <ProjectCard key={project.id} project={project} />
                  ))}
                </div>
              )}
            </>
          )}

          {/* Table View */}
          {currentView === 'table' && (projects.length > 0 || isLoading) && (
            <div className="bg-background rounded-lg border border-border-light overflow-hidden">
              <DataTable
                columns={projectColumns}
                data={projects}
                isLoading={isLoading}
                enablePagination={false}
                enableSearch={false}
              />
              {!isLoading && projects.length > 0 && (
                <TablePagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={totalItems}
                  pageSize={pageSize}
                  itemLabel="projects"
                  variant="full"
                  onPageChange={handlePageChange}
                  onPageSizeChange={handlePageSizeChange}
                />
              )}
            </div>
          )}

          {/* Card View Pagination */}
          {currentView === 'card' && !isLoading && projects.length > 0 && (
            <div className="bg-background rounded-lg border border-border-light overflow-hidden">
              <TablePagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={totalItems}
                pageSize={pageSize}
                itemLabel="projects"
                variant="full"
                onPageChange={handlePageChange}
                onPageSizeChange={handlePageSizeChange}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
