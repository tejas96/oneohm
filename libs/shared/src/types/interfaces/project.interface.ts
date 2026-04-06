import type {
  ProjectPriority,
  ProjectStatus,
  RoofCondition,
  RoofOrientation,
  TaskStatus,
} from '../enums/project.enum';

/**
 * Task Status Config
 * Defines a single configured status for a project's task board.
 * Stored as a JSONB array in projects.task_statuses.
 */
export interface TaskStatusConfig {
  code: TaskStatus;
  label: string;
  color: string;
  orderIndex: number;
}

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
  panelType?: string;
  panelCapacity?: number; // In amps
  voltage?: number; // In volts
  phaseType?: 'single_phase' | 'three_phase';
  distanceToPanel?: number; // In meters
  existingInverter?: boolean;
  gridConnectionType?: string;
  notes?: string;
}

/**
 * Shading Analysis
 * Results of site shading assessment
 */
export interface ShadingAnalysis {
  hasShading: boolean;
  shadingPercentage?: number;
  shadingSource?: string[]; // trees, buildings, etc.
  shadingTimes?: string[]; // Time periods when shading occurs
  mitigationRequired?: boolean;
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
  roofTiltAngle?: number;
  availableAreaSqm?: number;
  shadingAnalysis?: ShadingAnalysis;
  electricalDetails?: ElectricalDetails;
  structuralAssessment?: string;
  siteAccess?: string;
  safetyConcerns?: string;
  recommendations?: string;
  notes?: string;
}

/**
 * Milestone Deliverable
 * Expected output from a milestone
 */
export interface MilestoneDeliverable {
  name: string;
  description?: string;
  type: 'document' | 'approval' | 'installation' | 'testing' | 'other';
  isCompleted: boolean;
  completionDate?: string;
  fileUrl?: string;
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
 * Note: organizationId, customerId, siteAddress, and siteCoordinates are
 * derived from the required property relation:
 * - property.organizationId
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
  taskStatuses?: TaskStatusConfig[];
  metadata?: ProjectMetadata;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}
