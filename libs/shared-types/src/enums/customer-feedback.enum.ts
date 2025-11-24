/**
 * ============================================
 * CUSTOMER FEEDBACK ENUMS
 * ============================================
 * Schema Reference: Lines 1730-1774
 */

/**
 * NPS Category based on score
 * 0-6: Detractor
 * 7-8: Passive
 * 9-10: Promoter
 */
export enum NPSCategory {
  DETRACTOR = 'detractor',
  PASSIVE = 'passive',
  PROMOTER = 'promoter',
}

/**
 * Feedback Collection Method
 */
export enum FeedbackMethod {
  EMAIL = 'email',
  SMS = 'sms',
  PHONE_CALL = 'phone_call',
  IN_PERSON = 'in_person',
  WHATSAPP = 'whatsapp',
  ONLINE_FORM = 'online_form',
  MOBILE_APP = 'mobile_app',
}
