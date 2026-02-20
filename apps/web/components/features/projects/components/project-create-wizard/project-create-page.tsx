'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  ProjectPriority,
  PropertyStatus,
  QuoteStatus,
} from '@oneohm-epc/shared-types';
import {
  AlertCircle,
  AlertTriangle,
  Building2,
  Calendar,
  CheckCircle2,
  CheckSquare,
  ChevronRight,
  ClipboardList,
  Crown,
  FileText,
  Flag,
  IndianRupee,
  Info,
  Lock,
  Milestone,
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
import { useEffect, useMemo, useState } from 'react';
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
  PROJECT_TYPE_OPTIONS,
} from '../../constants';
import {
  useConvertFromQuote,
  useEmployees,
  useInitiateProject,
  useTaskTemplates,
  useTeamWorkload,
  type EmployeeListItem,
  type TaskTemplate,
  type TeamWorkloadItem,
} from '../../hooks';
import {
  projectCreateSchema,
  type ProjectCreateFormData,
} from '../../schemas/project-create.schema';
import {
  getEmployeeDisplayName,
  getEmployeeInitials,
  getWorkloadVariant,
} from '../../utils';

import {
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
import { ROUTES, buildRoute } from '@/lib/config/routes';
import { useDebounce } from '@/lib/hooks';
import {
  cn,
  formatCurrency,
  formatDate,
  formatSystemSize,
  getErrorMessage,
} from '@/lib/utils';

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
      projectType: '',
      systemSizeKw: undefined as unknown as number,
      estimatedCost: undefined,
      priority: ProjectPriority.NORMAL,
      startDate: '',
      endDate: '',
      description: '',
      projectManagerId: '',
      teamMembers: [],
      excludedTaskTemplateIds: [],
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
  const initiateMutation = useInitiateProject();
  const convertMutation = useConvertFromQuote();
  const isPending = initiateMutation.isPending || convertMutation.isPending;

  // ---- Watched form values ----
  const selectedCustomerId = watch('customerId');
  const selectedPropertyId = watch('propertyId');
  const selectedQuoteId = watch('quoteId');
  const teamMembers = watch('teamMembers');
  const excludedIds = watch('excludedTaskTemplateIds');

  // ---- Local state ----
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedProperty, setSelectedProperty] = useState<CustomerPropertyResponse | null>(null);
  const [selectedQuote, setSelectedQuote] = useState<CustomerQuote | null>(null);
  const [summaryTab, setSummaryTab] = useState<string>('customer');
  const [customerSearch, setCustomerSearch] = useState('');
  const debouncedCustomerSearch = useDebounce(customerSearch, 600);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [isNameManuallyEdited, setIsNameManuallyEdited] = useState(false);
  const [teamSearch, setTeamSearch] = useState('');
  const [prefilled, setPrefilled] = useState(false);

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
    const statusOrder = [
      QuoteStatus.ACCEPTED,
      QuoteStatus.SENT,
      QuoteStatus.VIEWED,
      QuoteStatus.DRAFT,
    ];
    const allowed = new Set<string>(statusOrder);
    return allQuotes
      .filter((q: CustomerQuote) => {
        if (!allowed.has(q.status as string)) return false;
        if (!selectedPropertyId) return true;
        return !q.propertyId || q.propertyId === selectedPropertyId;
      })
      .sort((a: CustomerQuote, b: CustomerQuote) => {
        const propMatch = (id: string | undefined) =>
          id === selectedPropertyId ? 0 : 1;
        const propDiff = propMatch(a.propertyId) - propMatch(b.propertyId);
        if (propDiff !== 0) return propDiff;
        return (
          statusOrder.indexOf(a.status as QuoteStatus) -
          statusOrder.indexOf(b.status as QuoteStatus)
        );
      });
  }, [allQuotes, selectedPropertyId]);

  const { data: employeesData, isLoading: employeesLoading } = useEmployees({ limit: 100 });
  const employees = employeesData?.items ?? [];

  const { data: workloadData } = useTeamWorkload();
  const workloadMap = useMemo(() => {
    const map = new Map<string, TeamWorkloadItem>();
    workloadData?.forEach((w) => map.set(w.userId, w));
    return map;
  }, [workloadData]);

  const { data: templates, isLoading: templatesLoading } = useTaskTemplates({ isActive: true });

  // ---- Derived state ----
  const isQuoteFlow = !!selectedQuoteId && selectedQuoteId !== '';
  const quoteHasValidSize =
    !!selectedQuote && selectedQuote.systemSizeKw > 0;
  const propertyConverted = selectedProperty?.status === PropertyStatus.CONVERTED;

  const memberRoleMap = useMemo(() => {
    const map = new Map<string, string>();
    teamMembers.forEach((m) => {
      if (m.roleName) map.set(m.roleName.toLowerCase(), m.userId);
    });
    return map;
  }, [teamMembers]);

  const includedTemplates = useMemo(
    () => (templates || []).filter((t) => !excludedIds.includes(t.id)),
    [templates, excludedIds],
  );

  const unassignedCount = useMemo(
    () =>
      includedTemplates.filter((t) => {
        if (!t.defaultRoleCode) return true;
        return !memberRoleMap.has(t.defaultRoleCode.toLowerCase());
      }).length,
    [includedTemplates, memberRoleMap],
  );

  // ---- Auto-name generation ----
  const watchedSizeKw = watch('systemSizeKw');
  const autoName = useMemo(() => {
    const custName = selectedCustomer
      ? `${selectedCustomer.firstName || ''} ${selectedCustomer.lastName || ''}`.trim()
      : '';
    const propName =
      selectedProperty?.propertyName ||
      selectedProperty?.consumerName ||
      'Property';
    const sizeValue = selectedQuote?.systemSizeKw || watchedSizeKw;
    const size = sizeValue && sizeValue > 0
      ? `${formatSystemSize(sizeValue)}kW`
      : '';
    const parts = [custName, propName, size].filter(Boolean);
    return parts.join(' - ');
  }, [selectedCustomer, selectedProperty, selectedQuote, watchedSizeKw]);

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
        prefillFromQuote(quote);
        setPrefilled(true);
      }
    }
    // prefillFromQuote is stable (no deps beyond setValue)
  }, [initialQuoteId, usableQuotes, prefilled, setValue]);

  // Auto-select best usable quote (accepted > sent > viewed)
  useEffect(() => {
    if (usableQuotes.length > 0 && !selectedQuoteId && !initialQuoteId) {
      const quote = usableQuotes[0]!;
      setSelectedQuote(quote);
      setValue('quoteId', quote.id);
      prefillFromQuote(quote);
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

  // ---- Handlers ----

  function prefillFromQuote(quote: CustomerQuote): void {
    if (quote.systemSizeKw > 0) {
      setValue('systemSizeKw', quote.systemSizeKw);
    }
    if (quote.projectType) {
      setValue('projectType', quote.projectType);
    }
    setValue('estimatedCost', quote.finalPrice ?? undefined);
  }

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
    setIsNameManuallyEdited(false);
  }

  function handlePropertySelect(property: CustomerPropertyResponse): void {
    setSelectedProperty(property);
    setValue('propertyId', property.id);
    setValue('quoteId', '');
    setSelectedQuote(null);
    setValue('teamMembers', []);
    setValue('projectManagerId', '');
    setValue('excludedTaskTemplateIds', []);
    setIsNameManuallyEdited(false);
  }

  function handleQuoteSelect(selectedId: string): void {
    if (selectedId === '__none__') {
      setSelectedQuote(null);
      setValue('quoteId', '');
      setValue('systemSizeKw', undefined as unknown as number);
      setValue('projectType', '');
      setValue('estimatedCost', undefined);
    } else {
      const found = usableQuotes.find((aq) => aq.id === selectedId);
      if (found) {
        setSelectedQuote(found);
        setValue('quoteId', found.id);
        prefillFromQuote(found);
      }
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
    setValue('excludedTaskTemplateIds', current);
  }

  async function handleSubmit(): Promise<void> {
    const valid = await form.trigger();
    if (!valid) {
      showToast.error('Please fix the errors before submitting.');
      return;
    }

    const values = form.getValues();
    const canConvert =
      !!values.quoteId &&
      values.quoteId !== '' &&
      selectedQuote?.status === QuoteStatus.ACCEPTED;
    const members = values.teamMembers.filter((m) => m.userId);
    const excluded = values.excludedTaskTemplateIds.length > 0
      ? values.excludedTaskTemplateIds
      : undefined;

    try {
      let projectId: string;

      if (canConvert) {
        const result = await convertMutation.mutateAsync({
          quoteId: values.quoteId as string,
          payload: {
            name: values.name || undefined,
            description: values.description || undefined,
            projectManagerId: values.projectManagerId || undefined,
            teamMembers: members.length > 0 ? members : undefined,
            startDate: values.startDate || undefined,
            endDate: values.endDate || undefined,
            priority: values.priority || undefined,
            excludedTaskTemplateIds: excluded,
          },
        });
        projectId = result.id;
      } else {
        const result = await initiateMutation.mutateAsync({
          propertyId: values.propertyId,
          name: values.name,
          systemSizeKw: values.systemSizeKw,
          projectType: values.projectType,
          description: values.description || undefined,
          estimatedCost: values.estimatedCost || undefined,
          priority: values.priority || undefined,
          startDate: values.startDate || undefined,
          endDate: values.endDate || undefined,
          projectManagerId: values.projectManagerId || undefined,
          teamMembers: members.length > 0 ? members : undefined,
          excludedTaskTemplateIds: excluded,
        });
        projectId = result.id;
      }

      showToast.success('Project created successfully!');
      router.push(buildRoute(ROUTES.PROJECTS.DETAIL, { id: projectId }));
    } catch (error) {
      showToast.error(getErrorMessage(error));
    }
  }

  function handleCancel(): void {
    router.push(ROUTES.PROJECTS.LIST);
  }

  // ---- Customer search results (server-side filtered) ----
  const searchResults = debouncedCustomerSearch.length >= 2 ? customers : [];

  // ---- Employee filtering for team section ----
  const selectedUserIds = useMemo(
    () => new Set(teamMembers.map((m) => m.userId)),
    [teamMembers],
  );

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

  // ---- Milestone-to-template mapping ----
  const milestoneTaskMap = useMemo(() => {
    const map = new Map<string, TaskTemplate[]>();
    includedTemplates.forEach((t) => {
      if (t.defaultMilestoneType) {
        const key = t.defaultMilestoneType;
        const arr = map.get(key) || [];
        arr.push(t);
        map.set(key, arr);
      }
    });
    return map;
  }, [includedTemplates]);

  const canSubmit =
    !isPending &&
    !propertyConverted &&
    !!selectedCustomerId &&
    !!selectedPropertyId;

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
          Select a customer, property, and optionally a quote to create a new project.
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
                    <span className="ml-2 text-foreground-secondary">
                      {selectedCustomer.phone}
                    </span>
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
                  onBlur={() =>
                    setTimeout(() => setShowCustomerDropdown(false), 200)
                  }
                />
                {showCustomerDropdown && customerSearch.trim().length >= 2 && (
                  <div className="absolute z-20 mt-1 w-full rounded-lg border border-border-light bg-background shadow-sm">
                    <div className="max-h-56 overflow-auto p-1">
                      {customersFetching ? (
                        <div className="flex items-center gap-2 px-3 py-2">
                          <Spinner size="xs" />
                          <span className="text-sm text-foreground-secondary">
                            Searching...
                          </span>
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
                              <span className="ml-2 text-foreground-secondary">
                                {c.phone}
                              </span>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
            {errors.customerId && (
              <p className="text-xs text-error">{errors.customerId.message}</p>
            )}
          </div>

          {/* Property Selector */}
          {selectedCustomerId && (
            <div className="space-y-2">
              <Label required>Property</Label>
              {propertiesLoading ? (
                <div className="flex items-center gap-2 py-2">
                  <Spinner size="xs" />
                  <span className="text-sm text-foreground-secondary">
                    Loading properties...
                  </span>
                </div>
              ) : !properties || properties.length === 0 ? (
                <div className="flex items-center gap-2 rounded-lg bg-info/10 px-3 py-2">
                  <Info className="size-3.5 text-info" />
                  <p className="text-xs text-info">
                    No properties found for this customer.
                  </p>
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

          {/* Converted property error */}
          {propertyConverted && (
            <div className="flex items-center gap-2 rounded-lg border border-error/30 bg-error/5 px-4 py-3">
              <AlertCircle className="size-4 shrink-0 text-error" />
              <span className="text-sm text-error">
                This property already has an active project. Choose a different property.
              </span>
            </div>
          )}

          {/* Quote Selection */}
          {selectedPropertyId && !propertyConverted && (
            <div className="space-y-2">
              <Label>Quote</Label>
              {quotesLoading ? (
                <div className="flex items-center gap-2 py-2">
                  <Spinner size="xs" />
                  <span className="text-sm text-foreground-secondary">
                    Loading quotes...
                  </span>
                </div>
              ) : usableQuotes.length === 0 ? (
                <div className="flex items-center gap-2 rounded-lg bg-info/10 px-3 py-2">
                  <Info className="size-3.5 text-info" />
                  <p className="text-xs text-info">
                    No quotes found for this customer. Project details will need to be filled manually.
                  </p>
                </div>
              ) : (
                <Select
                  value={selectedQuoteId || ''}
                  onValueChange={handleQuoteSelect}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a quote to pre-fill details" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">No quote (manual entry)</SelectItem>
                    {usableQuotes.map((q) => (
                      <SelectItem key={q.id} value={q.id}>
                        {q.quoteNumber} · {formatSystemSize(q.systemSizeKw)} kW · {q.finalPrice != null ? formatCurrency(q.finalPrice) : '—'} · {q.status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
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
                    value={
                      selectedProperty.propertyName ||
                      selectedProperty.consumerName ||
                      '—'
                    }
                  />
                  {selectedProperty.address && (
                    <FieldRow label="Address" value={selectedProperty.address} />
                  )}
                  {selectedProperty.connectionType && (
                    <FieldRow
                      label="Connection"
                      value={selectedProperty.connectionType}
                    />
                  )}
                  {selectedProperty.sanctionedLoad != null && (
                    <FieldRow
                      label="Sanc. Load"
                      value={`${selectedProperty.sanctionedLoad} kW`}
                    />
                  )}
                  {selectedProperty.monthlyBill != null && (
                    <FieldRow
                      label="Monthly Bill"
                      value={formatCurrency(selectedProperty.monthlyBill)}
                    />
                  )}
                  {selectedProperty.roofAreaSqft != null && (
                    <FieldRow
                      label="Roof Area"
                      value={`${selectedProperty.roofAreaSqft} sq ft`}
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
                        PROJECT_TYPE_LABELS[selectedQuote.projectType] ||
                        selectedQuote.projectType
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
                    {selectedQuote.subsidyAmount != null &&
                      selectedQuote.subsidyAmount > 0 && (
                        <FieldRow
                          label="Subsidy"
                          value={formatCurrency(selectedQuote.subsidyAmount)}
                        />
                      )}
                    <FieldRow
                      label="Quote Date"
                      value={formatDate(selectedQuote.quoteDate)}
                    />
                    {selectedQuote.validUntil && (
                      <FieldRow
                        label="Valid Until"
                        value={formatDate(selectedQuote.validUntil)}
                      />
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
                  <Badge variant="secondary" size="xs">Auto-generated</Badge>
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
              {errors.name && (
                <p className="text-xs text-error">{errors.name.message}</p>
              )}
            </div>

            {/* ---- System Specs sub-group ---- */}
            <fieldset className="space-y-3">
              <div className="flex items-center gap-2">
                <Zap className="size-3.5 text-foreground-tertiary" />
                <span className="text-xs font-medium uppercase tracking-wider text-foreground-tertiary">
                  System Specifications
                </span>
                {isQuoteFlow && quoteHasValidSize && (
                  <Badge variant="outline" size="xs" className="gap-1">
                    <Lock className="size-2.5" />
                    From Quote
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label required={!isQuoteFlow}>Project Type</Label>
                  {isQuoteFlow && quoteHasValidSize && selectedQuote ? (
                    <Input
                      readOnly
                      value={
                        PROJECT_TYPE_LABELS[selectedQuote.projectType] ||
                        selectedQuote.projectType
                      }
                      className="bg-background-secondary text-foreground-secondary cursor-not-allowed"
                    />
                  ) : (
                    <Select
                      value={watch('projectType') || ''}
                      onValueChange={(val) => setValue('projectType', val)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {PROJECT_TYPE_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {errors.projectType && (
                    <p className="text-xs text-error">
                      {errors.projectType.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label required={!isQuoteFlow}>System Size (kW)</Label>
                  {isQuoteFlow && quoteHasValidSize && selectedQuote ? (
                    <Input
                      readOnly
                      value={`${formatSystemSize(selectedQuote.systemSizeKw)} kW`}
                      className="bg-background-secondary text-foreground-secondary cursor-not-allowed"
                    />
                  ) : (
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="e.g., 5"
                      {...register('systemSizeKw', { valueAsNumber: true })}
                    />
                  )}
                  {errors.systemSizeKw && (
                    <p className="text-xs text-error">
                      {errors.systemSizeKw.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Estimated Cost</Label>
                  {isQuoteFlow && quoteHasValidSize && selectedQuote?.finalPrice != null ? (
                    <div className="flex h-9 items-center rounded-md border border-border-light bg-background-secondary px-3">
                      <IndianRupee className="mr-1 size-3.5 text-foreground-tertiary" />
                      <span className="text-sm text-foreground-secondary">
                        {formatCurrency(selectedQuote.finalPrice).replace('₹', '')}
                      </span>
                    </div>
                  ) : (
                    <Input
                      type="number"
                      step="1"
                      placeholder="e.g., 350000"
                      leftIcon={<IndianRupee className="size-3.5" />}
                      {...register('estimatedCost', { valueAsNumber: true })}
                    />
                  )}
                </div>
              </div>
            </fieldset>

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
                    onValueChange={(val) =>
                      setValue('priority', val as ProjectPriority)
                    }
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
                    <p className="text-xs text-error">
                      {errors.startDate.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Input type="date" {...register('endDate')} />
                  {errors.endDate && (
                    <p className="text-xs text-error">{errors.endDate.message}</p>
                  )}
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
                <span className="text-sm text-foreground-secondary">
                  Loading employees...
                </span>
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
                              isSelected
                                ? 'bg-primary/5'
                                : 'hover:bg-background-secondary',
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
                                  {[emp.designation, emp.department]
                                    .filter(Boolean)
                                    .join(' • ') || '—'}
                                </p>
                              </div>
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                              <div className="hidden items-center gap-1.5 sm:flex">
                                <Badge
                                  variant={getWorkloadVariant(activeProjects)}
                                  size="xs"
                                >
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
                        const emp = employees.find(
                          (e) => e.userId === member.userId,
                        );
                        if (!emp) return null;
                        const isPM =
                          watch('projectManagerId') === member.userId;
                        const w = workloadMap.get(member.userId);

                        return (
                          <div
                            key={member.userId}
                            className={cn(
                              'flex items-center justify-between rounded-lg border px-3 py-2.5',
                              isPM
                                ? 'border-primary/40 bg-primary/5'
                                : 'border-border-light',
                            )}
                          >
                            <div className="flex min-w-0 items-center gap-2.5">
                              <div
                                className={cn(
                                  'flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                                  isPM
                                    ? 'bg-primary text-white'
                                    : 'bg-primary/10 text-primary',
                                )}
                              >
                                {isPM ? (
                                  <Crown className="size-3.5" />
                                ) : (
                                  getEmployeeInitials(emp)
                                )}
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
                                value={member.roleName}
                                onChange={(e) =>
                                  handleRoleChange(
                                    member.userId,
                                    e.target.value,
                                  )
                                }
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
                                onClick={() =>
                                  handleRemoveTeamMember(member.userId)
                                }
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
      {/* Section 5: Task Templates Preview */}
      {/* ================================================================== */}
      {selectedPropertyId && !propertyConverted && (
        <Card>
          <CardHeader className="justify-start gap-2">
            <CheckSquare className="size-4 text-foreground-secondary" />
            <h2 className="text-sm font-semibold">
              Task Templates
              {templates && templates.length > 0 && (
                <span className="ml-1.5 text-foreground-secondary font-normal">
                  ({includedTemplates.length} of {templates.length} included)
                </span>
              )}
            </h2>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Info banner */}
            <div className="flex items-start gap-2 rounded-lg bg-info/10 px-3 py-2">
              <Info className="mt-0.5 size-3.5 shrink-0 text-info" />
              <p className="text-xs text-info">
                Tasks are auto-created from templates. Edit assignments and add
                custom tasks on the project page after creation.
              </p>
            </div>

            {/* Warnings */}
            {templates &&
              templates.length > 0 &&
              includedTemplates.length === 0 && (
                <div className="flex items-center gap-2 rounded-lg border border-warning/20 bg-warning/5 px-3 py-2">
                  <AlertTriangle className="size-3.5 text-warning" />
                  <span className="text-xs text-warning">
                    No tasks will be created. You can add tasks manually after
                    project creation.
                  </span>
                </div>
              )}

            {unassignedCount > 0 && includedTemplates.length > 0 && (
              <div className="flex items-center gap-2 rounded-lg border border-warning/20 bg-warning/5 px-3 py-2">
                <AlertTriangle className="size-3.5 text-warning" />
                <span className="text-xs text-warning">
                  {unassignedCount} task
                  {unassignedCount > 1 ? 's' : ''} ha
                  {unassignedCount > 1 ? 've' : 's'} no matching team member.
                </span>
              </div>
            )}

            {templatesLoading ? (
              <div className="flex items-center gap-2 py-4">
                <Spinner size="sm" />
                <span className="text-sm text-foreground-secondary">
                  Loading task templates...
                </span>
              </div>
            ) : !templates || templates.length === 0 ? (
              <div className="flex items-center gap-2 rounded-lg bg-info/10 px-3 py-2">
                <Info className="size-3.5 text-info" />
                <p className="text-xs text-info">
                  No task templates configured. Tasks can be added manually after
                  project creation.
                </p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-lg border border-border-light">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border-light bg-background-secondary">
                      <th className="px-3 py-2 text-left text-2xs font-semibold uppercase tracking-wider text-foreground-secondary">
                        Task
                      </th>
                      <th className="px-3 py-2 text-left text-2xs font-semibold uppercase tracking-wider text-foreground-secondary">
                        Role
                      </th>
                      <th className="hidden px-3 py-2 text-left text-2xs font-semibold uppercase tracking-wider text-foreground-secondary sm:table-cell">
                        Milestone
                      </th>
                      <th className="hidden px-3 py-2 text-left text-2xs font-semibold uppercase tracking-wider text-foreground-secondary sm:table-cell">
                        Duration
                      </th>
                      <th className="hidden px-3 py-2 text-left text-2xs font-semibold uppercase tracking-wider text-foreground-secondary md:table-cell">
                        Auto-Assigned To
                      </th>
                      <th className="px-3 py-2 text-center text-2xs font-semibold uppercase tracking-wider text-foreground-secondary">
                        Include
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-light">
                    {templates.map((t) => {
                      const isExcluded = excludedIds.includes(t.id);
                      const assignedMemberId = t.defaultRoleCode
                        ? memberRoleMap.get(t.defaultRoleCode.toLowerCase())
                        : null;
                      const assignedEmp = assignedMemberId
                        ? employees.find(
                            (e) => e.userId === assignedMemberId,
                          )
                        : null;

                      return (
                        <tr
                          key={t.id}
                          className={cn(
                            'transition-colors duration-fast',
                            isExcluded
                              ? 'opacity-50'
                              : 'hover:bg-background-secondary',
                          )}
                        >
                          <td className="px-3 py-2.5 text-sm">
                            <div className="flex items-center gap-1.5">
                              <span className="font-medium">{t.name}</span>
                              {t.isMandatory && (
                                <span className="rounded bg-primary/10 px-1 py-0.5 text-2xs font-medium text-primary">
                                  Required
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-2.5 text-sm">
                            <div className="flex items-center gap-1">
                              <span className="text-foreground-secondary">
                                {t.defaultRoleCode || '—'}
                              </span>
                              {t.defaultRoleCode &&
                                !assignedEmp &&
                                !isExcluded && (
                                  <AlertTriangle className="size-3 text-warning" />
                                )}
                            </div>
                          </td>
                          <td className="hidden px-3 py-2.5 text-sm text-foreground-secondary sm:table-cell">
                            {t.defaultMilestoneType
                              ? PHASE_LABELS[t.defaultMilestoneType] ||
                                t.defaultMilestoneType
                              : '—'}
                          </td>
                          <td className="hidden px-3 py-2.5 text-sm text-foreground-secondary sm:table-cell">
                            {t.estimatedDurationHours
                              ? `${t.estimatedDurationHours}h`
                              : '—'}
                          </td>
                          <td className="hidden px-3 py-2.5 text-sm md:table-cell">
                            {isExcluded ? (
                              <span className="text-foreground-tertiary">—</span>
                            ) : assignedEmp ? (
                              <span className="font-medium text-foreground">
                                {getEmployeeDisplayName(assignedEmp)}
                              </span>
                            ) : t.defaultRoleCode ? (
                              <span className="text-warning">Unassigned</span>
                            ) : (
                              <span className="text-foreground-tertiary">—</span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <input
                              type="checkbox"
                              checked={!isExcluded}
                              disabled={t.isMandatory}
                              onChange={() =>
                                toggleTask(t.id, t.isMandatory)
                              }
                              className="size-4 rounded border-border-light accent-primary"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ================================================================== */}
      {/* Section 6: Milestones Preview */}
      {/* ================================================================== */}
      {selectedPropertyId && !propertyConverted && (
        <Card>
          <CardHeader className="justify-start gap-2">
            <Milestone className="size-4 text-foreground-secondary" />
            <h2 className="text-sm font-semibold">
              Milestones ({DEFAULT_MILESTONES.length})
            </h2>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-2 rounded-lg bg-info/10 px-3 py-2">
              <Info className="mt-0.5 size-3.5 shrink-0 text-info" />
              <p className="text-xs text-info">
                Default milestones will be created. You can add custom
                milestones, reorder, and map tasks on the project page.
              </p>
            </div>
            <div className="space-y-2">
              {DEFAULT_MILESTONES.map((m, i) => {
                const tasks = milestoneTaskMap.get(m.type) || [];
                return (
                  <div
                    key={m.type}
                    className="rounded-lg border border-border-light px-3 py-2.5"
                  >
                    <div className="flex items-center gap-2">
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                        {i + 1}
                      </span>
                      <span className="text-sm font-medium">{m.name}</span>
                      <Badge variant="secondary" size="xs">
                        {PHASE_LABELS[m.type] || m.type}
                      </Badge>
                    </div>
                    {tasks.length > 0 && (
                      <div className="ml-8 mt-1.5 space-y-0.5">
                        {tasks.map((t) => (
                          <div
                            key={t.id}
                            className="flex items-center gap-1.5 text-2xs text-foreground-secondary"
                          >
                            <ChevronRight className="size-3" />
                            <span>{t.name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
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
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit}
          >
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
