import type {
  ProjectPriority,
  ProjectStatus,
  RoofCondition,
  RoofOrientation,
} from '../enums/project.enum';

/**
 * GPS Coordinates
 * Represents geographical location of a site
 */
export interface GpsCoordinates {
  latitude: number;
  longitude: number;
  accuracy?: number; // In meters
  altitude?: number; // In meters
}

/**
 * Electrical Details
 * Information about the site's electrical system
 */
export interface ElectricalDetails {
  cableLengthACInMtrs?: number;
  cableLengthDCInMtrs?: number;
  conduitLengthInMtrs?: number;
  earthingCableLengthInMtrs?: number;
  elbo?: number;
  inverterCanopy?: boolean;
  elcb?: number;
}

/**
 * Shading Analysis
 * Results of site shading assessment
 */
export interface ShadingAnalysis {
  hasShading: boolean;
  shadingPercentage?: number;
  notes?: string;
}

/**
 * Survey Data
 * Consolidated assessment data collected during a site survey.
 * Stored as JSONB in the site_surveys table.
 */
export interface SurveyData {
  roofType?: string;
  roofCondition?: RoofCondition;
  roofOrientation?: RoofOrientation;
  shadingAnalysis?: ShadingAnalysis;
  notes?: string;
  isMaterialUnloadingAreaSafe?: boolean;
}

/**
 * Photo/Document Attachment
 * Represents an uploaded file
 */
export interface FileAttachment {
  id: string;
  url: string;
  filename: string;
  fileType: string;
  fileSize: number; // In bytes
  uploadedAt: string;
  uploadedBy?: string;
  description?: string;
  category?: string;
}

/**
 * Project Metadata
 * Additional flexible data for projects.
 * Quote-related fields (quoteId, quoteNumber, etc.) are now accessed via
 * the project → quote FK relation, not stored in metadata.
 */
export interface ProjectMetadata {
  actualCost?: number;
  customFields?: Record<string, unknown>;
  tags?: string[];
  externalReferences?: {
    system: string;
    referenceId: string;
  }[];
  [key: string]: unknown;
}

/**
 * Timeline Event
 * Represents a significant event in project timeline
 */
export interface TimelineEvent {
  id: string;
  eventType: string;
  eventDate: string;
  title: string;
  description?: string;
  performedBy?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Material Requirement
 * Simplified material need for project planning
 */
export interface MaterialRequirement {
  productId?: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  estimatedCost?: number;
}

/**
 * Task Checklist Item
 * Individual item in a task checklist
 */
export interface TaskChecklistItem {
  id: string;
  title: string;
  isCompleted: boolean;
  completedAt?: string;
  completedBy?: string;
  order: number;
}

/**
 * Task Checklist
 * Grouped checklist items for a task
 */
export interface TaskChecklist {
  items: TaskChecklistItem[];
}

/**
 * Task Activity Types
 * Defines the valid types of activities that can be logged for a task
 */
export type TaskActivityType =
  | 'status_changed'
  | 'assigned'
  | 'updated'
  | 'created'
  | 'priority_changed'
  | 'progress_updated'
  | 'commented';

/**
 * Task Activity Entry
 * Represents a single activity/change in a task's history
 * Stored as JSONB array in the task entity
 */
export interface TaskActivityEntry {
  id: string; // UUID for uniqueness
  activityType: TaskActivityType;
  userId?: string;
  fieldName?: string;
  oldValue?: string;
  newValue?: string;
  createdAt: string; // ISO date string
}

/**
 * Project
 * Represents a solar installation project
 *
 * Note: customerId, siteAddress, and siteCoordinates are
 * derived from the required property relation:
 * - property.customerId
 * - property.address
 *
 * Business Rule: One property can have only one project (OneToOne relationship)
 */
export interface Project {
  id: string;
  propertyId: string;
  quoteId: string;
  quoteNumber?: string;
  createdBy: string;
  updatedBy?: string;
  projectNumber: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  priority: ProjectPriority;
  progressPercentage: number;
  startDate?: string;
  endDate?: string;
  metadata?: ProjectMetadata;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export type AttentionSeverity = 'critical' | 'warning' | 'info';

export type AttentionKind =
  | 'task_blocked'
  | 'task_overdue'
  | 'milestone_late'
  | 'milestone_due_soon'
  | 'material_pending'
  | 'payment_due';

export interface AttentionItem {
  id: string;
  kind: AttentionKind;
  severity: AttentionSeverity;
  title: string;
  subtitle: string;
  href: string;
  dueDate?: string;
  assigneeName?: string;
}
