// ============================================================================
// FieldDisplay Types
// ============================================================================

// Referral display
export interface ReferralData {
  referrerName: string;
  referrerType?: string;
  referralCode: string;
}

// GPS/Coordinates display
export interface GPSData {
  latitude: number;
  longitude: number;
  capturedAt?: Date;
  capturedBy?: string;
}

// Shading analysis display
export type ShadingLevel = 'none' | 'minimal' | 'moderate' | 'significant';

export interface ShadingDetail {
  timeRange: string;
  status: 'clear' | 'shaded';
  note?: string;
}

export interface ShadingData {
  level: ShadingLevel;
  percentage: number;
  details?: ShadingDetail[];
  assessedBy?: string;
  assessedAt?: Date;
}

// Document status display
export type DocumentStatus = 'uploaded' | 'pending' | 'missing';

export interface DocumentItem {
  name: string;
  status: DocumentStatus;
}

export interface DocumentStatusData {
  total: number;
  uploaded: number;
  documents: DocumentItem[];
}

// Connection details display
export type ConnectionType = 'single' | 'three';

export interface ConnectionData {
  consumerNumber?: string;
  consumerName?: string;
  meterNumber?: string;
  connectionType?: ConnectionType;
  sanctionedLoad?: string;
  discom?: string;
  currentLoad?: string;
}

// Loan interest display
export interface LoanData {
  interested: boolean;
  systemValue?: number;
  estimatedEMI?: number;
  tenure?: number;
}

// ============================================================================
// FieldDisplay Props (Discriminated Union)
// ============================================================================

export type FieldDisplaySize = 'compact' | 'full';

export type FieldDisplayProps =
  | {
      variant: 'referral';
      data: ReferralData;
      size?: FieldDisplaySize;
      className?: string;
    }
  | {
      variant: 'gps';
      data: GPSData | null;
      size?: FieldDisplaySize;
      className?: string;
      onViewMap?: () => void;
    }
  | {
      variant: 'shading';
      data: ShadingData | null;
      size?: FieldDisplaySize;
      className?: string;
    }
  | {
      variant: 'document-status';
      data: DocumentStatusData;
      size?: FieldDisplaySize;
      className?: string;
    }
  | {
      variant: 'connection';
      data: ConnectionData;
      size?: FieldDisplaySize;
      className?: string;
    }
  | {
      variant: 'loan';
      data: LoanData;
      size?: FieldDisplaySize;
      className?: string;
    };
