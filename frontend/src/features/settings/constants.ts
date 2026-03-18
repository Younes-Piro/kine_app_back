export const APP_OPTION_CATEGORIES = [
  { value: 'gender', label: 'Gender' },
  { value: 'dossier_type', label: 'Dossier Type' },
  { value: 'marital_status', label: 'Marital Status' },
  { value: 'social_security', label: 'Social Security' },
  { value: 'session_rhythm', label: 'Session Rhythm' },
  { value: 'session_status', label: 'Session Status' },
  { value: 'payment_status', label: 'Payment Status' },
  { value: 'payment_method', label: 'Payment Method' },
  { value: 'invoice_type', label: 'Invoice Type' },
] as const;

export const WEEKDAY_OPTIONS = [
  { value: 0, label: 'Monday' },
  { value: 1, label: 'Tuesday' },
  { value: 2, label: 'Wednesday' },
  { value: 3, label: 'Thursday' },
  { value: 4, label: 'Friday' },
  { value: 5, label: 'Saturday' },
  { value: 6, label: 'Sunday' },
] as const;
