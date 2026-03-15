'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  ProjectPriority,
  PropertyStatus,
  QuoteStatus,
  MilestoneType,
} from '@oneohm-epc/shared/types';
import {
  AlertCircle,
  AlertTriangle,
  Building2,
  Calendar,
  CheckCircle2,
  CheckSquare,
  ClipboardList,
  Crown,
  FileText,
  Flag,
  IndianRupee,
  Info,
  Lock,
  Pencil,
  Plus,
  Search,
  Trash2,
  User,
  Users,
  X,
  Zap,
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';

import {
  useCustomerProperties,
  useCustomer,
  useCustomers,
  useCustomerQuotes,
  type CustomerPropertyResponse,
  type CustomerQuote,
  type Customer,
} from '../../../customers/hooks';
import {
  DEFAULT_MILESTONES,
  PHASE_LABELS,
  PROJECT_PRIORITY_LABELS,
  PROJECT_TYPE_LABELS,
} from '../../constants';
import {
  useConvertFromQuote,
  useEmployees,
  useTeamWorkload,
  type EmployeeListItem,
  type TeamWorkloadItem,
} from '../../hooks';
import {
  projectCreateSchema,
  type ProjectCreateFormData,
} from '../../schemas/project-create.schema';
import {
  getDisplayRoles,
  getEmployeeDisplayName,
  getEmployeeInitials,
  getWorkloadVariant,
} from '../../utils';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Badge,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
  Button,
  Card,
  CardContent,
  CardHeader,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Spinner,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
  showToast,
} from '@/components/ui';
import { ROUTES } from '@/lib/config/routes';
import { useDebounce } from '@/lib/hooks';
import { useAllActiveWorkflowSteps, type WorkflowStep } from '@/lib/hooks/resources';
import { cn, formatCurrency, formatDate, formatSystemSize, getErrorMessage } from '@/lib/utils';

// ============================================================================
// Main Component
// ============================================================================

