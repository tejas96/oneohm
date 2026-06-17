import type {
  MaterialStatus,
  MilestoneDisplayStatus,
  PaymentMethod,
  PaymentTransactionStatus,
  ProjectMetadata,
  ProjectPriority,
  ProjectStatus,
  TaskStatus,
  TaskStatusConfig,
} from '@tejas96/shared/types';

// ============================================================================
// Quote Snapshot Spec Types (derived from quote on GET /projects/:id)
// ============================================================================

export interface PanelConfig {
  name: string;
  brand: string;
  isDcr: boolean;
  wattagePerPanel: number;
  quantity: number;
  technology?: string;
  productWarrantyYears?: number;
  performanceWarrantyYears?: number;
}

export interface InverterConfig {
  name: string;
  brand: string;
  capacityKw: number;
  quantity: number;
  productWarrantyYears?: number;
}

// ============================================================================
// Project Detail Types
// ============================================================================

export interface ProjectDetailProperty {
  id: string;
  customerId: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  consumerNumber?: string;
  consumerName?: string;
  discomName?: string;
  connectionType?: string;
  sanctionedLoad?: number;
  monthlyBill?: number;
  propertyName?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  propertyType?: string;
}

export interface ProjectDetail {
  id: string;
  projectNumber: string;
  name: string;
  description?: string;
  quoteId?: string;
  quoteNumber?: string;
  propertyId: string;
  property: ProjectDetailProperty;
  systemSizeKw?: number;
  actualSystemSizeKw?: number;
  projectType?: string;
  status: ProjectStatus;
  priority: ProjectPriority;
  progressPercentage: number;
  startDate?: string;
  endDate?: string;
  estimatedCost?: number;
  actualCost?: number;
  panelConfigs?: PanelConfig[];
  panelCount?: number;
  inverterConfigs?: InverterConfig[];
  inverterCount?: number;
  structureType?: string;
  phaseType?: string;
  metadata?: ProjectMetadata;
  taskStatuses?: TaskStatusConfig[];
  defaultWarehouseId?: string;
  materials: ProjectMaterial[];
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Sub-entity Types
// ============================================================================

export interface ProjectTeamMember {
  id: string;
  userId: string;
  roleName: string;
  isProjectManager: boolean;
  joinedAt: string;
  user?: { firstName?: string; lastName?: string; email?: string };
  rating?: number;
  comment?: string;
}

/**
 * Aggregated milestone data returned by GET /projects/:id/milestones.
 * Computed live from project_tasks — no dedicated milestone table.
 */
export interface MilestoneAggregateItem {
  name: string;
  order: number;
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  blockedTasks: number;
  percent: number;
  status: MilestoneDisplayStatus;
}

export interface ProjectMaterial {
  id: string;
  materialName: string;
  category?: string;
  quantityRequired: number;
  quantityAllocated: number;
  quantityUsed: number;
  unit?: string;
  unitCost?: number;
  totalCost?: number;
  status: MaterialStatus;
}

export interface ProjectPayment {
  id: string;
  paymentNumber: string;
  expectedAmount: number;
  paidAmount: number;
  paymentMethod: PaymentMethod;
  paymentReference?: string;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  transactionId?: string;
  status: PaymentTransactionStatus;
  reconciledAt?: string;
  reconciledBy?: string;
  notes?: string;
  createdAt: string;
}

export interface ProjectDocument {
  id: string;
  documentType: string;
  fileName: string;
  filePath: string;
  fileSize?: number;
  status?: string;
  projectId?: string;
  createdAt: string;
}

// ============================================================================
// Derived / Aggregated Types
// ============================================================================

export interface TaskStatsSummary {
  total: number;
  byStatus: Record<TaskStatus, number>;
}

export interface PaymentSummaryDetail {
  totalExpected: number;
  totalPaid: number;
  pendingAmount: number;
  paymentCount: number;
}

export interface MilestoneWithPayment extends MilestoneAggregateItem {
  payments: ProjectPayment[];
  totalExpected: number;
  totalPaid: number;
  paymentStatus: 'received' | 'due' | 'pending';
}

// ProjectTaskItem is the canonical FDAL type — re-export from the resource layer
// to avoid duplication while keeping the feature types module as the single barrel for consumers.
export type { ProjectTaskItem } from '@/lib/hooks/resources';
