/**
 * ============================================
 * DOCUMENT TAG ENUM
 * ============================================
 * Defines document type/category tags for the generic document system.
 * Allows custom string values beyond this enum.
 */
export enum DocumentTag {
  ELECTRICITY_BILL = 'electricity_bill',
  AADHAR_CARD = 'aadhar_card',
  PAN_CARD = 'pan_card',
  WCR = 'wcr',
  ANNEXURE_PROFORMA_A = 'annexure_proforma_a',
  NET_METERING_AGREEMENT = 'net_metering_agreement',
  DCR = 'dcr',
  MODEL_AGREEMENT = 'model_agreement',
  SITE_IMAGE = 'site_image',
  FRONT_VIEW = 'front_view',
  ROOF_VIEW = 'roof_view',
  METER_BOX = 'meter_box',
  REPORT = 'report',
  CONTRACT = 'contract',
  INVOICE = 'invoice',
  OTHER = 'other',
}

/**
 * ============================================
 * DOCUMENT ENTITY TYPE ENUM
 * ============================================
 * Defines which entity a document belongs to.
 * Used with entityId for the generic entityType+entityId lookup pattern.
 */
export enum DocumentEntityType {
  PROJECT = 'project',
  PROPERTY = 'property',
  CUSTOMER = 'customer',
  SITE_ACTIVITY = 'site_activity',
  LOAN = 'loan',
  QUOTE = 'quote',
  PAYMENT = 'payment',
}

/**
 * ============================================
 * DOCUMENT CATEGORY ENUM
 * ============================================
 * High-level classification of documents.
 */
export enum DocumentCategory {
  REPORT = 'report',
  IMAGE = 'image',
  DOCUMENT = 'document',
}

/**
 * @deprecated DocumentStatus is deprecated. Status column is being removed from DocumentEntity.
 */
export enum DocumentStatus {
  DRAFT = 'draft',
  PENDING_APPROVAL = 'pending_approval',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  SUBMITTED = 'submitted',
  ARCHIVED = 'archived',
}

/**
 * @deprecated WcrType is deprecated. WCR fields are being removed from DocumentEntity.
 */
export enum WcrType {
  PRELIMINARY = 'preliminary',
  FINAL = 'final',
}

/**
 * @deprecated Use DocumentTag instead. DocumentType is kept temporarily for backward compatibility.
 */
export enum DocumentType {
  CONTRACT = 'contract',
  AGREEMENT = 'agreement',
  NDA = 'nda',
  QUOTE = 'quote',
  PROPOSAL = 'proposal',
  INVOICE = 'invoice',
  PAYMENT_RECEIPT = 'payment_receipt',
  WCR = 'wcr',
  WCR_PRELIMINARY = 'wcr_preliminary',
  WCR_FINAL = 'wcr_final',
  SITE_SURVEY = 'site_survey',
  TECHNICAL_DRAWING = 'technical_drawing',
  INSTALLATION_MANUAL = 'installation_manual',
  COMPLIANCE_CERTIFICATE = 'compliance_certificate',
  APPROVAL_LETTER = 'approval_letter',
  INSPECTION_REPORT = 'inspection_report',
  IDENTITY_PROOF = 'identity_proof',
  ADDRESS_PROOF = 'address_proof',
  ELECTRICITY_BILL = 'electricity_bill',
  LOAN_APPLICATION = 'loan_application',
  LOAN_SANCTION = 'loan_sanction',
  LOAN_AGREEMENT = 'loan_agreement',
  SUBSIDY_APPLICATION = 'subsidy_application',
  SUBSIDY_APPROVAL = 'subsidy_approval',
  MAINTENANCE_REPORT = 'maintenance_report',
  SERVICE_REPORT = 'service_report',
  WARRANTY_CERTIFICATE = 'warranty_certificate',
  OTHER = 'other',
}