export function ProjectCreatePage(): React.JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialQuoteId = searchParams.get('quoteId') || undefined;
  const initialPropertyId = searchParams.get('propertyId') || undefined;
  const initialCustomerId = searchParams.get('customerId') || undefined;

  // ---- Form ----
  const form = useForm<ProjectCreateFormData>({
    resolver: zodResolver(projectCreateSchema),
    defaultValues: {
      quoteId: initialQuoteId || '',
      propertyId: initialPropertyId || '',
      customerId: initialCustomerId || '',
      name: '',
      priority: ProjectPriority.NORMAL,
      startDate: '',
      endDate: '',
      description: '',
      projectManagerId: '',
      teamMembers: [],
      excludedStepIds: [],
      taskAssignments: [],
      taskMilestoneOverrides: [],
      milestones: DEFAULT_MILESTONES.map((m, i) => ({
        id: crypto.randomUUID(),
        name: m.name,
        type: m.type,
        order: i + 1,
      })),
    },
    mode: 'onTouched',
  });

  const {
    register,
    setValue,
    watch,
    formState: { errors, isDirty },
  } = form;

  // ---- Mutations ----
  const convertMutation = useConvertFromQuote();
  const isPending = convertMutation.isPending;

  // ---- Watched form values ----
  const selectedCustomerId = watch('customerId');
  const selectedPropertyId = watch('propertyId');
  const selectedQuoteId = watch('quoteId');
  const teamMembers = watch('teamMembers');
  const excludedIds = watch('excludedStepIds');
  const taskAssignments = watch('taskAssignments');
  const taskMilestoneOverrides = watch('taskMilestoneOverrides');
  const milestones = watch('milestones');

  // ---- Local state ----
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedProperty, setSelectedProperty] = useState<CustomerPropertyResponse | null>(null);
  const [selectedQuote, setSelectedQuote] = useState<CustomerQuote | null>(null);
  const [summaryTab, setSummaryTab] = useState<string>('customer');
  const [customerSearch, setCustomerSearch] = useState('');
  const debouncedCustomerSearch = useDebounce(customerSearch, 550);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [isNameManuallyEdited, setIsNameManuallyEdited] = useState(false);
  const [teamSearch, setTeamSearch] = useState('');
  const [prefilled, setPrefilled] = useState(false);
  const [editingMilestoneId, setEditingMilestoneId] = useState<string | null>(null);
  const milestoneNameInputRef = useRef<HTMLInputElement>(null);
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    return () => {
      if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
    };
  }, []);

  // ---- Data hooks ----
  const { data: customersData, isFetching: customersFetching } = useCustomers({
    limit: 10,
    search: debouncedCustomerSearch.length >= 2 ? debouncedCustomerSearch : undefined,
  });
  const customers = customersData?.data ?? [];

  const { data: deepLinkCustomer } = useCustomer(initialCustomerId || '');

  const { data: properties, isLoading: propertiesLoading } = useCustomerProperties(
    selectedCustomerId || '',
  );

  const { data: quotesData, isLoading: quotesLoading } = useCustomerQuotes(
    selectedCustomerId || '',
  );
  const allQuotes: CustomerQuote[] = quotesData?.data ?? [];

  const usableQuotes = useMemo(() => {
    return allQuotes
      .filter((q: CustomerQuote) => {
        if (q.status !== QuoteStatus.ACCEPTED) return false;
        if (!selectedPropertyId) return true;
        return !q.propertyId || q.propertyId === selectedPropertyId;
      })
      .sort((a: CustomerQuote, b: CustomerQuote) => {
        const propMatch = (id: string | undefined) => (id === selectedPropertyId ? 0 : 1);
        return propMatch(a.propertyId) - propMatch(b.propertyId);
      });
  }, [allQuotes, selectedPropertyId]);

  const linkedQuoteNotAccepted = useMemo(() => {
    if (!initialQuoteId || allQuotes.length === 0) return false;
    const linkedQuote = allQuotes.find((q) => q.id === initialQuoteId);
    return linkedQuote != null && linkedQuote.status !== QuoteStatus.ACCEPTED;
  }, [initialQuoteId, allQuotes]);

  const { data: employeesData, isLoading: employeesLoading } = useEmployees({
    limit: 100,
    status: 'active',
  });
  const employees = employeesData?.items ?? [];

  const { data: workloadData } = useTeamWorkload();
  const workloadMap = useMemo(() => {
    const map = new Map<string, TeamWorkloadItem>();
    workloadData?.forEach((w) => map.set(w.userId, w));
    return map;
  }, [workloadData]);

  const { items: templates, isLoading: stepsLoading } = useAllActiveWorkflowSteps();

  // ---- Derived state ----
  const propertyConverted = selectedProperty?.status === PropertyStatus.CONVERTED;

  const memberRoleMap = useMemo(() => {
    const map = new Map<string, string>();
    const teamUserIds = new Set(teamMembers.map((m) => m.userId));

    for (const emp of employees) {
      if (!teamUserIds.has(emp.userId) || !emp.roles) continue;
      for (const role of emp.roles) {
        const key = role.toLowerCase();
        if (!map.has(key)) {
          map.set(key, emp.userId);
        }
      }
    }
    return map;
  }, [teamMembers, employees]);

  const includedTemplates = useMemo(
    () => (templates || []).filter((t) => !excludedIds.includes(t.id)),
    [templates, excludedIds],
  );

  const unassignedCount = useMemo(
    () =>
      includedTemplates.filter((t) => {
        if (taskAssignments.some((a) => a.workflowStepId === t.id)) return false;
        if (!t.defaultRoleCode) return true;
        return !memberRoleMap.has(t.defaultRoleCode.toLowerCase());
      }).length,
    [includedTemplates, memberRoleMap, taskAssignments],
  );

  // ---- Auto-name generation ----
  const autoName = useMemo(() => {
    const custName = selectedCustomer
      ? `${selectedCustomer.firstName || ''} ${selectedCustomer.lastName || ''}`.trim()
      : '';
    const propName = selectedProperty?.propertyName || selectedProperty?.consumerName || 'Property';
    const sizeValue = selectedQuote?.systemSizeKw;
    const size = sizeValue && sizeValue > 0 ? `${formatSystemSize(sizeValue)}kW` : '';
    const parts = [custName, propName, size].filter(Boolean);
    return parts.join(' - ');
  }, [selectedCustomer, selectedProperty, selectedQuote]);

  useEffect(() => {
    if (!isNameManuallyEdited && autoName) {
      setValue('name', autoName);
    }
  }, [autoName, isNameManuallyEdited, setValue]);

  // ---- Deep link pre-fill ----
  useEffect(() => {
    if (initialCustomerId && deepLinkCustomer && !selectedCustomer) {
      setSelectedCustomer(deepLinkCustomer);
      setValue('customerId', deepLinkCustomer.id);
    }
  }, [initialCustomerId, deepLinkCustomer, selectedCustomer, setValue]);

  useEffect(() => {
    if (initialPropertyId && properties && !selectedProperty) {
      const prop = properties.find((p) => p.id === initialPropertyId);
      if (prop) {
        setSelectedProperty(prop);
        setValue('propertyId', prop.id);
      }
    }
  }, [initialPropertyId, properties, selectedProperty, setValue]);

  useEffect(() => {
    if (initialQuoteId && !prefilled && usableQuotes.length > 0) {
      const quote = usableQuotes.find((q) => q.id === initialQuoteId);
      if (quote) {
        setSelectedQuote(quote);
        setValue('quoteId', quote.id);
        setPrefilled(true);
      }
    }
  }, [initialQuoteId, usableQuotes, prefilled, setValue]);

  // Auto-select best usable quote (accepted)
  useEffect(() => {
    if (usableQuotes.length > 0 && !selectedQuoteId && !initialQuoteId) {
      const quote = usableQuotes[0]!;
      setSelectedQuote(quote);
      setValue('quoteId', quote.id);
    }
  }, [usableQuotes, selectedQuoteId, initialQuoteId, setValue]);

  // ---- beforeunload ----
  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent): void {
      if (isDirty) {
        e.preventDefault();
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  useEffect(() => {
    if (summaryTab === 'quote' && !selectedQuote) {
      setSummaryTab(selectedCustomer ? 'customer' : 'property');
    }
    if (summaryTab === 'customer' && !selectedCustomer) {
      setSummaryTab('property');
    }
  }, [selectedQuote, selectedCustomer, summaryTab]);

  // Cleanup stale taskAssignments when a team member is removed
  useEffect(() => {
    const validUserIds = new Set(teamMembers.map((m) => m.userId));
    const current = form.getValues('taskAssignments');
    const filtered = current.filter((a) => validUserIds.has(a.assignedToUserId));
    if (filtered.length !== current.length) {
      setValue('taskAssignments', filtered);
    }
  }, [teamMembers, form, setValue]);

  // ---- Handlers ----

  function handleCustomerSelect(customer: Customer): void {
    setSelectedCustomer(customer);
    setValue('customerId', customer.id);
    setShowCustomerDropdown(false);
    setCustomerSearch('');
    setValue('propertyId', '');
    setValue('quoteId', '');
    setSelectedProperty(null);
    setSelectedQuote(null);
    setIsNameManuallyEdited(false);
  }

  function clearCustomer(): void {
    setSelectedCustomer(null);
    setValue('customerId', '');
    setValue('propertyId', '');
    setValue('quoteId', '');
    setSelectedProperty(null);
    setSelectedQuote(null);
    setValue('teamMembers', []);
    setValue('projectManagerId', '');
    setValue('excludedStepIds', []);
    setValue('taskAssignments', []);
    setValue('taskMilestoneOverrides', []);
    setValue(
      'milestones',
      DEFAULT_MILESTONES.map((m, i) => ({
        id: crypto.randomUUID(),
        name: m.name,
        type: m.type,
        order: i + 1,
      })),
    );
    setEditingMilestoneId(null);
    setIsNameManuallyEdited(false);
  }

  function handlePropertySelect(property: CustomerPropertyResponse): void {
    setSelectedProperty(property);
    setValue('propertyId', property.id);
    setValue('quoteId', '');
    setSelectedQuote(null);
    setValue('teamMembers', []);
    setValue('projectManagerId', '');
    setValue('excludedStepIds', []);
    setValue('taskAssignments', []);
    setValue('taskMilestoneOverrides', []);
    setValue(
      'milestones',
      DEFAULT_MILESTONES.map((m, i) => ({
        id: crypto.randomUUID(),
        name: m.name,
        type: m.type,
        order: i + 1,
      })),
    );
    setEditingMilestoneId(null);
    setIsNameManuallyEdited(false);
  }

  function handleQuoteSelect(selectedId: string): void {
    const found = usableQuotes.find((aq) => aq.id === selectedId);
    if (found) {
      setSelectedQuote(found);
      setValue('quoteId', found.id);
    }
    setIsNameManuallyEdited(false);
  }

  function handleAddTeamMember(emp: EmployeeListItem): void {
    const current = [...teamMembers];
    if (current.some((m) => m.userId === emp.userId)) return;
    current.push({
      userId: emp.userId,
      roleName: emp.designation || 'Team Member',
      isProjectManager: false,
    });
    setValue('teamMembers', current);
    setTeamSearch('');
  }

  function handleRemoveTeamMember(userId: string): void {
    const updated = teamMembers.filter((m) => m.userId !== userId);
    setValue('teamMembers', updated);
    if (watch('projectManagerId') === userId) {
      setValue('projectManagerId', '');
    }
  }

  function handleRoleChange(userId: string, roleName: string): void {
    setValue(
      'teamMembers',
      teamMembers.map((m) => (m.userId === userId ? { ...m, roleName } : m)),
    );
  }

  function handleMakePM(userId: string): void {
    setValue('projectManagerId', userId);
    setValue(
      'teamMembers',
      teamMembers.map((m) => {
        if (m.userId === userId) {
          return { ...m, isProjectManager: true, roleName: 'Project Manager' };
        }
        if (m.isProjectManager) {
          const emp = employees.find((e) => e.userId === m.userId);
          return {
            ...m,
            isProjectManager: false,
            roleName: emp?.designation || 'Team Member',
          };
        }
        return { ...m, isProjectManager: false };
      }),
    );
  }

  function toggleTask(templateId: string, isMandatory: boolean): void {
    if (isMandatory) return;
    const current = [...excludedIds];
    const idx = current.indexOf(templateId);
    if (idx >= 0) {
      current.splice(idx, 1);
    } else {
      current.push(templateId);
    }
    setValue('excludedStepIds', current);
  }

  function handleAssignmentChange(templateId: string, userId: string | null): void {
    const current = [...taskAssignments];
    const idx = current.findIndex((a) => a.workflowStepId === templateId);
    if (!userId || userId === 'auto') {
      if (idx >= 0) current.splice(idx, 1);
    } else {
      if (idx >= 0) {
        current[idx] = { workflowStepId: templateId, assignedToUserId: userId };
      } else {
        current.push({ workflowStepId: templateId, assignedToUserId: userId });
      }
    }
    setValue('taskAssignments', current);
  }

  function handleMilestoneOverride(templateId: string, newOrder: number): void {
    const template = templates?.find((t) => t.id === templateId);
    const defaultOrder = template?.defaultMilestoneType
      ? (milestones.find((m) => m.type === template.defaultMilestoneType)?.order ?? 0)
      : 0;

    const current = [...taskMilestoneOverrides];
    const idx = current.findIndex((o) => o.workflowStepId === templateId);

    if (newOrder === defaultOrder) {
      if (idx >= 0) current.splice(idx, 1);
    } else {
      if (idx >= 0) {
        current[idx] = { workflowStepId: templateId, milestoneOrder: newOrder };
      } else {
        current.push({ workflowStepId: templateId, milestoneOrder: newOrder });
      }
    }
    setValue('taskMilestoneOverrides', current);
  }

  function handleAddMilestone(): void {
    const current = [...milestones];
    const newOrder = current.length > 0 ? Math.max(...current.map((m) => m.order)) + 1 : 1;
    const newId = crypto.randomUUID();
    current.push({
      id: newId,
      name: `Milestone ${newOrder}`,
      type: MilestoneType.CUSTOM,
      order: newOrder,
    });
    setValue('milestones', current);
    setEditingMilestoneId(newId);
    requestAnimationFrame(() => {
      milestoneNameInputRef.current?.focus();
      milestoneNameInputRef.current?.select();
    });
  }

  function handleRemoveMilestone(milestoneId: string): void {
    const milestone = milestones.find((m) => m.id === milestoneId);
    if (!milestone || milestones.length <= 1) return;

    const removedOrder = milestone.order;
    const updated = milestones
      .filter((m) => m.id !== milestoneId)
      .map((m, i) => ({ ...m, order: i + 1 }));
    setValue('milestones', updated);

    const currentOverrides = form.getValues('taskMilestoneOverrides');
    const cleanedOverrides = currentOverrides
      .filter((o) => o.milestoneOrder !== removedOrder)
      .map((o) => {
        if (o.milestoneOrder > removedOrder) {
          return { ...o, milestoneOrder: o.milestoneOrder - 1 };
        }
        return o;
      });
    setValue('taskMilestoneOverrides', cleanedOverrides);

    if (editingMilestoneId === milestoneId) {
      setEditingMilestoneId(null);
    }
  }

  function handleRenameMilestone(milestoneId: string, newName: string): void {
    setValue(
      'milestones',
      milestones.map((m) => (m.id === milestoneId ? { ...m, name: newName } : m)),
    );
  }

  async function handleSubmit(): Promise<void> {
    const valid = await form.trigger();
    if (!valid) {
      const fieldErrors = form.formState.errors;
      const FIELD_LABELS: Record<string, string> = {
        customerId: 'Customer',
        propertyId: 'Property',
        quoteId: 'Quote',
        name: 'Project Name',
        description: 'Description',
        priority: 'Priority',
        startDate: 'Start Date',
        endDate: 'End Date',
        projectManagerId: 'Project Manager',
        teamMembers: 'Team Members',
        milestones: 'Milestones',
        excludedStepIds: 'Tasks',
        taskAssignments: 'Task Assignments',
        taskMilestoneOverrides: 'Task Milestones',
      };
      const errorFields = Object.keys(fieldErrors);
      const labels = errorFields.map((k) => FIELD_LABELS[k] || k).join(', ');
      showToast.error(`Please fix errors in: ${labels}`);
      return;
    }

    const values = form.getValues();
    const members = values.teamMembers.filter((m) => m.userId);
    const excluded = values.excludedStepIds.length > 0 ? values.excludedStepIds : undefined;

    try {
      const milestonesPayload = values.milestones.map((m) => ({
        name: m.name,
        type: m.type,
        order: m.order,
      }));

      const resolvedAssignments: Array<{ workflowStepId: string; assignedToUserId: string }> = [];
      const includedSteps = (templates || []).filter((t) => !values.excludedStepIds.includes(t.id));
      for (const step of includedSteps) {
        const assignee = getEffectiveAssignee(step.id);
        if (assignee) {
          resolvedAssignments.push({ workflowStepId: step.id, assignedToUserId: assignee });
        }
      }
      const assignmentsPayload = resolvedAssignments.length > 0 ? resolvedAssignments : undefined;

      const milestoneOverridesPayload =
        values.taskMilestoneOverrides.length > 0 ? values.taskMilestoneOverrides : undefined;

      const result = await convertMutation.mutateAsync({
        quoteId: values.quoteId,
        payload: {
          name: values.name || undefined,
          description: values.description || undefined,
          projectManagerId: values.projectManagerId || undefined,
          teamMembers: members.length > 0 ? members : undefined,
          startDate: values.startDate || undefined,
          endDate: values.endDate || undefined,
          priority: values.priority || undefined,
          excludedStepIds: excluded,
          milestones: milestonesPayload,
          taskAssignments: assignmentsPayload,
          taskMilestoneOverrides: milestoneOverridesPayload,
        },
      });

      showToast.success(`Project ${result.projectNumber} created successfully!`);
      router.push(ROUTES.PROJECTS.LIST);
    } catch (error) {
      showToast.error(getErrorMessage(error));
    }
  }

  function handleCancel(): void {
    if (isDirty && !window.confirm('You have unsaved changes. Are you sure you want to leave?')) {
      return;
    }
    router.push(ROUTES.PROJECTS.LIST);
  }

  // ---- Customer search results (server-side filtered) ----
  const searchResults = debouncedCustomerSearch.length >= 2 ? customers : [];

  // ---- Employee filtering for team section ----
  const selectedUserIds = useMemo(() => new Set(teamMembers.map((m) => m.userId)), [teamMembers]);

  const filteredEmployees = useMemo(() => {
    if (!teamSearch.trim()) return employees;
    const q = teamSearch.toLowerCase();
    return employees.filter((e) => {
      const name = `${e.user?.firstName || ''} ${e.user?.lastName || ''}`.toLowerCase();
      return (
        name.includes(q) ||
        e.user?.email?.toLowerCase().includes(q) ||
        e.email?.toLowerCase().includes(q) ||
        e.designation?.toLowerCase().includes(q) ||
        e.department?.toLowerCase().includes(q)
      );
    });
  }, [employees, teamSearch]);

  // ---- Phase 2: Derived state for assignments and milestones ----

  const getEffectiveAssignee = useCallback(
    (templateId: string): string | null => {
      const manual = taskAssignments.find((a) => a.workflowStepId === templateId);
      if (manual) return manual.assignedToUserId;
      const template = templates?.find((t) => t.id === templateId);
      if (!template?.defaultRoleCode) return null;
      return memberRoleMap.get(template.defaultRoleCode.toLowerCase()) ?? null;
    },
    [taskAssignments, templates, memberRoleMap],
  );

  const isManualAssignment = useCallback(
    (templateId: string): boolean => taskAssignments.some((a) => a.workflowStepId === templateId),
    [taskAssignments],
  );

  const getEffectiveMilestoneOrder = useCallback(
    (templateId: string): number => {
      const override = taskMilestoneOverrides.find((o) => o.workflowStepId === templateId);
      if (override) return override.milestoneOrder;
      const template = templates?.find((t) => t.id === templateId);
      if (!template?.defaultMilestoneType) return 0;
      const milestone = milestones.find((m) => m.type === template.defaultMilestoneType);
      return milestone?.order ?? 0;
    },
    [taskMilestoneOverrides, templates, milestones],
  );

  const effectiveMilestoneTaskMap = useMemo(() => {
    const map = new Map<number, WorkflowStep[]>();
    for (const t of includedTemplates) {
      const order = getEffectiveMilestoneOrder(t.id);
      const existing = map.get(order) || [];
      existing.push(t);
      map.set(order, existing);
    }
    return map;
  }, [includedTemplates, getEffectiveMilestoneOrder]);

  const watchedName = watch('name');
  const canSubmit =
    !isPending &&
    !propertyConverted &&
    !linkedQuoteNotAccepted &&
    !!selectedCustomerId &&
    !!selectedPropertyId &&
    !!selectedQuoteId &&
    !!watchedName &&
    watchedName.length >= 3;

  // ===========================================================================
  // Render
  // ===========================================================================

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href={ROUTES.PROJECTS.LIST}>Projects</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>New Project</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Page header */}
      <div>
        <h1 className="text-lg font-semibold">Create New Project</h1>
        <p className="mt-1 text-sm text-foreground-secondary">
          Select a customer, property, and an accepted quote to create a new project.
        </p>
      </div>

      {/* ================================================================== */}
      {/* Section 1: Customer, Property & Quote Selection */}
      {/* ================================================================== */}
      <Card>
        <CardHeader className="justify-start gap-2">
          <FileText className="size-4 text-foreground-secondary" />
          <h2 className="text-sm font-semibold">Customer & Property Selection</h2>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Customer Search */}
          <div className="space-y-2">
            <Label required>Customer</Label>
            {selectedCustomer ? (
              <div className="flex items-center justify-between rounded-lg border border-primary/30 bg-primary/5 px-3 py-2.5 text-sm">
                <div className="flex items-center gap-2.5">
                  <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    {selectedCustomer.firstName?.charAt(0) || ''}
                    {selectedCustomer.lastName?.charAt(0) || ''}
                  </div>
                  <div>
                    <span className="font-medium">
                      {selectedCustomer.firstName} {selectedCustomer.lastName || ''}
                    </span>
                    <span className="ml-2 text-foreground-secondary">{selectedCustomer.phone}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={clearCustomer}
                  className="rounded p-1 text-foreground-tertiary transition-colors duration-fast hover:bg-background-secondary hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              </div>
            ) : (
              <div className="relative">
                <Input
                  placeholder="Search by name, phone, or email..."
                  leftIcon={<Search className="size-4" />}
                  value={customerSearch}
                  onChange={(e) => {
                    setCustomerSearch(e.target.value);
                    setShowCustomerDropdown(true);
                  }}
                  onFocus={() => {
                    if (customerSearch.trim().length >= 2) setShowCustomerDropdown(true);
                  }}
                  onBlur={() => {
                    blurTimeoutRef.current = setTimeout(() => setShowCustomerDropdown(false), 200);
                  }}
                />
                {showCustomerDropdown && customerSearch.trim().length >= 2 && (
                  <div className="absolute z-20 mt-1 w-full rounded-lg border border-border-light bg-background shadow-sm">
                    <div className="max-h-56 overflow-auto p-1">
                      {customersFetching ? (
                        <div className="flex items-center gap-2 px-3 py-2">
                          <Spinner size="xs" />
                          <span className="text-sm text-foreground-secondary">Searching...</span>
                        </div>
                      ) : searchResults.length === 0 ? (
                        <p className="px-3 py-2 text-sm text-foreground-secondary">
                          No customers found
                        </p>
                      ) : (
                        searchResults.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm transition-colors duration-fast hover:bg-background-secondary"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => handleCustomerSelect(c)}
                          >
                            <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-2xs font-medium text-primary">
                              {c.firstName?.charAt(0) || ''}
                              {c.lastName?.charAt(0) || ''}
                            </div>
                            <div>
                              <span className="font-medium">
                                {c.firstName} {c.lastName || ''}
                              </span>
                              <span className="ml-2 text-foreground-secondary">{c.phone}</span>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
            {errors.customerId && <p className="text-xs text-error">{errors.customerId.message}</p>}
          </div>

          {/* Property Selector */}
          {selectedCustomerId && (
            <div className="space-y-2">
              <Label required>Property</Label>
              {propertiesLoading ? (
                <div className="flex items-center gap-2 py-2">
                  <Spinner size="xs" />
                  <span className="text-sm text-foreground-secondary">Loading properties...</span>
                </div>
              ) : !properties || properties.length === 0 ? (
                <div className="flex items-center gap-2 rounded-lg bg-info/10 px-3 py-2">
                  <Info className="size-3.5 text-info" />
                  <p className="text-xs text-info">No properties found for this customer.</p>
                </div>
              ) : (
                <Select
                  value={selectedPropertyId || ''}
                  onValueChange={(val) => {
                    const prop = properties.find((p) => p.id === val);
                    if (prop) handlePropertySelect(prop);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a property" />
                  </SelectTrigger>
                  <SelectContent>
                    {properties.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.consumerName || p.propertyName || p.address || 'Unnamed Property'}
                        {p.status === PropertyStatus.CONVERTED && ' (Converted)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {errors.propertyId && (
                <p className="text-xs text-error">{errors.propertyId.message}</p>
              )}
            </div>
          )}

          {/* Linked quote not accepted */}
          {linkedQuoteNotAccepted && (
            <div className="flex items-center gap-2 rounded-lg border border-warning/30 bg-warning/5 px-4 py-3">
              <AlertTriangle className="size-4 shrink-0 text-warning" />
              <span className="text-sm text-warning">
                The linked quote has not been accepted yet. Only accepted quotes can be converted to
                projects.
              </span>
            </div>
          )}

          {/* Converted property error */}
          {propertyConverted && (
            <div className="flex items-center gap-2 rounded-lg border border-error/30 bg-error/5 px-4 py-3">
              <AlertCircle className="size-4 shrink-0 text-error" />
              <span className="text-sm text-error">
                This property already has an active project. Choose a different property.
              </span>
            </div>
          )}

          {/* Quote Selection (mandatory) */}
          {selectedPropertyId && !propertyConverted && (
            <div className="space-y-2">
              <Label required>Quote</Label>
              {quotesLoading ? (
                <div className="flex items-center gap-2 py-2">
                  <Spinner size="xs" />
                  <span className="text-sm text-foreground-secondary">Loading quotes...</span>
                </div>
              ) : usableQuotes.length === 0 ? (
                <div className="flex items-center gap-2 rounded-lg border border-warning/30 bg-warning/5 px-3 py-2">
                  <AlertTriangle className="size-3.5 text-warning" />
                  <p className="text-xs text-warning">
                    No accepted quotes available for this property. Please create and accept a quote
                    first.
                  </p>
                </div>
              ) : (
                <Select value={selectedQuoteId || ''} onValueChange={handleQuoteSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an accepted quote" />
                  </SelectTrigger>
                  <SelectContent>
                    {usableQuotes.map((q) => (
                      <SelectItem key={q.id} value={q.id}>
                        {q.quoteNumber} · {formatSystemSize(q.systemSizeKw)} kW ·{' '}
                        {q.finalPrice != null ? formatCurrency(q.finalPrice) : '—'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {errors.quoteId && <p className="text-xs text-error">{errors.quoteId.message}</p>}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ================================================================== */}
      {/* Section 2: Context Card (Tab-based Summary) */}
      {/* ================================================================== */}
      {selectedProperty && !propertyConverted && (
        <Card>
          <CardHeader className="justify-start gap-2">
            <ClipboardList className="size-4 text-foreground-secondary" />
            <h2 className="text-sm font-semibold">Summary</h2>
          </CardHeader>
          <CardContent>
            <Tabs value={summaryTab} onValueChange={setSummaryTab}>
              <TabsList variant="underline" className="w-full justify-start">
                {selectedCustomer && (
                  <TabsTrigger variant="underline" value="customer" className="gap-1.5 text-xs">
                    <User className="size-3.5" />
                    Customer
                  </TabsTrigger>
                )}
                <TabsTrigger variant="underline" value="property" className="gap-1.5 text-xs">
                  <Building2 className="size-3.5" />
                  Property
                </TabsTrigger>
                {selectedQuote && (
                  <TabsTrigger variant="underline" value="quote" className="gap-1.5 text-xs">
                    <FileText className="size-3.5" />
                    Quote
                  </TabsTrigger>
                )}
              </TabsList>

              {/* Customer Tab */}
              {selectedCustomer && (
                <TabsContent value="customer">
                  <div className="space-y-2">
                    <FieldRow
                      label="Name"
                      value={`${selectedCustomer.firstName || ''} ${selectedCustomer.lastName || ''}`.trim()}
                    />
                    <FieldRow label="Phone" value={selectedCustomer.phone} />
                    {selectedCustomer.email && (
                      <FieldRow label="Email" value={selectedCustomer.email} />
                    )}
                    {selectedCustomer.city && (
                      <FieldRow label="City" value={selectedCustomer.city} />
                    )}
                  </div>
                </TabsContent>
              )}

              {/* Property Tab */}
              <TabsContent value="property">
                <div className="space-y-2">
                  <FieldRow
                    label="Name"
                    value={selectedProperty.propertyName || selectedProperty.consumerName || '—'}
                  />
                  {selectedProperty.address && (
                    <FieldRow label="Address" value={selectedProperty.address} />
                  )}
                  {selectedProperty.connectionType && (
                    <FieldRow label="Connection" value={selectedProperty.connectionType} />
                  )}
                  {selectedProperty.sanctionedLoad != null && (
                    <FieldRow label="Sanc. Load" value={`${selectedProperty.sanctionedLoad} kW`} />
                  )}
                  {selectedProperty.monthlyBill != null && (
                    <FieldRow
                      label="Monthly Bill"
                      value={formatCurrency(selectedProperty.monthlyBill)}
                    />
                  )}
                </div>
              </TabsContent>

              {/* Quote Tab */}
              {selectedQuote && (
                <TabsContent value="quote">
                  <div className="space-y-2">
                    <FieldRow label="Number" value={selectedQuote.quoteNumber} />
                    <FieldRow
                      label="System Size"
                      value={`${formatSystemSize(selectedQuote.systemSizeKw)} kW`}
                    />
                    <FieldRow
                      label="Type"
                      value={
                        PROJECT_TYPE_LABELS[selectedQuote.projectType] || selectedQuote.projectType
                      }
                    />
                    {selectedQuote.finalPrice != null && (
                      <FieldRow
                        label="Final Price"
                        value={formatCurrency(selectedQuote.finalPrice)}
                      />
                    )}
                    {selectedQuote.effectivePrice != null && (
                      <FieldRow
                        label="Eff. Price"
                        value={formatCurrency(selectedQuote.effectivePrice)}
                      />
                    )}
                    {selectedQuote.subsidyAmount != null && selectedQuote.subsidyAmount > 0 && (
                      <FieldRow
                        label="Subsidy"
                        value={formatCurrency(selectedQuote.subsidyAmount)}
                      />
                    )}
                    <FieldRow label="Quote Date" value={formatDate(selectedQuote.quoteDate)} />
                    {selectedQuote.validUntil && (
                      <FieldRow label="Valid Until" value={formatDate(selectedQuote.validUntil)} />
                    )}
                  </div>
                </TabsContent>
              )}
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* ================================================================== */}
      {/* Section 3: Project Details */}
      {/* ================================================================== */}
      {selectedPropertyId && !propertyConverted && (
        <Card>
          <CardHeader className="justify-start gap-2">
            <Pencil className="size-4 text-foreground-secondary" />
            <h2 className="text-sm font-semibold">Project Details</h2>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* ---- Project Name ---- */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label required>Project Name</Label>
                {!isNameManuallyEdited && autoName && (
                  <Badge variant="secondary" size="xs">
                    Auto-generated
                  </Badge>
                )}
              </div>
              <Input
                placeholder="e.g., Rajesh Kumar - Residence - 5kW"
                {...register('name', {
                  onChange: () => {
                    if (!isNameManuallyEdited) setIsNameManuallyEdited(true);
                  },
                })}
              />
              {errors.name && <p className="text-xs text-error">{errors.name.message}</p>}
            </div>

            {/* ---- System Specs sub-group (read-only from quote) ---- */}
            {selectedQuote && (
              <fieldset className="space-y-3">
                <div className="flex items-center gap-2">
                  <Zap className="size-3.5 text-foreground-tertiary" />
                  <span className="text-xs font-medium uppercase tracking-wider text-foreground-tertiary">
                    System Specifications
                  </span>
                  <Badge variant="outline" size="xs" className="gap-1">
                    <Lock className="size-2.5" />
                    From Quote
                  </Badge>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Project Type</Label>
                    <Input
                      readOnly
                      value={
                        PROJECT_TYPE_LABELS[selectedQuote.projectType] || selectedQuote.projectType
                      }
                      className="bg-background-secondary text-foreground-secondary cursor-not-allowed"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>System Size (kW)</Label>
                    <Input
                      readOnly
                      value={`${formatSystemSize(selectedQuote.systemSizeKw)} kW`}
                      className="bg-background-secondary text-foreground-secondary cursor-not-allowed"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Estimated Cost</Label>
                    <div className="flex h-9 items-center rounded-md border border-border-light bg-background-secondary px-3">
                      <IndianRupee className="mr-1 size-3.5 text-foreground-tertiary" />
                      <span className="text-sm text-foreground-secondary">
                        {selectedQuote.finalPrice != null
                          ? formatCurrency(selectedQuote.finalPrice).replace('₹', '')
                          : '—'}
                      </span>
                    </div>
                  </div>
                </div>
              </fieldset>
            )}

            {/* ---- Planning sub-group ---- */}
            <fieldset className="space-y-3">
              <div className="flex items-center gap-2">
                <Calendar className="size-3.5 text-foreground-tertiary" />
                <span className="text-xs font-medium uppercase tracking-wider text-foreground-tertiary">
                  Planning
                </span>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Flag className="size-3 text-foreground-tertiary" />
                    <Label>Priority</Label>
                  </div>
                  <Select
                    value={watch('priority') || ProjectPriority.NORMAL}
                    onValueChange={(val) => setValue('priority', val as ProjectPriority)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(PROJECT_PRIORITY_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input type="date" {...register('startDate')} />
                  {errors.startDate && (
                    <p className="text-xs text-error">{errors.startDate.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Input type="date" {...register('endDate')} />
                  {errors.endDate && <p className="text-xs text-error">{errors.endDate.message}</p>}
                </div>
              </div>
            </fieldset>

            {/* ---- Description ---- */}
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                rows={2}
                placeholder="Brief project description (optional)"
                {...register('description')}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* ================================================================== */}
      {/* Section 4: Team Selection */}
      {/* ================================================================== */}
      {selectedPropertyId && !propertyConverted && (
        <Card>
          <CardHeader className="justify-start gap-2">
            <Users className="size-4 text-foreground-secondary" />
            <h2 className="text-sm font-semibold">
              Team Selection
              {teamMembers.length > 0 && (
                <span className="ml-1.5 text-foreground-secondary font-normal">
                  ({teamMembers.length} selected)
                </span>
              )}
            </h2>
          </CardHeader>
          <CardContent className="space-y-4">
            {employeesLoading ? (
              <div className="flex items-center gap-2 py-4">
                <Spinner size="sm" />
                <span className="text-sm text-foreground-secondary">Loading employees...</span>
              </div>
            ) : employees.length === 0 ? (
              <div className="flex items-center gap-2 rounded-lg border border-error/30 bg-error/5 px-4 py-3">
                <AlertCircle className="size-4 text-error" />
                <span className="text-sm text-error">
                  No employees found. Add employees to your organization first.
                </span>
              </div>
            ) : (
              <>
                {/* Search */}
                <Input
                  placeholder="Search employees by name, designation, or department..."
                  leftIcon={<Search className="size-4" />}
                  value={teamSearch}
                  onChange={(e) => setTeamSearch(e.target.value)}
                />

                {/* Employee List */}
                <div className="max-h-72 overflow-y-auto rounded-lg border border-border-light">
                  {filteredEmployees.length === 0 ? (
                    <p className="px-4 py-6 text-center text-sm text-foreground-secondary">
                      No employees match your search.
                    </p>
                  ) : (
                    <div className="divide-y divide-border-light">
                      {filteredEmployees.map((emp) => {
                        const isSelected = selectedUserIds.has(emp.userId);
                        const w = workloadMap.get(emp.userId);
                        const activeProjects = w?.activeProjectCount ?? 0;
                        const inProgressTasks = w?.inProgressTaskCount ?? 0;

                        return (
                          <div
                            key={emp.id}
                            className={cn(
                              'flex items-center justify-between px-3 py-2.5 transition-colors duration-fast',
                              isSelected ? 'bg-primary/5' : 'hover:bg-background-secondary',
                            )}
                          >
                            <div className="flex min-w-0 items-center gap-2.5">
                              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                                {getEmployeeInitials(emp)}
                              </div>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium">
                                  {getEmployeeDisplayName(emp)}
                                </p>
                                <p className="truncate text-2xs text-foreground-secondary">
                                  {[emp.designation, emp.department].filter(Boolean).join(' • ') ||
                                    '—'}
                                </p>
                                {getDisplayRoles(emp.roles).length > 0 && (
                                  <div className="mt-0.5 flex flex-wrap gap-1">
                                    {getDisplayRoles(emp.roles).map((role) => (
                                      <Badge key={role} variant="blue-subtle" size="xs">
                                        {role}
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                              <div className="hidden items-center gap-1.5 sm:flex">
                                <Badge variant={getWorkloadVariant(activeProjects)} size="xs">
                                  {activeProjects} projects
                                </Badge>
                                <Badge variant="secondary" size="xs">
                                  {inProgressTasks} tasks
                                </Badge>
                              </div>
                              {isSelected ? (
                                <div className="flex size-7 items-center justify-center rounded-md bg-primary/10">
                                  <CheckCircle2 className="size-4 text-primary" />
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleAddTeamMember(emp)}
                                  className="flex size-7 items-center justify-center rounded-md border border-border-light text-foreground-secondary transition-colors hover:border-primary hover:bg-primary/5 hover:text-primary"
                                >
                                  <Plus className="size-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Selected Team Panel */}
                {teamMembers.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground-tertiary">
                      Selected Team ({teamMembers.length})
                    </h3>
                    <div className="space-y-2">
                      {teamMembers.map((member) => {
                        const emp = employees.find((e) => e.userId === member.userId);
                        if (!emp) return null;
                        const isPM = watch('projectManagerId') === member.userId;
                        const w = workloadMap.get(member.userId);

                        return (
                          <div
                            key={member.userId}
                            className={cn(
                              'flex items-center justify-between rounded-lg border px-3 py-2.5',
                              isPM ? 'border-primary/40 bg-primary/5' : 'border-border-light',
                            )}
                          >
                            <div className="flex min-w-0 items-center gap-2.5">
                              <div
                                className={cn(
                                  'flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                                  isPM ? 'bg-primary text-white' : 'bg-primary/10 text-primary',
                                )}
                              >
                                {isPM ? <Crown className="size-3.5" /> : getEmployeeInitials(emp)}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="truncate text-sm font-medium">
                                    {getEmployeeDisplayName(emp)}
                                  </span>
                                  {isPM && (
                                    <Badge variant="default" size="xs">
                                      Project Manager
                                    </Badge>
                                  )}
                                </div>
                                <div className="mt-0.5 flex items-center gap-1.5">
                                  <span className="text-2xs text-foreground-secondary">
                                    {w?.activeProjectCount ?? 0} projects
                                  </span>
                                  <span className="text-foreground-tertiary">·</span>
                                  <span className="text-2xs text-foreground-secondary">
                                    {w?.totalTaskCount ?? 0} tasks
                                  </span>
                                  <span className="text-foreground-tertiary">·</span>
                                  <span className="text-2xs text-foreground-secondary">
                                    {w?.inProgressTaskCount ?? 0} in progress
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                              <Input
                                className="h-7 w-28 text-xs"
                                placeholder="Role"
                                value={member.roleName ?? ''}
                                onChange={(e) => handleRoleChange(member.userId, e.target.value)}
                                disabled={isPM}
                              />
                              {!isPM && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleMakePM(member.userId)}
                                  className="text-2xs whitespace-nowrap"
                                >
                                  <Crown className="mr-1 size-3" />
                                  Make PM
                                </Button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleRemoveTeamMember(member.userId)}
                                className="rounded p-1 text-foreground-tertiary transition-colors hover:text-error"
                              >
                                <Trash2 className="size-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* ================================================================== */}
      {/* Section 5: Tasks & Milestones (Unified Accordion) */}
      {/* ================================================================== */}
      {selectedPropertyId && !propertyConverted && (
        <Card>
          <CardHeader className="justify-start gap-2">
            <CheckSquare className="size-4 text-foreground-secondary" />
            <h2 className="text-sm font-semibold">
              Tasks & Milestones
              {templates && templates.length > 0 && (
                <span className="ml-1.5 text-foreground-secondary font-normal">
                  ({includedTemplates.length} of {templates.length} tasks · {milestones.length}{' '}
                  milestones)
                </span>
              )}
            </h2>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Info banner */}
            <div className="flex items-start gap-2 rounded-lg bg-info/10 px-3 py-2">
              <Info className="mt-0.5 size-3.5 shrink-0 text-info" />
              <p className="text-xs text-info">
                Tasks are auto-created from templates and auto-assigned by role. Override
                assignments and milestone mapping below.
              </p>
            </div>

            {/* Warnings */}
            {templates && templates.length > 0 && includedTemplates.length === 0 && (
              <div className="flex items-center gap-2 rounded-lg border border-warning/20 bg-warning/5 px-3 py-2">
                <AlertTriangle className="size-3.5 text-warning" />
                <span className="text-xs text-warning">
                  No tasks will be created. You can add tasks manually after project creation.
                </span>
              </div>
            )}

            {unassignedCount > 0 && includedTemplates.length > 0 && (
              <div className="flex items-center gap-2 rounded-lg border border-warning/20 bg-warning/5 px-3 py-2">
                <AlertTriangle className="size-3.5 text-warning" />
                <span className="text-xs text-warning">
                  {unassignedCount} task{unassignedCount > 1 ? 's' : ''} ha
                  {unassignedCount > 1 ? 've' : 's'} no matching team member.
                </span>
              </div>
            )}

            {teamMembers.length === 0 && templates && templates.length > 0 && (
              <div className="flex items-center gap-2 rounded-lg border border-warning/20 bg-warning/5 px-3 py-2">
                <AlertTriangle className="size-3.5 text-warning" />
                <span className="text-xs text-warning">
                  Add team members in Section 4 to enable manual assignment.
                </span>
              </div>
            )}

            {stepsLoading ? (
              <div className="flex items-center gap-2 py-4">
                <Spinner size="sm" />
                <span className="text-sm text-foreground-secondary">Loading workflow steps...</span>
              </div>
            ) : !templates || templates.length === 0 ? (
              <div className="flex items-center gap-2 rounded-lg bg-info/10 px-3 py-2">
                <Info className="size-3.5 text-info" />
                <p className="text-xs text-info">
                  No workflow steps configured. Tasks can be added manually after project creation.
                </p>
              </div>
            ) : (
              <>
                <Accordion
                  type="multiple"
                  defaultValue={['unmapped', ...milestones.map((m) => m.id)]}
                >
                  {/* Unmapped Tasks Group */}
                  {(() => {
                    const unmappedTasks = effectiveMilestoneTaskMap.get(0) || [];
                    const allTasks = templates || [];
                    const unmappedAllTasks = allTasks.filter(
                      (t) => getEffectiveMilestoneOrder(t.id) === 0,
                    );
                    if (unmappedAllTasks.length === 0) return null;
                    return (
                      <AccordionItem value="unmapped" variant="separated">
                        <AccordionTrigger className="px-3 py-2.5">
                          <div className="flex items-center gap-2">
                            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-foreground-tertiary/10 text-xs font-semibold text-foreground-tertiary">
                              —
                            </span>
                            <span className="text-sm font-medium">Unmapped Tasks</span>
                            <span className="text-2xs text-foreground-secondary">
                              {unmappedTasks.length} task{unmappedTasks.length !== 1 ? 's' : ''}
                            </span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <TaskRowGroup
                            tasks={unmappedAllTasks}
                            excludedIds={excludedIds}
                            milestones={milestones}
                            teamMembers={teamMembers}
                            employees={employees}
                            getEffectiveAssignee={getEffectiveAssignee}
                            getEffectiveMilestoneOrder={getEffectiveMilestoneOrder}
                            isManualAssignment={isManualAssignment}
                            onToggleTask={toggleTask}
                            onAssignmentChange={handleAssignmentChange}
                            onMilestoneOverride={handleMilestoneOverride}
                            memberRoleMap={memberRoleMap}
                          />
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })()}

                  {/* Milestone Groups */}
                  {milestones.map((ms) => {
                    const milestoneTasks = effectiveMilestoneTaskMap.get(ms.order) || [];
                    const allTasksForMs = (templates || []).filter(
                      (t) => getEffectiveMilestoneOrder(t.id) === ms.order,
                    );
                    const isEditing = editingMilestoneId === ms.id;

                    return (
                      <AccordionItem key={ms.id} value={ms.id} variant="separated">
                        <AccordionTrigger className="px-3 py-2.5">
                          <div className="flex flex-1 items-center gap-2">
                            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                              {ms.order}
                            </span>
                            {isEditing ? (
                              <Input
                                ref={milestoneNameInputRef}
                                className="h-7 w-48 text-sm"
                                value={ms.name}
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) => handleRenameMilestone(ms.id, e.target.value)}
                                onBlur={() => setEditingMilestoneId(null)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') setEditingMilestoneId(null);
                                }}
                              />
                            ) : (
                              <span className="text-sm font-medium">
                                {ms.name || 'Untitled Milestone'}
                              </span>
                            )}
                            <Badge variant="secondary" shape="rounded" size="xs">
                              {PHASE_LABELS[ms.type] || 'Custom'}
                            </Badge>
                            <span className="text-2xs text-foreground-secondary">
                              {milestoneTasks.length} task{milestoneTasks.length !== 1 ? 's' : ''}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span
                              role="button"
                              tabIndex={0}
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingMilestoneId(ms.id);
                                requestAnimationFrame(() => milestoneNameInputRef.current?.focus());
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.stopPropagation();
                                  setEditingMilestoneId(ms.id);
                                  requestAnimationFrame(() =>
                                    milestoneNameInputRef.current?.focus(),
                                  );
                                }
                              }}
                              className="rounded p-1 text-foreground-tertiary transition-colors duration-fast hover:text-foreground"
                            >
                              <Pencil className="size-3.5" />
                            </span>
                            <span
                              role="button"
                              tabIndex={milestones.length <= 1 ? -1 : 0}
                              aria-disabled={milestones.length <= 1}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (milestones.length > 1) handleRemoveMilestone(ms.id);
                              }}
                              onKeyDown={(e) => {
                                if ((e.key === 'Enter' || e.key === ' ') && milestones.length > 1) {
                                  e.stopPropagation();
                                  handleRemoveMilestone(ms.id);
                                }
                              }}
                              className={cn(
                                'rounded p-1 transition-colors duration-fast',
                                milestones.length <= 1
                                  ? 'cursor-not-allowed text-foreground-tertiary/40'
                                  : 'text-foreground-tertiary hover:text-error',
                              )}
                            >
                              <Trash2 className="size-3.5" />
                            </span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          {allTasksForMs.length === 0 ? (
                            <p className="py-2 text-center text-xs text-foreground-secondary">
                              No tasks assigned to this milestone.
                            </p>
                          ) : (
                            <TaskRowGroup
                              tasks={allTasksForMs}
                              excludedIds={excludedIds}
                              milestones={milestones}
                              teamMembers={teamMembers}
                              employees={employees}
                              getEffectiveAssignee={getEffectiveAssignee}
                              getEffectiveMilestoneOrder={getEffectiveMilestoneOrder}
                              isManualAssignment={isManualAssignment}
                              onToggleTask={toggleTask}
                              onAssignmentChange={handleAssignmentChange}
                              onMilestoneOverride={handleMilestoneOverride}
                              memberRoleMap={memberRoleMap}
                            />
                          )}
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>

                {/* Add Milestone Button */}
                <button
                  type="button"
                  onClick={handleAddMilestone}
                  className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-border-light px-4 py-2.5 text-sm text-foreground-secondary transition-colors duration-fast hover:border-primary hover:bg-primary/5 hover:text-primary"
                >
                  <Plus className="size-3.5" />
                  Add Milestone
                </button>
              </>
            )}

            {/* Milestone validation error */}
            {errors.milestones && (
              <p className="text-xs text-error">
                {typeof errors.milestones.message === 'string'
                  ? errors.milestones.message
                  : 'Please check milestone fields.'}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* ================================================================== */}
      {/* Action Buttons */}
      {/* ================================================================== */}
      {selectedPropertyId && !propertyConverted && (
        <div className="flex items-center justify-end gap-3 pb-8">
          <Button variant="ghost" size="sm" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {isPending ? (
              <>
                <Spinner size="xs" className="mr-1.5" />
                Creating...
              </>
            ) : (
              'Create Project'
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

function FieldRow({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <div className="grid grid-cols-[100px_1fr] gap-x-2 text-sm">
      <span className="text-foreground-secondary">{label}</span>
      <span className="font-medium truncate">{value || '—'}</span>
    </div>
  );
}

interface TaskRowGroupProps {
  tasks: WorkflowStep[];
  excludedIds: string[];
  milestones: Array<{ id: string; name: string; type: string; order: number }>;
  teamMembers: Array<{ userId: string; roleName: string; isProjectManager?: boolean }>;
  employees: EmployeeListItem[];
  getEffectiveAssignee: (templateId: string) => string | null;
  getEffectiveMilestoneOrder: (templateId: string) => number;
  isManualAssignment: (templateId: string) => boolean;
  onToggleTask: (templateId: string, isMandatory: boolean) => void;
  onAssignmentChange: (templateId: string, userId: string | null) => void;
  onMilestoneOverride: (templateId: string, newOrder: number) => void;
  memberRoleMap: Map<string, string>;
}

function TaskRowGroup({
  tasks,
  excludedIds,
  milestones,
  teamMembers,
  employees,
  getEffectiveAssignee,
  getEffectiveMilestoneOrder,
  isManualAssignment,
  onToggleTask,
  onAssignmentChange,
  onMilestoneOverride,
  memberRoleMap,
}: TaskRowGroupProps): React.JSX.Element {
  return (
    <div className="space-y-0.5">
      {tasks.map((t) => {
        const isExcluded = excludedIds.includes(t.id);
        const assigneeId = getEffectiveAssignee(t.id);
        const assigneeEmp = assigneeId ? employees.find((e) => e.userId === assigneeId) : null;
        const isManual = isManualAssignment(t.id);
        const currentMsOrder = getEffectiveMilestoneOrder(t.id);
        const hasNoRoleMatch =
          !!t.defaultRoleCode &&
          !memberRoleMap.has(t.defaultRoleCode.toLowerCase()) &&
          !isManual &&
          !isExcluded;

        return (
          <div
            key={t.id}
            className={cn(
              'flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors duration-fast',
              isExcluded ? 'opacity-50' : 'hover:bg-background-secondary',
            )}
          >
            {/* Include checkbox */}
            <input
              type="checkbox"
              checked={!isExcluded}
              disabled={t.isMandatory}
              onChange={() => onToggleTask(t.id, t.isMandatory)}
              className="size-4 shrink-0 rounded border-border-light accent-primary"
            />

            {/* Task name */}
            <div className="flex min-w-0 flex-1 items-center gap-1.5">
              <span className="truncate text-sm font-medium">{t.name}</span>
              {t.isMandatory && (
                <Badge variant="default" shape="pill" size="xs">
                  Required
                </Badge>
              )}
            </div>

            {/* Role */}
            <span className="hidden w-20 shrink-0 truncate text-xs text-foreground-secondary sm:block">
              {t.defaultRoleCode || '—'}
            </span>

            {/* Duration */}
            <span className="hidden w-10 shrink-0 text-xs text-foreground-secondary sm:block">
              {t.estimatedDurationHours ? `${t.estimatedDurationHours}h` : '—'}
            </span>

            {/* Milestone Select */}
            <div className="w-36 shrink-0">
              <Select
                value={String(currentMsOrder)}
                onValueChange={(val) => onMilestoneOverride(t.id, Number(val))}
                disabled={isExcluded}
              >
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">No Milestone</SelectItem>
                  {milestones.map((ms) => (
                    <SelectItem key={ms.id} value={String(ms.order)}>
                      {ms.name || 'Untitled'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Assigned To Select */}
            <div className="flex w-44 shrink-0 items-center gap-1">
              <Select
                value={isManual ? (assigneeId ?? 'auto') : 'auto'}
                onValueChange={(val) => onAssignmentChange(t.id, val)}
                disabled={isExcluded}
              >
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">
                    Auto
                    {assigneeEmp && !isManual ? ` (${getEmployeeDisplayName(assigneeEmp)})` : ''}
                  </SelectItem>
                  {teamMembers.map((m) => {
                    const emp = employees.find((e) => e.userId === m.userId);
                    return (
                      <SelectItem key={m.userId} value={m.userId}>
                        {emp ? getEmployeeDisplayName(emp) : m.userId}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              {isManual ? (
                <Badge variant="blue-subtle" size="xs">
                  Manual
                </Badge>
              ) : (
                <Badge variant="green-subtle" size="xs">
                  Auto
                </Badge>
              )}
              {hasNoRoleMatch && <AlertTriangle className="size-3 shrink-0 text-warning" />}
            </div>
          </div>
        );
      })}
    </div>
  );
}
