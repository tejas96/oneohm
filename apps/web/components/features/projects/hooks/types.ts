import type {
  FileAttachment,
  MaterialStatus,
  MilestoneStatus,
  MilestoneType,
  PaymentMethod,
  PaymentTransactionStatus,
  ProjectMetadata,
  ProjectPriority,
  ProjectStatus,
  SiteSurveyStatus,
  SurveyData,
  TaskPriority,
  TaskStatus,
} from '@oneohm-epc/shared-types';

// ============================================================================
// Project Detail Types
// ============================================================================

export interface ProjectDetailProperty {
  id: string;
  customerId: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
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
  projectType?: string;
  status: ProjectStatus;
  priority: ProjectPriority;
  progressPercentage: number;
  startDate?: string;
  endDate?: string;
  estimatedCost?: number;
  actualCost?: number;
  metadata?: ProjectMetadata;
  milestones: ProjectMilestone[];
  survey?: ProjectSurvey;
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
}

export interface ProjectMilestone {
  id: string;
  name: string;
  milestoneType: MilestoneType;
  status: MilestoneStatus;
  sequenceOrder: number;
  progressPercentage: number;
  startDate?: string;
  endDate?: string;
}

export interface ProjectSurvey {
  id: string;
  projectId: string;
  surveyCode?: string;
  surveyorId?: string;
  status: SiteSurveyStatus;
  surveyData?: SurveyData;
  documents?: FileAttachment[];
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
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

export interface MilestoneWithPayment extends ProjectMilestone {
  payments: ProjectPayment[];
  totalExpected: number;
  totalPaid: number;
  paymentStatus: 'received' | 'due' | 'pending';
}

export interface ProjectTaskItem {
  id: string;
  code: string;
  name: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignedToUserId?: string;
  assigneeName?: string;
  startDate?: string;
  endDate?: string;
  completionPercentage: number;
  labels?: string[];
  blockedReason?: string;
}
