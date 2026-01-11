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
 * Additional flexible data for projects
 */
export interface ProjectMetadata {
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
