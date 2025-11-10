/**
 * Quote Management Enums
 * Used across quote, quote versions, and line items
 */

/**
 * Quote Status - Workflow states
 */
export enum QuoteStatus {
  DRAFT = 'draft',
  SENT = 'sent',
  VIEWED = 'viewed',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
}

/**
 * System Type - Solar installation types
 */
export enum SystemType {
  ON_GRID = 'on_grid',
  OFF_GRID = 'off_grid',
  HYBRID = 'hybrid',
}

/**
 * Item Category - Quote line item categories
 */
export enum ItemCategory {
  SOLAR_PANELS = 'solar_panels',
  INVERTERS = 'inverters',
  BATTERIES = 'batteries',
  MOUNTING = 'mounting',
  ACCESSORIES = 'accessories',
  CABLES_WIRING = 'cables_wiring',
  EARTHING = 'earthing',
  LABOR = 'labor',
  INSTALLATION = 'installation',
  COMMISSIONING = 'commissioning',
  TRANSPORTATION = 'transportation',
  OTHER = 'other',
}

/**
 * Payment Milestone Stage - Standard project stages
 */
export enum PaymentMilestoneStage {
  ADVANCE = 'advance',
  MATERIAL_PROCUREMENT = 'material_procurement',
  INSTALLATION_START = 'installation_start',
  INSTALLATION_COMPLETE = 'installation_complete',
  COMMISSIONING = 'commissioning',
  NET_METERING = 'net_metering',
  FINAL_PAYMENT = 'final_payment',
  POST_INSTALLATION = 'post_installation',
}

